import React, { useState, useEffect } from 'react';
import { useSceneStore, LightFixture } from '../store/sceneStore';
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

// Helper function to convert Kelvin to RGB color
function kelvinToRGB(kelvin: number): { r: number; g: number; b: number } {
  // Temperature to RGB conversion algorithm
  let temperature = kelvin / 100;
  let r, g, b;
  
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
  const [temperature, setTemperature] = useState(4000);
  
  // Update local state when selected fixture changes
  useEffect(() => {
    if (selectedFixture) {
      setIntensity(selectedFixture.intensity);
      // We'll estimate temperature based on the fixture's color
      // This is simplified - a real implementation would need color-to-temp conversion
      setTemperature(4000); // Default neutral temperature
    }
  }, [selectedFixture]);
  
  if (!selectedFixture) return null;
  
  const handleIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIntensity = parseFloat(e.target.value);
    setIntensity(newIntensity);
    updateFixture(selectedFixtureId!, { intensity: newIntensity });
  };
  
  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTemp = parseInt(e.target.value);
    setTemperature(newTemp);
    
    // Convert temperature to RGB and update fixture color
    const { r, g, b } = kelvinToRGB(newTemp);
    const newColor = new THREE.Color(r, g, b);
    updateFixture(selectedFixtureId!, { color: newColor });
  };
  
  return (
    <div className="fixture-properties-panel">
      <h3>Light Properties</h3>
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
        <button onClick={() => handleTemperatureChange({ target: { value: String(COLOR_TEMPERATURES.CANDLE) } } as any)}>
          Candle
        </button>
        <button onClick={() => handleTemperatureChange({ target: { value: String(COLOR_TEMPERATURES.WARM) } } as any)}>
          Warm
        </button>
        <button onClick={() => handleTemperatureChange({ target: { value: String(COLOR_TEMPERATURES.NEUTRAL) } } as any)}>
          Neutral
        </button>
        <button onClick={() => handleTemperatureChange({ target: { value: String(COLOR_TEMPERATURES.DAYLIGHT) } } as any)}>
          Daylight
        </button>
      </div>
    </div>
  );
}; 