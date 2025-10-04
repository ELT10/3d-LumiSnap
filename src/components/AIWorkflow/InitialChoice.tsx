import React from 'react';
import './InitialChoice.css';

interface InitialChoiceProps {
  onSelectOption: (option: 'text' | 'image' | 'demo') => void;
}

export const InitialChoice: React.FC<InitialChoiceProps> = ({ onSelectOption }) => {
  return (
    <div className="initial-choice-container">
      <div className="choice-header">
        <span className="choice-eyebrow">Lighting workspace</span>
        <h1 className="choice-title">Craft tailored lighting experiences</h1>
        <p className="choice-subtitle">
          Generate architectural concepts in minutes, iterate with precision, and evaluate photometric impact before a single fixture is installed.
        </p>
      </div>

      <div className="choice-cards">
        {/* Text Prompt Option */}
        <div 
          className="choice-card text-prompt-card"
          onClick={() => onSelectOption('text')}
        >
          <div className="card-icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div className="card-body">
            <h3 className="card-title">Text to 3D</h3>
            <p className="card-description">
              Translate intent into spatial concepts. Ideal for early design explorations and rapid moodboards.
            </p>
            <div className="card-features">
              <span className="feature-tag">Concept sketches</span>
              <span className="feature-tag">Isometric renders</span>
            </div>
          </div>
          <button className="card-button" type="button">
            Start with text
            <svg className="button-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Image Upload Option */}
        <div 
          className="choice-card image-upload-card"
          onClick={() => onSelectOption('image')}
        >
          <div className="card-icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="card-body">
            <h3 className="card-title">Image to 3D</h3>
            <p className="card-description">
              Elevate sketches, isometrics, or reference shots into clean GLB geometry ready for photometric testing.
            </p>
            <div className="card-features">
              <span className="feature-tag">Adaptive meshing</span>
              <span className="feature-tag">Texture capture</span>
            </div>
          </div>
          <button className="card-button" type="button">
            Upload reference
            <svg className="button-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Demo Mode Option */}
        <div 
          className="choice-card demo-mode-card"
          onClick={() => onSelectOption('demo')}
        >
          <div className="card-icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="card-body">
            <h3 className="card-title">Demo simulation</h3>
            <p className="card-description">
              Walk through a curated project featuring calibrated fixtures, layered controls, and export-ready outputs.
            </p>
            <div className="card-features">
              <span className="feature-tag">Fixture presets</span>
              <span className="feature-tag">Scene controls</span>
            </div>
          </div>
          <button className="card-button secondary" type="button">
            Enter demo
            <svg className="button-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="choice-footer">
        <div className="powered-by">
          <span className="powered-label">Trusted by lighting professionals</span>
          <span className="tech-stack">
            <span>Gemini 2.0</span>
            <span>Three.js</span>
            <span>Photometric tools</span>
          </span>
        </div>
      </div>
    </div>
  );
};
