import React, { useEffect, useState } from 'react';
import './TextPromptInterface.css';
import { enhancePromptWithLLM, StyleEnhancerKey, STYLE_PROMPT_ENHANCERS } from '../../services/ai/promptEnhancers';

export type EnvironmentType = 'exterior' | 'interior';

interface TextPromptInterfaceProps {
  onGenerate: (prompt: string, style: string, environment: EnvironmentType, variationCount: number) => void;
  onBack: () => void;
  isGenerating?: boolean;
  errorMessage?: string;
}

interface PromptTemplate {
  label: string;
  value: string;
  icon: string;
  description: string;
}

type StyleOption = {
  label: string;
  value: StyleEnhancerKey;
  description: string;
};

type EnvironmentOption = {
  label: string;
  value: EnvironmentType;
  description: string;
};

const ENVIRONMENT_OPTIONS: EnvironmentOption[] = [
  {
    label: 'Exterior Architecture',
    value: 'exterior',
    description: 'Façades, elevations, site context, multi-view consistency',
  },
  {
    label: 'Interior Architecture',
    value: 'interior',
    description: 'Rooms, joinery, ceiling/lighting layouts, consistent finishes',
  },
];

const EXTERIOR_TEMPLATES: PromptTemplate[] = [
  {
    label: 'Mixed-use Tower',
    value: 'Eight-storey mixed-use building with ground-floor retail, offices above, GFRC rainscreen panels at 600 mm joints, 1.5 m curtainwall bays, limestone plinth, recessed entry canopy, and neutral palette.',
    icon: '🏙️',
    description: 'Urban façade with module-driven glazing and rainscreen cladding',
  },
  {
    label: 'Boutique Hotel',
    value: 'Six-storey boutique hotel, brick spandrels with rhythmic pilasters, punched windows with metal surrounds, recessed balconies, sculpted canopy entry, uplighting along façade piers.',
    icon: '🏨',
    description: 'Hospitality façade with uplight accents and balcony rhythm',
  },
  {
    label: 'Cultural Pavilion',
    value: 'Two-storey cultural pavilion, sculpted concrete shell, continuous clerestory band, vertical fins at 2.4 m spacing, cantilevered roof, reflecting pool perimeter, evening ambient wash lighting.',
    icon: '🏛️',
    description: 'Expressive civic pavilion with fins and clerestory band',
  },
  {
    label: 'Retail Flagship',
    value: 'Flagship retail façade with double-height glazing, illuminated signage wall, adjustable track heads highlighting display zones, brushed metal soffits, and integrated linear wash lighting along mullions.',
    icon: '🛒',
    description: 'Retail storefront emphasising glazing, signage, and lighting washes',
  },
];

const INTERIOR_TEMPLATES: PromptTemplate[] = [
  {
    label: 'Living Room Loft',
    value: 'Double-height living room (7m x 6m, 2.9m ceiling mezzanine), oak floors, white gypsum, full-height glazing, recessed linear LEDs at 3500K, suspended pendants over seating cluster, built-in storage wall.',
    icon: '🛋️',
    description: 'Residential lounge with layered cove, pendants, and glazing',
  },
  {
    label: 'Modern Office Suite',
    value: 'Open-plan office floorplate (12m x 10m), exposed concrete slab with acoustic baffles, linear task lighting, collaborative breakout zone, perimeter glazing, integrated storage and planter island.',
    icon: '🏢',
    description: 'Workspace with exposed services and linear task lighting',
  },
  {
    label: 'Fine Dining Interior',
    value: 'Fine dining dining room (24 tables), warm walnut floor, layered ambient coves, pendant cluster over central bar, wall wash lighting along banquettes, concealed LED underbar, soft 3000K mood lighting.',
    icon: '🍷',
    description: 'Hospitality interior with layered ambient and accent lighting',
  },
  {
    label: 'Gallery Room',
    value: 'Art gallery room (18m x 8m), movable partitions, neutral walls, 30° accent spotlights highlighting artwork, uniform wall-wash lighting, polished concrete floor, ceiling grid with track fixtures.',
    icon: '🖼️',
    description: 'Gallery interior emphasising wall washing and accent spots',
  },
];

