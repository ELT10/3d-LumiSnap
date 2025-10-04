/**
 * AI Image Generation Service
 * Handles text-to-image and image editing using Google Gemini or other providers
 */

import { GoogleGenAI } from "@google/genai";

export type GeneratedImage = {
  id: string;
  url: string;
  prompt?: string;
  base64Data?: string;
  viewLabel?: string;
  metadata?: Record<string, unknown>;
};

export type MultiViewRequest = {
  prompt: string;
  baseImage: GeneratedImage;
  count: number;
  viewSequence?: string[];
};

export type SpriteSheetConfig = {
  rows: number;
  cols: number;
  viewLabels?: string[];
};

const MODEL_ID = "gemini-2.5-flash-image-preview";

const getClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VITE_GEMINI_API_KEY in environment");
  }
  return new GoogleGenAI({ apiKey });
};

const mapResponseToImages = (prompt: string, response: Awaited<ReturnType<ReturnType<typeof getClient>['models']['generateContent']>>): GeneratedImage[] => {
  const candidates = response.candidates ?? [];
  const images: GeneratedImage[] = [];

  candidates.forEach((candidate, candidateIndex) => {
    const parts = candidate.content?.parts ?? [];
    parts.forEach((part, partIndex) => {
      const data = part.inlineData?.data;
      if (!data) return;
      const mimeType = part.inlineData?.mimeType ?? "image/png";
      images.push({
        id: `${candidateIndex}-${partIndex}-${Date.now()}`,
        url: `data:${mimeType};base64,${data}`,
        prompt,
        base64Data: data,
      });
    });
  });

  if (!images.length) {
    throw new Error("Gemini did not return any images for this prompt");
  }

  return images;
};

const DEFAULT_VIEW_SEQUENCE = [
  "front elevation (orthographic)",
  "rear elevation (orthographic)",
  "left 3/4 perspective",
  "right 3/4 perspective",
];

const createPromptPayload = (prompt: string, seed?: number) => ({
  model: MODEL_ID,
  contents: prompt,
  generationConfig: seed !== undefined ? { seed } : undefined,
});

export const generateImagesFromText = async (prompt: string) => {
  const client = getClient();
  const response = await client.models.generateContent(createPromptPayload(prompt));
  return mapResponseToImages(prompt, response);
};

const createSpriteSheetPrompt = (basePrompt: string, rows: number, cols: number, viewLabels?: string[]) => {
  const defaultLabels = viewLabels && viewLabels.length === rows * cols
    ? viewLabels
    : [
        'top-left: front elevation orthographic',
        'top-right: right three-quarter perspective',
        'bottom-left: left three-quarter perspective',
        'bottom-right: rear elevation orthographic',
      ];

  return [
    basePrompt,
    'Render a single sprite sheet image composed of consistent architectural views arranged in a grid.',
    `Grid layout: ${rows} rows by ${cols} columns, equal-sized tiles, no spacing between tiles.`,
    'Keep the same building design, materials, lighting, and scale across all tiles.',
    ...defaultLabels.map((label, index) => `Tile ${index + 1}: ${label}`),
  ].join('\n');
};

export const sliceSpriteSheet = async (
  spriteDataUrl: string,
  { rows, cols, viewLabels }: SpriteSheetConfig
): Promise<GeneratedImage[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const { width, height } = img;
      const tileWidth = width / cols;
      const tileHeight = height / rows;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Unable to create 2D context for slicing'));
        return;
      }

      canvas.width = tileWidth;
      canvas.height = tileHeight;

      const slices: GeneratedImage[] = [];

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          ctx.clearRect(0, 0, tileWidth, tileHeight);
          ctx.drawImage(
            img,
            c * tileWidth,
            r * tileHeight,
            tileWidth,
            tileHeight,
            0,
            0,
            tileWidth,
            tileHeight
          );

          const dataUrl = canvas.toDataURL('image/png');
          const base64Data = dataUrl.split(',')[1];
          const index = r * cols + c;
          slices.push({
            id: `${index}-${Date.now()}`,
            url: dataUrl,
            base64Data,
            viewLabel: viewLabels?.[index],
          });
        }
      }

      resolve(slices);
    };
    img.onerror = () => {
      reject(new Error('Failed to load sprite sheet image for slicing'));
    };
    img.src = spriteDataUrl;
  });
};

export const generateSpriteSheetFromText = async (
  prompt: string,
  config: SpriteSheetConfig
): Promise<GeneratedImage[]> => {
  const client = getClient();
  const spritePrompt = createSpriteSheetPrompt(prompt, config.rows, config.cols, config.viewLabels);
  const response = await client.models.generateContent(createPromptPayload(spritePrompt));
  const [sprite] = mapResponseToImages(spritePrompt, response);
  if (!sprite) {
    throw new Error('Gemini did not return a sprite sheet image');
  }
  return sliceSpriteSheet(sprite.url, config);
};

export const generateSingleImage = async (prompt: string): Promise<GeneratedImage> => {
  const images = await generateImagesFromText(prompt);
  const image = images[0];
  if (!image) {
    throw new Error('No image returned from Gemini');
  }
  return image;
};

export const generateVariations = async (basePrompt: string, count = 4) => {
  const images = await generateImagesFromText(basePrompt);
  return images.slice(0, count);
};
