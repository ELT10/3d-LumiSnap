import { GeneratedImage } from './imageGenerator';

const MESHY_API_BASE_URL = 'https://api.meshy.ai/openapi/v1';

export type MeshyTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';

export interface MeshyModelUrls {
  glb?: string;
  fbx?: string;
  obj?: string;
  usdz?: string;
}

export interface MeshyTaskError {
  message?: string;
}

export interface MeshyMultiImageTask {
  id: string;
  status: MeshyTaskStatus;
  progress?: number;
  model_urls?: MeshyModelUrls;
  thumbnail_url?: string;
  task_error?: MeshyTaskError;
}

export interface CreateMultiImageTaskPayload {
  image_urls: string[];
  should_remesh?: boolean;
  should_texture?: boolean;
  enable_pbr?: boolean;
  ai_model?: 'meshy-4' | 'meshy-5' | 'latest';
  topology?: 'quad' | 'triangle';
  target_polycount?: number;
  symmetry_mode?: 'off' | 'auto' | 'on';
}

interface PollOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

const getMeshyApiKey = (): string => {
  const apiKey = import.meta.env.VITE_MESHY_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_MESHY_API_KEY in environment');
  }
  return apiKey;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const request = async <T>(endpoint: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${MESHY_API_BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getMeshyApiKey()}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Meshy API error (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<T>;
};

export const createMultiImageTo3DTask = async (
  payload: CreateMultiImageTaskPayload
): Promise<{ result: string }> => {
  if (!payload.image_urls.length) {
    throw new Error('At least one image URL is required for Meshy multi-image task');
  }

  return request<{ result: string }>(
    '/multi-image-to-3d',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
};

export const getMultiImageTo3DTask = async (taskId: string): Promise<MeshyMultiImageTask> => {
  return request<MeshyMultiImageTask>(`/multi-image-to-3d/${taskId}`);
};

export interface PollTaskResult {
  task: MeshyMultiImageTask;
  modelUrl: string;
}

interface StreamHandlers {
  onMessage?: (task: MeshyMultiImageTask) => void;
  onErrorEvent?: (err: { status_code?: number; message?: string }) => void;
}

const parseSSEChunk = (chunk: string) => {
  const lines = chunk.split('\n');
  let eventType = 'message';
  const dataLines: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    if (trimmed.startsWith('event:')) {
      eventType = trimmed.slice(6).trim();
    } else if (trimmed.startsWith('data:')) {
      dataLines.push(trimmed.slice(5).trim());
    }
  });

  return {
    eventType,
    dataString: dataLines.join('\n'),
  };
};

export const streamMultiImageTo3DTask = async (
  taskId: string,
  handlers: StreamHandlers = {},
  { timeoutMs = 12 * 60 * 1000 }: { timeoutMs?: number } = {}
): Promise<PollTaskResult> => {
  const response = await fetch(`${MESHY_API_BASE_URL}/multi-image-to-3d/${taskId}/stream`, {
    headers: {
      Authorization: `Bearer ${getMeshyApiKey()}`,
      Accept: 'text/event-stream',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Meshy stream error (${response.status}): ${body}`);
  }

  const { body } = response;
  if (!body) {
    throw new Error('Meshy stream response has no body');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  const started = Date.now();

  while (true) {
    if (Date.now() - started > timeoutMs) {
      reader.cancel();
      throw new Error('Timed out waiting for Meshy stream to complete');
    }

    const { value, done } = await reader.read();

    if (done) {
      const finalChunk = buffer.trim();
      if (finalChunk) {
        const { eventType, dataString } = parseSSEChunk(finalChunk);
        if (eventType === 'error') {
          const errorPayload = JSON.parse(dataString || '{}');
          handlers.onErrorEvent?.(errorPayload);
          throw new Error(errorPayload?.message ?? 'Meshy stream ended with error');
        }
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);

      if (rawEvent) {
        const { eventType, dataString } = parseSSEChunk(rawEvent);

        if (eventType === 'error') {
          try {
            const errorPayload = JSON.parse(dataString || '{}');
            handlers.onErrorEvent?.(errorPayload);
            throw new Error(errorPayload?.message ?? 'Meshy stream emitted an error');
          } catch (err) {
            throw err instanceof Error ? err : new Error(String(err));
          }
        }

        if (dataString) {
          try {
            const message = JSON.parse(dataString) as MeshyMultiImageTask;
            handlers.onMessage?.(message);

            if (message.status === 'SUCCEEDED') {
              const modelUrl = message.model_urls?.glb;
              if (!modelUrl) {
                throw new Error('Meshy stream succeeded without GLB URL');
              }
              reader.cancel();
              return { task: message, modelUrl };
            }

            if (message.status === 'FAILED' || message.status === 'CANCELED') {
              const reason = message.task_error?.message ?? `Meshy task ${message.status}`;
              reader.cancel();
              throw new Error(reason);
            }
          } catch (err) {
            reader.cancel();
            throw err instanceof Error ? err : new Error(String(err));
          }
        }
      }

      boundary = buffer.indexOf('\n\n');
    }
  }

  throw new Error('Meshy stream ended without success');
};

export const pollMultiImageTo3DTask = async (
  taskId: string,
  { pollIntervalMs = 5000, timeoutMs = 10 * 60 * 1000 }: PollOptions = {}
): Promise<PollTaskResult> => {
  const started = Date.now();

  while (true) {
    const task = await getMultiImageTo3DTask(taskId);

    if (task.status === 'SUCCEEDED') {
      const modelUrl = task.model_urls?.glb;
      if (!modelUrl) {
        throw new Error('Meshy task succeeded but no GLB URL was returned');
      }
      return { task, modelUrl };
    }

    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      const message = task.task_error?.message ?? 'Meshy task failed';
      throw new Error(message);
    }

    if (Date.now() - started > timeoutMs) {
      throw new Error('Timed out waiting for Meshy task to complete');
    }

    await delay(pollIntervalMs);
  }
};

export const extractImageDataUris = (images: GeneratedImage[]): string[] => {
  return images
    .map((image) => image.base64Data ? `data:image/png;base64,${image.base64Data}` : image.url)
    .filter((uri): uri is string => Boolean(uri));
};
