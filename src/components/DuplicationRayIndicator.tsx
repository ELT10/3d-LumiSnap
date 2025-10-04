import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useSceneStore } from '../store/sceneStore';

interface DuplicationRayIndicatorProps {
  startPosition?: THREE.Vector3;
  endPosition: THREE.Vector3;
  normal: THREE.Vector3;
  surfaceType: string;
}

/**
 * Component that renders a ray indicator when duplicating fixtures
 */
const DuplicationRayIndicator: React.FC<DuplicationRayIndicatorProps> = ({ 
  startPosition,
  endPosition, 
  normal,
  surfaceType
}) => {
  // References for animation
  const pulseRef = useRef<THREE.Mesh>(null);
  const circleRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);
  const isDuplicating = useSceneStore(state => state.isDuplicating);

  // Animate the pulse effect
  useFrame((_, delta: number) => {
    time.current += delta;
    
    // Pulse the target indicator
    if (pulseRef.current) {
      const scale = 1.0 + 0.2 * Math.sin(time.current * 5);
      pulseRef.current.scale.set(scale, scale, scale);
    }
    
    // Pulse the circle
    if (circleRef.current) {
      const opacity = 0.5 + 0.3 * Math.sin(time.current * 3);
      if (circleRef.current.material instanceof THREE.Material) {
        (circleRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
      }
    }
  });
  
  // Create ray points from camera/fixture to the target position
  const rayPoints = useMemo(() => {
    if (startPosition) {
      // If we have a start position, draw line from there to end position
      return [
        new THREE.Vector3(startPosition.x, startPosition.y, startPosition.z),
        new THREE.Vector3(endPosition.x, endPosition.y, endPosition.z)
      ];
    }

    // Otherwise, just show a line extending from the normal
    return [
      new THREE.Vector3(endPosition.x, endPosition.y, endPosition.z),
      new THREE.Vector3(
        endPosition.x + normal.x * 0.6,
        endPosition.y + normal.y * 0.6,
        endPosition.z + normal.z * 0.6
      )
    ];
  }, [startPosition, endPosition, normal]);
  
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
  
  // Add a small offset to prevent z-fighting with the surface
  const offsetPosition = endPosition.clone().add(normal.clone().multiplyScalar(0.02));
  
  // Blue-ish color for the duplication ray
  const glowColor = new THREE.Color(0x4fc3f7).multiplyScalar(1.5);
  
  if (!isDuplicating) {
    return null;
  }

  return (
    <group>
      {/* Ray indicator line */}
      <Line 
        points={rayPoints} 
        color={glowColor} 
        lineWidth={2}
        dashed={true}
        dashSize={0.1}
        dashScale={1}
        gapSize={0.05}
      />
      
      {/* Target indicator */}
      <group position={offsetPosition}>
        {/* Transparent box at the target point */}
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
        
        {/* Surface highlight circle */}
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
        
        {/* Additional thin ring for better visibility */}
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
    </group>
  );
};

export default DuplicationRayIndicator; 