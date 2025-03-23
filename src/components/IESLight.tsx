import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { IESData } from '../hooks';

export interface IESLightProps {
  iesData: IESData;
  position: [number, number, number];
  color?: THREE.Color | number | string;
  intensity?: number;
  distance?: number;
  castShadow?: boolean;
  shadowMapSize?: number;
  target?: THREE.Object3D;
}

/**
 * Custom IES light component that uses the IES profile data to create realistic light distribution
 */
export const IESLight: React.FC<IESLightProps> = ({
  iesData,
  position,
  color = 0xffffff,
  intensity = 1,
  distance = 0,
  castShadow = false,
  shadowMapSize = 1024,
  target
}) => {
  // Create a reference to the spotlight for controlling it directly
  const spotlightRef = useRef<THREE.SpotLight>(null);
  
  // Create texture from IES data for use in shader
  useEffect(() => {
    if (!spotlightRef.current || !iesData) return;
    
    // Create a data texture from the IES candela values
    // This is a simplified approach - a more accurate implementation would
    // use the full angular distribution data
    
    // First, determine the texture size - use the largest dim for the texture
    const verticalAnglesCount = iesData.angles.vertical.length;
    const horizontalAnglesCount = iesData.angles.horizontal.length;
    const textureSize = Math.max(
      Math.pow(2, Math.ceil(Math.log2(verticalAnglesCount))),
      Math.pow(2, Math.ceil(Math.log2(horizontalAnglesCount)))
    );
    
    // Create a data array for the texture (RGBA format, 8 bits per channel)
    const data = new Uint8Array(textureSize * textureSize * 4);
    
    // Normalize the candela values to 0-1 range
    const normalizedValues = iesData.candelaValues.map(row => 
      row.map(value => value / iesData.maxCandela)
    );
    
    // Fill the texture with the normalized candela values
    // For a proper implementation, we'd need to interpolate values
    for (let h = 0; h < horizontalAnglesCount; h++) {
      for (let v = 0; v < verticalAnglesCount; v++) {
        // We'll use a 1D texture if there's only one horizontal angle
        const index = horizontalAnglesCount === 1 ? v : h * textureSize + v;
        
        // Calculate the pixel index (4 channels: RGBA)
        const pixelIndex = index * 4;
        
        // Normalized candela value (0-1)
        const value = normalizedValues[Math.min(h, normalizedValues.length - 1)]
                                   [Math.min(v, normalizedValues[0].length - 1)];
        
        // Store the normalized value in all RGB channels (white light)
        data[pixelIndex] = Math.floor(value * 255); // R
        data[pixelIndex + 1] = Math.floor(value * 255); // G
        data[pixelIndex + 2] = Math.floor(value * 255); // B
        data[pixelIndex + 3] = 255; // A (fully opaque)
      }
    }
    
    // Create the texture from the data
    const iesTexture = new THREE.DataTexture(
      data,
      textureSize,
      textureSize,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
      THREE.UVMapping,
      THREE.ClampToEdgeWrapping,
      THREE.ClampToEdgeWrapping,
      THREE.LinearFilter,
      THREE.LinearFilter
    );
    iesTexture.needsUpdate = true;
    
    // Apply IES distribution to spotlight by modifying its shader
    if (spotlightRef.current) {
      // Set spotlight properties based on IES data
      // Angle derived from IES vertical angles (usually 0 to 90 or 180 degrees)
      const maxAngle = Math.max(...iesData.angles.vertical) * Math.PI / 180;
      spotlightRef.current.angle = Math.min(Math.PI / 2, maxAngle || Math.PI / 4);
      
      // Calculate a penumbra value based on the data spread
      const verticalAngles = iesData.angles.vertical;
      if (verticalAngles.length > 2) {
        // Calculate the angle where intensity drops to 50% (beam angle)
        let beamAngleIndex = -1;
        const centerIndex = Math.floor(normalizedValues[0].length / 2);
        const centerValue = normalizedValues[0][centerIndex];
        const halfIntensity = centerValue * 0.5;
        
        for (let i = centerIndex; i < normalizedValues[0].length; i++) {
          if (normalizedValues[0][i] <= halfIntensity) {
            beamAngleIndex = i;
            break;
          }
        }
        
        if (beamAngleIndex !== -1) {
          // Use this to set penumbra (softer edge for wider beam spreads)
          const beamWidth = verticalAngles[beamAngleIndex] / verticalAngles[verticalAngles.length - 1];
          spotlightRef.current.penumbra = 0.2 + beamWidth * 0.5;
        } else {
          spotlightRef.current.penumbra = 0.3; // Default fallback
        }
      }
      
      // Set other properties
      spotlightRef.current.intensity = intensity * (iesData.totalLumens / 1000);
      
      // Set the shadow properties
      if (castShadow) {
        spotlightRef.current.castShadow = true;
        spotlightRef.current.shadow.mapSize.width = shadowMapSize;
        spotlightRef.current.shadow.mapSize.height = shadowMapSize;
        spotlightRef.current.shadow.bias = -0.001;
      }
      
      // Set the target if provided
      if (target) {
        spotlightRef.current.target = target;
      }
    }
  }, [iesData, intensity, castShadow, shadowMapSize, target]);
  
  // Update properties when they change
  useEffect(() => {
    if (spotlightRef.current) {
      // Set the target if provided
      if (target) {
        spotlightRef.current.target = target;
      }
      
      // Update intensity
      if (iesData) {
        spotlightRef.current.intensity = intensity * (iesData.totalLumens / 1000);
      } else {
        spotlightRef.current.intensity = intensity;
      }
      
      // Update color
      if (typeof color === 'string' || typeof color === 'number') {
        spotlightRef.current.color.set(color);
      } else {
        spotlightRef.current.color = color;
      }
      
      // Update distance
      spotlightRef.current.distance = distance || 0;
    }
  }, [target, distance, intensity, color, iesData]);
  
  return (
    <>
      {/* Use a standard THREE.js SpotLight as the light source */}
      <spotLight
        ref={spotlightRef}
        position={position}
        color={color}
        intensity={intensity}
        distance={distance}
        castShadow={castShadow}
      />
    </>
  );
}; 