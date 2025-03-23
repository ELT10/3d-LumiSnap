import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import './FixturePreview.css';

interface FixturePreviewProps {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  surfaceType: string;
  fixtureType?: string;
}

export const FixturePreview: React.FC<FixturePreviewProps> = ({ 
  position, 
  normal,
  surfaceType,
  fixtureType
}) => {
  // Reference for animation
  const pulseRef = useRef<THREE.Mesh>(null);
  const circleRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);
  
  // Animate the pulse effect
  useFrame((_, delta: number) => {
    time.current += delta;
    
    // Pulse the box
    if (pulseRef.current) {
      const scale = 1.0 + 0.2 * Math.sin(time.current * 5);
      pulseRef.current.scale.set(scale, scale, scale);
    }
    
    // Pulse the circle
    if (circleRef.current) {
      const opacity = 0.4 + 0.3 * Math.sin(time.current * 3);
      if (circleRef.current.material instanceof THREE.Material) {
        (circleRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
      }
    }
  });
  
  // Calculate rotation based on the normal vector and surface type
  const quaternion = useMemo(() => {
    if (surfaceType === 'wall') {
      // For walls, we need to create a rotation that makes the fixture
      // face outward from the wall
      const upVector = new THREE.Vector3(0, 1, 0);
      const rightVector = new THREE.Vector3().crossVectors(upVector, normal).normalize();
      
      // Create a rotation based on these vectors
      const quaternion = new THREE.Quaternion();
      const targetMatrix = new THREE.Matrix4().makeBasis(
        rightVector,
        upVector,
        normal
      );
      quaternion.setFromRotationMatrix(targetMatrix);
      return quaternion;
    } else if (surfaceType === 'ceiling') {
      // For ceilings, point downward
      return new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI, 0, 0));
    } else {
      // For floors, keep the fixture upright with default orientation
      return new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));
    }
  }, [normal, surfaceType]);
  
  // Determine if this fixture type is compatible with the surface
  const isCompatible = useMemo(() => {
    if (!fixtureType) return true; // If no type specified, assume compatible
    
    // Basic compatibility rules
    if (fixtureType === 'wallLight' && surfaceType !== 'wall') {
      return false;
    }
    if (fixtureType === 'pendant' && surfaceType !== 'ceiling') {
      return false;
    }
    
    return true;
  }, [fixtureType, surfaceType]);
  
  // Add a small offset to prevent z-fighting with the surface
  const offsetPosition = position.clone().add(normal.clone().multiplyScalar(0.02));
  
  // Set the color based on compatibility
  const color = isCompatible ? 0x00ff00 : 0xff0000;
  
  // Make colors more visible
  const glowColor = new THREE.Color(color).multiplyScalar(1.5);
  
  // Create line points for normal indicator (make it longer)
  const linePoints = useMemo(() => [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(normal.x * 0.6, normal.y * 0.6, normal.z * 0.6)
  ], [normal]);
  
  return (
    <group position={offsetPosition}>
      {/* Transparent indicator for placement point - larger box */}
      <mesh 
        ref={pulseRef}
        quaternion={quaternion}
      >
        <boxGeometry args={[0.4, 0.4, 0.1]} />
        <meshBasicMaterial 
          color={glowColor}
          transparent={true} 
          opacity={0.7} 
        />
      </mesh>
      
      {/* Glow effect around the placement point */}
      <mesh quaternion={quaternion}>
        <boxGeometry args={[0.5, 0.5, 0.05]} />
        <meshBasicMaterial 
          color={glowColor}
          transparent={true} 
          opacity={0.3}
        />
      </mesh>
      
      {/* Indicator line showing the normal direction - thicker */}
      <Line 
        points={linePoints} 
        color={glowColor} 
        lineWidth={3} 
      />
      
      {/* Surface highlight circle - larger and more visible */}
      <mesh 
        ref={circleRef}
        quaternion={quaternion} 
        position={normal.clone().multiplyScalar(0.01)}
      >
        <circleGeometry args={[0.6, 32]} />
        <meshBasicMaterial 
          color={glowColor}
          transparent={true} 
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Add an additional thin ring for better visibility */}
      <mesh 
        quaternion={quaternion} 
        position={normal.clone().multiplyScalar(0.02)}
      >
        <ringGeometry args={[0.58, 0.62, 32]} />
        <meshBasicMaterial 
          color={glowColor}
          transparent={true} 
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}; 