const STYLE_OPTIONS: StyleOption[] = [
  { label: 'Realistic', value: 'realistic', description: 'Photorealistic rendering with calibrated white balance' },
  { label: 'Isometric', value: 'isometric', description: 'Orthographic isometric view with blueprint accents' },
  { label: 'Architectural', value: 'architectural', description: 'Illustrative linework with material annotations' },
  { label: 'Blueprint', value: 'blueprint', description: 'Cyan blueprint schematic with lighting zone overlays' },
];

const STYLE_LINE_PREFIX = 'Render style:';
const VARIATION_OPTIONS = [1, 2, 3, 4] as const;

const composePromptWithStyle = (basePrompt: string, environment: EnvironmentType, style: StyleEnhancerKey): string => {
  const sharedLines = environment === 'exterior'
    ? [
        `Architecture brief: ${basePrompt}`,
        'Views: front elevation (orthographic), rear elevation (orthographic), left 3/4 perspective, right 3/4 perspective. Keep camera intrinsics consistent between views.',
        'Camera: full-frame sensor, 35 mm lens (~55° FOV), tripod height 1.6 m, horizon level, no keystone distortion.',
        'Lighting: overcast diffuse daylight for even façade exposure; avoid hard shadows or glare.',
        'Scale cues: include a 2.1 m door, subtle human silhouette, or 1 m bollard for reference.',
        'Negative prompt: no people, no vehicles, no adjacent trees blocking façade, no fisheye, no warped geometry, no blown highlights.',
        'Ensure consistent exposure and white balance so multi-view reconstruction is possible.',
      ]
    : [
        `Interior brief: ${basePrompt}`,
        'Views: axial doorway view (orthographic), left 3/4 perspective, right 3/4 perspective, ceiling plan lookdown.',
        'Camera: full-frame sensor, 24 mm lens (~84° FOV) for interiors, camera height 1.4 m, level horizon.',
        'Lighting: soft, even interior fill lighting; avoid direct sun patches; keep exposure consistent across angles.',
        'Scale cues: include 2.1 m door, 0.9 m countertop, or 1.8 m human silhouette for reference.',
        'Negative prompt: no people, no clutter, no mirrors duplicating views, no blown highlights, no lens distortion.',
        'Maintain the same finishes and lighting hierarchy across all views for later 3D reconstruction.',
      ];

  const renderStyle = STYLE_PROMPT_ENHANCERS[style];

  return [
    ...sharedLines,
    `Render style: ${renderStyle}`,
  ].join('\n');
};

const stripStyleLine = (input: string): string => {
  return input
    .split('\n')
    .filter((line) => !line.trimStart().startsWith(STYLE_LINE_PREFIX))
    .join('\n')
    .trim();
};

const applyStyleToPrompt = (input: string, style: StyleEnhancerKey): string => {
  const withoutStyle = stripStyleLine(input);
  if (!withoutStyle) {
    return `Render style: ${STYLE_PROMPT_ENHANCERS[style]}`;
  }
  return `${withoutStyle}\n${STYLE_LINE_PREFIX} ${STYLE_PROMPT_ENHANCERS[style]}`;
};

