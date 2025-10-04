import { useCallback, useRef, useState } from 'react';
import {
  GeneratedImage,
  generateSingleImage,
  generateSpriteSheetFromText,
} from '../services/ai/imageGenerator';

export type GenerationStage = 'idle' | 'generating-primary' | 'generating-multiview' | 'succeeded' | 'failed';

export type PrimaryGenerationParams = {
  prompt: string;
  style: string;
  environment: string;
  count: number;
};

export type MultiViewGenerationParams = {
  basePrompt: string;
  style: string;
  environment: string;
};

type UseMultiStageGenerationResult = {
  primaryStatus: GenerationStage;
  multiviewStatus: GenerationStage;
  primaryImages: GeneratedImage[];
  multiViewImages: GeneratedImage[];
  error: Error | null;
  generatePrimary: (params: PrimaryGenerationParams) => Promise<void>;
  generateMultiView: (params: MultiViewGenerationParams) => Promise<void>;
  resetAll: () => void;
  resetMultiView: () => void;
};

export const useMultiStageGeneration = (): UseMultiStageGenerationResult => {
  const [primaryStatus, setPrimaryStatus] = useState<GenerationStage>('idle');
  const [multiviewStatus, setMultiviewStatus] = useState<GenerationStage>('idle');
  const [primaryImages, setPrimaryImages] = useState<GeneratedImage[]>([]);
  const [multiViewImages, setMultiViewImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const currentPromptRef = useRef<string | null>(null);

  const resetAll = useCallback(() => {
    setPrimaryStatus('idle');
    setMultiviewStatus('idle');
    setPrimaryImages([]);
    setMultiViewImages([]);
    setError(null);
    currentPromptRef.current = null;
  }, []);

  const resetMultiView = useCallback(() => {
    setMultiviewStatus('idle');
    setMultiViewImages([]);
  }, []);

  const generatePrimary = useCallback(async ({ prompt, count }: PrimaryGenerationParams) => {
    try {
      setPrimaryStatus('generating-primary');
      setError(null);
      currentPromptRef.current = prompt;

      const results = await Promise.all(
        Array.from({ length: count }, async (_, index) =>
          generateSingleImage(`${prompt}\nRender a hero perspective of the concept. Seed ${Date.now() + index}.`)
        )
      );

      if (currentPromptRef.current !== prompt) {
        return;
      }

      setPrimaryImages(results);
      setPrimaryStatus('succeeded');
      setMultiviewStatus('idle');
      setMultiViewImages([]);
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      setError(errorInstance);
      setPrimaryStatus('failed');
    }
  }, []);

  const generateMultiView = useCallback(async ({ basePrompt }: MultiViewGenerationParams) => {
    try {
      setMultiviewStatus('generating-multiview');
      setError(null);
      currentPromptRef.current = basePrompt;

      const multiViews = await generateSpriteSheetFromText(basePrompt, {
        rows: 2,
        cols: 2,
        viewLabels: [
          'Front elevation',
          'Right 3/4 perspective',
          'Left 3/4 perspective',
          'Rear elevation',
        ],
      });

      if (currentPromptRef.current !== basePrompt) {
        return;
      }

      setMultiViewImages(multiViews);
      setMultiviewStatus('succeeded');
    } catch (err) {
      const errorInstance = err instanceof Error ? err : new Error(String(err));
      setError(errorInstance);
      setMultiviewStatus('failed');
    }
  }, []);

  return {
    primaryStatus,
    multiviewStatus,
    primaryImages,
    multiViewImages,
    error,
    generatePrimary,
    generateMultiView,
    resetAll,
    resetMultiView,
  };
};
