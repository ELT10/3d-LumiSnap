import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, PerspectiveCamera } from '@react-three/drei';
import './ModelPreview.css';

interface ModelPreviewProps {
  modelUrl: string;
  downloadUrl?: string;
  sourceImage?: string;
  onConfirm: () => void;
  onBack: () => void;
  onRegenerate: () => void;
}

const Model3DPreview: React.FC<{ url: string }> = ({ url }) => {
  const { scene } = useGLTF(url);
  
  return (
    <primitive object={scene.clone()} />
  );
};

export const ModelPreview: React.FC<ModelPreviewProps> = ({
  modelUrl,
  downloadUrl,
  sourceImage,
  onConfirm,
  onBack,
  onRegenerate,
}) => {
  return (
    <div className="model-preview-container">
      <div className="preview-header">
        <button className="back-button" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="header-content">
          <span className="preview-eyebrow">Step 3 · Review geometry</span>
          <h2 className="preview-title">Preview your 3D model</h2>
          <p className="preview-subtitle">
            Inspect the reconstructed scene, confirm alignment, and send it into the lighting simulator when you’re satisfied.
          </p>
        </div>
      </div>

      <div className="preview-content">
        <div className="preview-layout">
          {/* 3D Preview */}
          <div className="model-viewer">
            <div className="canvas-wrapper">
              <Canvas shadows>
                <color attach="background" args={['#f0f0f0']} />
                
                <PerspectiveCamera makeDefault position={[25, 12, 25]} fov={50} />
                
                <OrbitControls
                  enableDamping
                  dampingFactor={0.05}
                  rotateSpeed={0.5}
                  minDistance={5}
                  maxDistance={100}
                />
                
                <ambientLight intensity={0.5} />
                <directionalLight
                  position={[10, 10, 5]}
                  intensity={1}
                  castShadow
                  shadow-mapSize-width={2048}
                  shadow-mapSize-height={2048}
                />
                
                <Environment preset="studio" />
                
                <Suspense fallback={null}>
                  <Model3DPreview url={modelUrl} />
                </Suspense>
                
                <gridHelper args={[100, 100, 0xcccccc, 0xeeeeee]} position={[0, 0, 0]} />
              </Canvas>
              
              <div className="canvas-controls-hint">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16v-4m0-4h.01" />
                </svg>
                <span>Drag to rotate • Scroll to zoom • Right-click to pan</span>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="preview-sidebar">
            {/* Source Image */}
            {sourceImage && (
              <div className="source-section">
                <h3 className="section-title">Source Image</h3>
                <div className="source-image-wrapper">
                  <img src={sourceImage} alt="Source" className="source-image" />
                </div>
              </div>
            )}

            {/* Model Info */}
            <div className="info-section">
              <h3 className="section-title">Model Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Status</span>
                  <span className="info-value success">
                    <span className="status-dot"></span>
                    Ready
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Format</span>
                  <span className="info-value">GLB</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Quality</span>
                  <span className="info-value">High</span>
                </div>
                {downloadUrl && (
                  <div className="info-item download-item">
                    <span className="info-label">Download</span>
                    <a
                      href={downloadUrl}
                      className="info-value link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Meshy GLB
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Features Checklist */}
            <div className="features-section">
              <h3 className="section-title">Ready For Simulation</h3>
              <ul className="features-list">
                <li className="feature-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>3D geometry generated</span>
                </li>
                <li className="feature-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Surfaces optimized</span>
                </li>
                <li className="feature-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Materials applied</span>
                </li>
                <li className="feature-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Ready for fixtures</span>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="preview-actions">
              <button className="confirm-button" onClick={onConfirm}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Start Lighting Simulation
              </button>

              <button className="regenerate-button" onClick={onRegenerate}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate Model
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="preview-footer">
        <div className="footer-hint">
          💡 Tip: You can adjust lighting fixtures, intensity, and positions once in the simulator
        </div>
      </div>
    </div>
  );
};