export const TextPromptInterface: React.FC<TextPromptInterfaceProps> = ({
  onGenerate,
  onBack,
  isGenerating = false,
  errorMessage,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<StyleEnhancerKey>('realistic');
  const [environment, setEnvironment] = useState<EnvironmentType>('exterior');
  const [charCount, setCharCount] = useState(0);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showEnhancedPrompt, setShowEnhancedPrompt] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [variationCount, setVariationCount] = useState<number>(4);
  const maxChars = 1400;

  const templates = environment === 'exterior' ? EXTERIOR_TEMPLATES : INTERIOR_TEMPLATES;

  const updatePrompt = (value: string, options: { preserveTemplate?: boolean } = {}) => {
    if (value.length > maxChars) {
      return;
    }
    setPrompt(value);
    setCharCount(value.length);
    if (!options.preserveTemplate) {
      setSelectedTemplate(null);
    }
  };

  const handlePromptChange = (value: string) => {
    updatePrompt(value);
  };

  const handleTemplateClick = (template: PromptTemplate) => {
    const styledTemplate = applyStyleToPrompt(template.value, selectedStyle);
    updatePrompt(styledTemplate, { preserveTemplate: true });
    setSelectedTemplate(template.label);
  };

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return;
    const basePrompt = stripStyleLine(prompt.trim());
    const formattedPrompt = composePromptWithStyle(basePrompt, environment, selectedStyle);
    onGenerate(formattedPrompt, selectedStyle, environment, variationCount);
  };

  const enhancePrompt = async () => {
    if (!prompt.trim()) {
      return;
    }
    try {
      setIsEnhancing(true);
      setEnhanceError(null);
      const enhanced = await enhancePromptWithLLM({
        userPrompt: prompt.trim(),
        environment,
        style: selectedStyle,
      });
      setEnhancedPrompt(enhanced);
      setShowEnhancedPrompt(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setEnhanceError(message || 'Unable to enhance prompt right now.');
    } finally {
      setIsEnhancing(false);
    }
  };

  useEffect(() => {
    setSelectedTemplate(null);
  }, [environment]);

  useEffect(() => {
    setPrompt((prev) => {
      const updated = applyStyleToPrompt(prev, selectedStyle);
      if (updated.length > maxChars) {
        return prev;
      }
      setCharCount(updated.length);
      return updated;
    });
  }, [selectedStyle]);

  return (
    <div className="text-prompt-container">
      <div className="prompt-header">
        <button className="back-button" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h2 className="prompt-title">Describe your space</h2>
        <p className="prompt-subtitle">
          Specify the architectural programme, lighting intent, and key materials you want Gemini to express across consistent multi-view images.
        </p>
      </div>

      <div className="prompt-content">
        {errorMessage && (
          <div className="prompt-error-banner">
            {errorMessage}
          </div>
        )}

        <div className="environment-section">
          <h3 className="section-title">Scene context</h3>
          <div className="environment-options">
            {ENVIRONMENT_OPTIONS.map(option => (
              <label
                key={option.value}
                className={`environment-option ${environment === option.value ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="environment"
                  value={option.value}
                  checked={environment === option.value}
                  onChange={(e) => setEnvironment(e.target.value as EnvironmentType)}
                  disabled={isGenerating}
                />
                <div className="environment-content">
                  <span className="environment-label">{option.label}</span>
                  <span className="environment-description">{option.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="templates-section">
          <h3 className="section-title">Quick start templates</h3>
          <div className="template-grid">
            {templates.map((template) => (
              <button
                key={template.label}
                className={`template-card ${selectedTemplate === template.label ? 'selected' : ''}`}
                onClick={() => handleTemplateClick(template)}
                type="button"
                disabled={isGenerating}
              >
                <span className="template-icon">{template.icon}</span>
                <span className="template-label">{template.label}</span>
                <span className="template-description">{template.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="style-section">
          <h3 className="section-title">Visual style</h3>
          <div className="style-options">
            {STYLE_OPTIONS.map((style) => (
              <label
                key={style.value}
                className={`style-option ${selectedStyle === style.value ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="style"
                  value={style.value}
                  checked={selectedStyle === style.value}
                  onChange={(e) => setSelectedStyle(e.target.value as StyleEnhancerKey)}
                  disabled={isGenerating}
                />
                <div className="style-content">
                  <span className="style-label">{style.label}</span>
                  <span className="style-description">{style.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="prompt-input-section">
          <div className="input-header">
            <h3 className="section-title">Your description</h3>
            <button 
              className="enhance-button"
              onClick={enhancePrompt}
              disabled={!prompt || isGenerating || isEnhancing}
              type="button"
            >
              {isEnhancing ? (
                <span className="inline-spinner" aria-hidden="true"></span>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              {isEnhancing ? 'Enhancing…' : 'Enhance'}
            </button>
          </div>
          <div className="prompt-input-wrapper">
            <textarea
              className="prompt-textarea"
              placeholder="Describe the architecture, dimensions, materials, and lighting goals. E.g. a 12m x 10m office with exposed ceiling, linear task lighting, collaborative zone, and daylight-balanced glazing."
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              disabled={isGenerating}
            />
            <div className="char-counter">
              <span className={charCount > maxChars * 0.9 ? 'warning' : ''}>
                {charCount}/{maxChars}
              </span>
            </div>
          </div>

          {enhanceError && (
            <div className="prompt-error-banner" role="alert">
              {enhanceError}
            </div>
          )}

          <div className="prompt-tips">
            <p className="tip-title">💡 Tips for better results:</p>
            <ul className="tips-list">
              <li>State views and projection (e.g., front elevation orthographic, left 3/4 perspective, ceiling plan lookdown).</li>
              <li>Describe lens and FOV (e.g., full-frame 35 mm, tripod at 1.6 m) to reduce distortion.</li>
              <li>Lock materials and modules (e.g., mullion spacing, joint lines, ceiling grid pattern).</li>
              <li>Add scale cues like a 2.1 m door or human silhouette for real-world proportions.</li>
              <li>Choose a style above and reference lighting intent to match that visual treatment.</li>
            </ul>
          </div>
        </div>

        <div className="variation-count-section">
          <h3 className="section-title">Number of variations</h3>
          <div className="variation-count-options">
            {VARIATION_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`variation-count-button ${variationCount === option ? 'active' : ''}`}
                onClick={() => setVariationCount(option)}
                disabled={isGenerating}
                aria-pressed={variationCount === option}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="generate-section">
          <button
            className="generate-button"
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            type="button"
          >
            {isGenerating ? (
              <>
                <span className="spinner"></span>
                Generating...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Generate 3D Model
              </>
            )}
          </button>

          {isGenerating && (
            <div className="generation-status">
              <div className="status-steps">
                <div className="status-step active">
                  <span className="step-number">1</span>
                  <span className="step-label">Generating images...</span>
                </div>
                <div className="status-step">
                  <span className="step-number">2</span>
                  <span className="step-label">Creating variations</span>
                </div>
                <div className="status-step">
                  <span className="step-number">3</span>
                  <span className="step-label">Ready for selection</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <EnhancedPromptModal
        isOpen={showEnhancedPrompt}
        prompt={enhancedPrompt}
        onClose={() => setShowEnhancedPrompt(false)}
        onApply={(value) => {
          handlePromptChange(value);
          setShowEnhancedPrompt(false);
        }}
      />
    </div>
  );
};

interface EnhancedPromptModalProps {
  isOpen: boolean;
  prompt: string;
  onClose: () => void;
  onApply: (value: string) => void;
}

const EnhancedPromptModal: React.FC<EnhancedPromptModalProps> = React.memo(({ isOpen, prompt, onClose, onApply }) => {
  const [editablePrompt, setEditablePrompt] = useState(prompt);

  useEffect(() => {
    setEditablePrompt(prompt);
  }, [prompt]);

  if (!isOpen) return null;

  return (
    <div className="enhanced-modal-overlay" role="dialog" aria-modal="true">
      <div className="enhanced-modal surface-card">
        <div className="modal-header">
          <h3>Enhanced Prompt</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">
          <textarea
            className="modal-textarea"
            value={editablePrompt}
            onChange={(e) => setEditablePrompt(e.target.value)}
          />
        </div>
        <div className="modal-footer">
          <button className="modal-secondary" onClick={onClose}>Cancel</button>
          <button className="modal-primary" onClick={() => onApply(editablePrompt)}>Use This Prompt</button>
        </div>
      </div>
    </div>
  );
});
