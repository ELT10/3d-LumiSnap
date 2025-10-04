import { useState, useCallback, useRef } from 'react';
import { generateImagesFromText, GeneratedImage } from '../services/ai/imageGenerator';

type Status = 'idle' | 'generating' | 'succeeded' | 'failed';

type UseTextToImageResult = {
  status: Status;
  images: GeneratedImage[];
  error: Error | null;
  generate: (prompt: string) => Promise<void>;
  reset: () => void;
};

export const useTextToImage = (): UseTextToImageResult => {
  const [status, setStatus] = useState<Status>('idle');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const currentPromptRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setImages([]);
    setError(null);
    currentPromptRef.current = null;
  }, []);

  const generate = useCallback(async (prompt: string) => {
    try {
      setStatus('generating');
      setError(null);
      currentPromptRef.current = prompt;
      const results = await generateImagesFromText(prompt);
      if (currentPromptRef.current !== prompt) {
        return;
      }
      setImages(results);
      setStatus('succeeded');
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      setError(errorInstance);
      setStatus('failed');
    }
  }, []);

  return { status, images, error, generate, reset };
};
