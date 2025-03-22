import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { IESData } from '../hooks/useIESLoader';

interface IESLightProps {
  iesData: IESData;
  position: [number, number, number];
  color?: THREE.ColorRepresentation;
  intensity?: number;
  distance?: number;
  castShadow?: boolean;
  shadowMapSize?: number;
  target?: THREE.Object3D;
}

// This is a simplified implementation of an IES-based light
// In a real implementation, we would create a custom shader using the IES profile data
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
  const spotlightRef = useRef<THREE.SpotLight>(null);
  
  // For this simplified version, we'll use a SpotLight with parameters
  // derived from the IES data to approximate the lighting effect
  const maxIntensity = Math.max(...iesData.candelaValues.flat()) / 1000;
  
  // Update target and properties when they change
  useEffect(() => {
    if (spotlightRef.current) {
      // Set the target if provided
      if (target) {
        spotlightRef.current.target = target;
      }
      
      // Ensure spotlight has proper values set
      const effectiveDistance = distance || 10;
      spotlightRef.current.distance = effectiveDistance;
      
      // Make sure intensity is never zero
      spotlightRef.current.intensity = Math.max(0.5, intensity * maxIntensity);
      
      // Use beamAngle from IES data or default to a reasonable angle
      spotlightRef.current.angle = iesData.beamAngle || Math.PI / 4;
      
      // Set shadow properties
      if (castShadow) {
        spotlightRef.current.castShadow = true;
        spotlightRef.current.shadow.mapSize.width = shadowMapSize;
        spotlightRef.current.shadow.mapSize.height = shadowMapSize;
        spotlightRef.current.shadow.bias = -0.001;
      }
    }
  }, [target, distance, intensity, iesData, castShadow, shadowMapSize, maxIntensity]);
  
  return (
    <>
      {/* Create a default target if none provided */}
      {!target && (
        <object3D position={[0, 0, -5]} />
      )}
      
      <spotLight
        ref={spotlightRef}
        position={position}
        color={color}
        intensity={Math.max(0.5, intensity * maxIntensity)}
        distance={distance || 10}
        angle={iesData.beamAngle || Math.PI / 4}
        penumbra={0.5}
        castShadow={castShadow}
        shadow-mapSize-width={shadowMapSize}
        shadow-mapSize-height={shadowMapSize}
        shadow-bias={-0.001}
      />
    </>
  );
}; 