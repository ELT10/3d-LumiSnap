import React, { useState, useEffect, useRef } from 'react';
import { useSceneStore } from '../store/sceneStore';
import * as THREE from 'three';
import './FixturePropertiesPanel.css';

// Color temperature presets in Kelvin
const COLOR_TEMPERATURES = {
  CANDLE: 1900,
  WARM: 2700,
  NEUTRAL: 4000,
  COOL: 5500,
  DAYLIGHT: 6500,
};

const DEFAULT_TEMPERATURE = COLOR_TEMPERATURES.NEUTRAL;

// Helper function to convert Kelvin to RGB color
function kelvinToRGB(kelvin: number): { r: number; g: number; b: number } {
  // Temperature to RGB conversion algorithm
  const temperature = kelvin / 100;
  let r;
  let g;
  let b;
  
  if (temperature <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(temperature) - 161.1195681661;
    b = temperature <= 19 ? 0 : 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(temperature - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(temperature - 60, -0.0755148492);
    b = 255;
  }
  
  return {
    r: Math.min(255, Math.max(0, r)) / 255,
    g: Math.min(255, Math.max(0, g)) / 255,
    b: Math.min(255, Math.max(0, b)) / 255
  };
}

export const FixturePropertiesPanel: React.FC = () => {
  const selectedFixtureId = useSceneStore(state => state.selectedFixtureId);
  const fixtures = useSceneStore(state => state.lightFixtures);
  const updateFixture = useSceneStore(state => state.updateFixture);
  
  const selectedFixture = fixtures.find(f => f.id === selectedFixtureId);
  
  // Local state for UI values
  const [intensity, setIntensity] = useState(1.0);
  const [temperature, setTemperature] = useState<number>(DEFAULT_TEMPERATURE);
  // Media facade specific state
  const [mediaOpacity, setMediaOpacity] = useState(0.8);
  const [panelSize, setPanelSize] = useState(0.05);
  const [panelGap, setPanelGap] = useState(0.005);
  const [panelResolution, setPanelResolution] = useState(32);
  const [panelRoundness, setPanelRoundness] = useState(0.2);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Update local state when selected fixture changes
  useEffect(() => {
    if (selectedFixture) {
      setIntensity(selectedFixture.intensity);
      // We'll estimate temperature based on the fixture's color
      // This is simplified - a real implementation would need color-to-temp conversion
      setTemperature(DEFAULT_TEMPERATURE);
      
      // Update media facade specific properties if available
      if (selectedFixture.mediaOpacity !== undefined) {
        setMediaOpacity(selectedFixture.mediaOpacity);
      }
      if (selectedFixture.panelSize !== undefined) {
        setPanelSize(selectedFixture.panelSize);
      }
      if (selectedFixture.panelGap !== undefined) {
        setPanelGap(selectedFixture.panelGap);
      }
      if (selectedFixture.panelResolution !== undefined) {
        setPanelResolution(selectedFixture.panelResolution);
      }
      if (selectedFixture.panelRoundness !== undefined) {
        setPanelRoundness(selectedFixture.panelRoundness);
      }
    }
  }, [selectedFixture]);
  
  if (!selectedFixture) return null;
  
  const handleIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIntensity = parseFloat(e.target.value);
    setIntensity(newIntensity);
    updateFixture(selectedFixtureId!, { intensity: newIntensity });
  };
  
  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTemp = parseInt(e.target.value, 10);
    setTemperature(newTemp);
    
    // Convert temperature to RGB and update fixture color
    const { r, g, b } = kelvinToRGB(newTemp);
    const newColor = new THREE.Color(r, g, b);
    updateFixture(selectedFixtureId!, { color: newColor });
  };

  const handlePresetTemperature = (preset: number) => {
    setTemperature(preset);
    const { r, g, b } = kelvinToRGB(preset);
    const newColor = new THREE.Color(r, g, b);
    updateFixture(selectedFixtureId!, { color: newColor });
  };
  
  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedFixtureId) {
      const url = URL.createObjectURL(file);
      updateFixture(selectedFixtureId, { 
        mediaUrl: url, 
        mediaActive: true 
      });
    }
  };
  
  const handleMediaActiveToggle = () => {
    if (selectedFixtureId) {
      updateFixture(selectedFixtureId, { 
        mediaActive: !(selectedFixture.mediaActive || false) 
      });
    }
  };
  
  // Media facade specific handlers
  const handleMediaOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setMediaOpacity(value);
    updateFixture(selectedFixtureId!, { mediaOpacity: value });
  };
  
  const handlePanelSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setPanelSize(value);
    updateFixture(selectedFixtureId!, { panelSize: value });
  };
  
  const handlePanelGapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setPanelGap(value);
    updateFixture(selectedFixtureId!, { panelGap: value });
  };
  
  const handlePanelResolutionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setPanelResolution(value);
    updateFixture(selectedFixtureId!, { panelResolution: value });
  };
  
  const handlePanelRoundnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setPanelRoundness(value);
    updateFixture(selectedFixtureId!, { panelRoundness: value });
  };
  
  return (
    <div className={`fixture-properties-panel ${selectedFixture.type === 'mediaFacade' ? 'media-facade-panel' : ''}`}>
      <h3>{selectedFixture.name} Properties</h3>
      <div className="property-row">
        <label htmlFor="intensity">Intensity:</label>
        <input 
          id="intensity"
          type="range" 
          min="0" 
          max="5" 
          step="0.1" 
          value={intensity} 
          onChange={handleIntensityChange}
        />
        <span className="property-value">{intensity.toFixed(1)}</span>
      </div>
      
      {/* Only show temperature controls for non-media facades */}
      {selectedFixture.type !== 'mediaFacade' && (
        <>
          <div className="property-row">
            <label htmlFor="temperature">Color Temperature:</label>
            <input 
              id="temperature"
              type="range" 
              min="1900" 
              max="6500" 
              step="100" 
              value={temperature} 
              onChange={handleTemperatureChange}
            />
            <span className="property-value">{temperature}K</span>
          </div>
          
          <div className="temperature-presets">
            <button onClick={() => handlePresetTemperature(COLOR_TEMPERATURES.CANDLE)}>
              Candle
            </button>
            <button onClick={() => handlePresetTemperature(COLOR_TEMPERATURES.WARM)}>
              Warm
            </button>
            <button onClick={() => handlePresetTemperature(COLOR_TEMPERATURES.NEUTRAL)}>
              Neutral
            </button>
            <button onClick={() => handlePresetTemperature(COLOR_TEMPERATURES.DAYLIGHT)}>
              Daylight
            </button>
          </div>
        </>
      )}
      
      {/* Media Facade specific settings */}
      {selectedFixture.type === 'mediaFacade' && (
        <div className="media-facade-settings">
          <h3>Media Facade Controls</h3>
          
          <div className="media-status">
            {selectedFixture.mediaUrl ? (
              <div className="media-status-label success">Media loaded</div>
            ) : (
              <div className="media-status-label warning">No media loaded</div>
            )}
            {selectedFixture.mediaActive ? (
              <div className="media-status-label active">Playing</div>
            ) : (
              <div className="media-status-label inactive">Paused</div>
            )}
          </div>
          
          <div className="property-row">
            <label htmlFor="mediaOpacity">Opacity:</label>
            <input 
              id="mediaOpacity"
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={mediaOpacity} 
              onChange={handleMediaOpacityChange}
            />
            <span className="property-value">{mediaOpacity.toFixed(2)}</span>
          </div>
          
          <div className="property-row button-row">
            <button 
              className={`toggle-button ${selectedFixture.mediaActive ? 'active' : ''}`}
              onClick={handleMediaActiveToggle}
            >
              {selectedFixture.mediaActive ? 'Pause Media' : 'Play Media'}
            </button>
            
            <button 
              className="upload-button"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Media
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="video/*" 
              style={{ display: 'none' }}
              onChange={handleMediaUpload}
            />
          </div>
          
          <h4>Panel Configuration</h4>
          
          <div className="property-row">
            <label htmlFor="panelSize">Panel Size (m):</label>
            <input 
              id="panelSize"
              type="range" 
              min="0.01" 
              max="0.2" 
              step="0.005" 
              value={panelSize} 
              onChange={handlePanelSizeChange}
            />
            <span className="property-value">{panelSize.toFixed(3)}</span>
          </div>
          
          <div className="property-row">
            <label htmlFor="panelGap">Panel Gap (m):</label>
            <input 
              id="panelGap"
              type="range" 
              min="0.001" 
              max="0.05" 
              step="0.001" 
              value={panelGap} 
              onChange={handlePanelGapChange}
            />
            <span className="property-value">{panelGap.toFixed(3)}</span>
          </div>
          
          <div className="property-row">
            <label htmlFor="panelResolution">Resolution:</label>
            <input 
              id="panelResolution"
              type="range" 
              min="8" 
              max="64" 
              step="1" 
              value={panelResolution} 
              onChange={handlePanelResolutionChange}
            />
            <span className="property-value">{panelResolution}×{panelResolution}</span>
          </div>
          
          <div className="property-row">
            <label htmlFor="panelRoundness">Panel Roundness:</label>
            <input 
              id="panelRoundness"
              type="range" 
              min="0" 
              max="0.5" 
              step="0.01" 
              value={panelRoundness} 
              onChange={handlePanelRoundnessChange}
            />
            <span className="property-value">{panelRoundness.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}; 