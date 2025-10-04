import { GoogleGenAI } from '@google/genai';

export type StyleEnhancerKey = 'realistic' | 'isometric' | 'architectural' | 'blueprint';

export const STYLE_PROMPT_ENHANCERS: Record<StyleEnhancerKey, string> = {
  realistic: 'Photorealistic rendering, calibrated white balance, cinematic global illumination, physically accurate lighting ratios, architectural camera framing.',
  isometric: 'Clean isometric projection, orthographic camera, softened shadow treatment, measured grid on floor plane.',
  architectural: 'Architectural illustration with annotated materials, professional lighting diagram style, neutral desaturated palette.',
  blueprint: 'Technical blueprint line art, cyan vellum background, white tracer lines, lighting zones annotated, no shading, precise line weights.',
};

export const ENVIRONMENT_PROMPT_ENHANCERS: Record<'exterior' | 'interior', string> = {
  exterior: 'Ensure façade alignment across orthographic elevations, maintain glazing module spacing, include plaza context and accessible entries, avoid added landscape clutter.',
  interior: 'Highlight ceiling lighting layout, joinery alignment, maintain consistent material palette, show built-in storage and furniture footprints clearly, no extraneous props.',
};

const TEXT_MODEL_ID = 'gemini-2.5-flash-lite';

const getClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY in environment');
  }
  return new GoogleGenAI({ apiKey });
};

const GUIDE_SUMMARY = `Architectural multi-view prompting principles:
- Lock view naming explicitly (front elevation orthographic, rear elevation orthographic, left 3/4 perspective, right 3/4 perspective, ceiling plan lookdown when interior) and keep camera intrinsics consistent.
- Specify camera language: sensor, focal length, field of view, tripod/eye height to avoid keystone distortion.
- Use diffuse, even lighting (overcast exterior or soft interior fill) to keep appearance constant for reconstruction.
- Describe materials, façade modules, mullion spacing, ceiling grids, joint spacing, and key lighting fixtures.
- Anchor scale with references like 2.1 m doors, human silhouettes, or 1 m bollards.
- Include negative prompt clauses: no people, no vehicles, no clutter, no mirrors causing duplicates, no fisheye or warped geometry.
- Mention consistent exposure/white balance across all views for downstream 3D processing.
- Ensure the same material and lighting hierarchy across variations.`;

interface PromptEnhancementRequest {
  userPrompt: string;
  environment: 'exterior' | 'interior';
  style: StyleEnhancerKey;
}

export const enhancePromptWithLLM = async ({ userPrompt, environment, style }: PromptEnhancementRequest): Promise<string> => {
  const client = getClient();
  const environmentFocus = environment === 'exterior'
    ? 'Produce façade-focused instructions suited for an exterior architecture sheet. Include plaza/site context only if essential.'
    : 'Produce interior-focused instructions highlighting ceiling layout, furniture placement, and lighting scenes.';

  const styleEnhancer = STYLE_PROMPT_ENHANCERS[style];
  const environmentEnhancer = ENVIRONMENT_PROMPT_ENHANCERS[environment];

  const requestText = [
    'You are an expert architectural lighting prompt engineer preparing inputs for an image model that must later drive image-to-3D reconstruction.',
    GUIDE_SUMMARY,
    `Rendering style emphasis: ${styleEnhancer}`,
    `Environment emphasis: ${environmentEnhancer}. ${environmentFocus}`,
    'Rewrite the user prompt into a complete multi-line specification using the following exact section headers in order: Architecture brief, Views, Camera, Lighting, Materials & finishes, Scale cues, Render style, Negative prompt.',
    'Each section should be on its own line with the header followed by a colon and concise description. Keep the total under 1400 characters, avoid bullet symbols, and remove redundant whitespace.',
    'Ensure the Views section lists four distinct views appropriate for the environment. For interiors include ceiling plan lookdown. For exteriors include front and rear elevations plus left/right 3/4 perspectives.',
    'The Camera section must specify sensor type, focal length, field of view, and camera/tripod height. Lighting should note diffuse/even conditions and key lighting fixtures. Scale cues must list at least two reference elements.',
    'Render style should restate the desired visual treatment, referencing the style enhancer. Negative prompt should enumerate the artefacts to avoid.',
    `User prompt: """${userPrompt}"""`,
    'Return only the enhanced prompt text with the specified headings. Do not add commentary or markdown.',
  ].join('\n\n');

  const response = await client.models.generateContent({
    model: TEXT_MODEL_ID,
    contents: [
      {
        role: 'user',
        parts: [{ text: requestText }],
      },
    ],
  });

  const textSegments = response.candidates?.[0]?.content?.parts
    ?.map((part) => 'text' in part && typeof part.text === 'string' ? part.text : '')
    .join('').trim();

  if (textSegments && textSegments.length > 0) {
    return textSegments;
  }

  const fallback = typeof response.text === 'string' ? response.text.trim() : '';
  if (fallback) {
    return fallback;
  }

  throw new Error('Prompt enhancer did not return any text.');
};
