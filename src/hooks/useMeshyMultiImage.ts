import { useCallback, useRef, useState } from 'react';
import { GeneratedImage } from '../services/ai/imageGenerator';
import {
  CreateMultiImageTaskPayload,
  createMultiImageTo3DTask,
  extractImageDataUris,
  streamMultiImageTo3DTask,
  MeshyMultiImageTask,
} from '../services/ai/meshyClient';

export type MeshyConversionState =
  | 'idle'
  | 'creating-task'
  | 'streaming'
  | 'succeeded'
  | 'failed';

interface UseMeshyMultiImageResult {
  state: MeshyConversionState;
  modelUrl: string | null;
  downloadUrl: string | null;
  error: Error | null;
  progress: number;
  taskStatus: MeshyMultiImageTask['status'] | null;
  startConversion: (images: GeneratedImage[]) => Promise<string>;
  reset: () => void;
}

const DEFAULT_PAYLOAD: Pick<
  CreateMultiImageTaskPayload,
  'should_remesh' | 'should_texture' | 'enable_pbr'
> = {
  should_remesh: true,
  should_texture: true,
  enable_pbr: true,
};

export const useMeshyMultiImage = (): UseMeshyMultiImageResult => {
  const [state, setState] = useState<MeshyConversionState>('idle');
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [taskStatus, setTaskStatus] = useState<MeshyMultiImageTask['status'] | null>(null);
  const activeTaskId = useRef<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setModelUrl(null);
    setDownloadUrl(null);
    setError(null);
    setProgress(0);
    setTaskStatus(null);
    activeTaskId.current = null;
    revokeObjectUrl();
  }, [revokeObjectUrl]);

  const createViewerUrl = useCallback(async (remoteUrl: string): Promise<string> => {
    if (typeof window === 'undefined') {
      return remoteUrl;
    }

    const response = await fetch(remoteUrl, {
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`Failed to download Meshy model (${response.status})`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    return objectUrl;
  }, []);

  const startConversion = useCallback(
    async (images: GeneratedImage[]) => {
      if (!images.length) {
        throw new Error('No images supplied for Meshy conversion');
      }

      try {
        setState('creating-task');
        setModelUrl(null);
        setDownloadUrl(null);
        setError(null);
        setProgress(0);
        setTaskStatus('PENDING');
        revokeObjectUrl();

        const imageUrls = extractImageDataUris(images);
        if (!imageUrls.length) {
          throw new Error('Unable to extract data URI for Meshy task');
        }

        const payload: CreateMultiImageTaskPayload = {
          image_urls: imageUrls,
          ...DEFAULT_PAYLOAD,
        };

        const { result: taskId } = await createMultiImageTo3DTask(payload);
        activeTaskId.current = taskId;

        setState('streaming');
        const { modelUrl: remoteModelUrl } = await streamMultiImageTo3DTask(
          taskId,
          {
            onMessage: (task) => {
              setProgress(task.progress ?? 0);
              setTaskStatus(task.status);
            },
            onErrorEvent: (eventError) => {
              throw new Error(eventError?.message ?? 'Meshy reported an error');
            },
          },
          { timeoutMs: 12 * 60 * 1000 }
        );

        setDownloadUrl(remoteModelUrl);

        const viewerUrl = await createViewerUrl(remoteModelUrl);
        objectUrlRef.current = viewerUrl;
        setModelUrl(viewerUrl);
        setState('succeeded');
        setProgress(100);
        setTaskStatus('SUCCEEDED');
        return viewerUrl;
      } catch (err) {
        const errorInstance = err instanceof Error ? err : new Error(String(err));
        setError(errorInstance);
        setState('failed');
        revokeObjectUrl();
        throw errorInstance;
      }
    },
    [createViewerUrl, revokeObjectUrl]
  );

  return { state, modelUrl, downloadUrl, error, progress, taskStatus, startConversion, reset };
};
