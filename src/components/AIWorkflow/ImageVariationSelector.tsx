import React, { useMemo, useState } from 'react';
import './ImageVariationSelector.css';

interface GeneratedImage {
  id: string;
  url: string;
  prompt?: string;
  viewLabel?: string;
}

type SelectorMode = 'primary' | 'multiview';

interface ImageVariationSelectorProps {
  images: GeneratedImage[];
  onSelect?: (image: GeneratedImage) => void;
  onContinue?: () => void;
  onBack: () => void;
  prompt?: string;
  mode?: SelectorMode;
  onPromptChange?: (value: string) => void;
  onRegenerate?: () => void;
  isBusy?: boolean;
  errorMessage?: string | null;
  continueLabel?: string;
  progress?: number;
  statusMessage?: string;
}

export const ImageVariationSelector: React.FC<ImageVariationSelectorProps> = ({
  images,
  onSelect,
  onContinue,
  onBack,
  prompt,
  mode = 'primary',
  onPromptChange,
  onRegenerate,
  isBusy = false,
  errorMessage = null,
  continueLabel,
  progress,
  statusMessage,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<GeneratedImage | null>(null);

  const selectedImage = useMemo(() => images.find(img => img.id === selectedId) ?? null, [images, selectedId]);

  const handleSelect = (image: GeneratedImage) => {
    if (mode === 'primary') {
      setSelectedId(image.id);
    }
  };

  const handleSelectAndContinue = () => {
    if (mode === 'primary' && selectedImage && onSelect) {
      onSelect(selectedImage);
      return;
    }

    if (mode === 'multiview' && onContinue) {
      onContinue();
    }
  };

  const buttonDisabled = mode === 'primary' ? !selectedId : false;
  const buttonLabel = continueLabel ?? (mode === 'primary' ? 'Continue to Multi-View Coverage' : 'Convert to 3D Model');

  const allowPromptEditing = mode === 'primary' && typeof onPromptChange === 'function';

  return (
    <div className="image-variation-container">
      <div className="variation-header">
        <button className="back-button" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="header-content">
          <h2 className="variation-title">
            {mode === 'primary' ? 'Choose Your Favorite Concept' : 'Review Multi-View Coverage'}
          </h2>
        </div>
      </div>

      {prompt && (
        <div className="prompt-review-card">
          <div className="prompt-review-header">
            <h3>Generation Prompt</h3>
            {allowPromptEditing && (
              <button
                className="prompt-regenerate"
                onClick={onRegenerate}
                disabled={isBusy}
                type="button"
              >
                {isBusy ? 'Generating…' : 'Apply Changes & Regenerate'}
              </button>
            )}
          </div>
          {allowPromptEditing ? (
            <textarea
              className="prompt-review-textarea"
              value={prompt}
              onChange={(e) => onPromptChange?.(e.target.value)}
              disabled={isBusy}
            />
          ) : (
            <pre className="prompt-review-pre">{prompt}</pre>
          )}
          {allowPromptEditing && (
            <p className="prompt-help">
              Adjust the prompt and regenerate to explore new concepts.
            </p>
          )}
        </div>
      )}

      <div className="variation-content">
        {errorMessage && (
          <div className="variation-error-banner" role="alert">
            {errorMessage}
          </div>
        )}
        {typeof progress === 'number' && progress > 0 && (
          <div className="variation-progress">
            <div className="progress-label">{statusMessage ?? 'Processing 3D conversion…'}</div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
          </div>
        )}
        <div className="images-grid">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={`image-card ${selectedId === image.id ? 'selected' : ''} ${hoveredId === image.id ? 'hovered' : ''} ${mode === 'multiview' ? 'multi-view' : ''}`}
              onMouseEnter={() => setHoveredId(image.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="image-wrapper">
                <img src={image.url} alt={`Variation ${index + 1}`} className="generated-image" />
                <button
                  type="button"
                  className="image-expand"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedImage(image);
                  }}
                  aria-label="View full size"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 3h6v6m0-6L13 11m-4 10H3v-6m0 6l8-8" />
                  </svg>
                </button>
                
              </div>
              <div className="image-info">
                <span className="image-label">
                  {mode === 'primary' ? `Variation ${index + 1}` : image.viewLabel ?? `View ${index + 1}`}
                </span>
                {mode === 'primary' && selectedId !== image.id && (
                  <button
                    type="button"
                    className="inline-select-button"
                    onClick={() => handleSelect(image)}
                    disabled={isBusy}
                  >
                    Select
                  </button>
                )}
                {mode === 'primary' && selectedId === image.id && (
                  <span className="selected-indicator">✓</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="variation-actions">
          <button
            className="continue-button"
            onClick={handleSelectAndContinue}
            disabled={buttonDisabled || isBusy}
          >
            <span>{buttonLabel}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="action-hints">
            <p className="hint-text">
              {mode === 'primary'
                ? '💡 The chosen concept becomes the style anchor for multi-view generation.'
                : '💡 These angles feed the image-to-3D conversion for accurate geometry.'}
            </p>
          </div>
        </div>
      </div>

      <div className="variation-footer">
        <div className="regenerate-section">
          <span>{mode === 'primary' ? 'Not satisfied with the results?' : 'Need a different concept?'}</span>
          <button className="regenerate-link" onClick={onBack}>
            {mode === 'primary' ? 'Try a different prompt' : 'Back to concept selection'}
          </button>
        </div>
      </div>

      {expandedImage && (
        <div className="image-modal" role="dialog" aria-modal="true">
          <div className="image-modal-content">
            <button className="modal-close" onClick={() => setExpandedImage(null)} aria-label="Close">
              ×
            </button>
            <img src={expandedImage.url} alt={expandedImage.viewLabel ?? 'Expanded view'} />
            {expandedImage.viewLabel && <p className="modal-caption">{expandedImage.viewLabel}</p>}
          </div>
        </div>
      )}
    </div>
  );
};
