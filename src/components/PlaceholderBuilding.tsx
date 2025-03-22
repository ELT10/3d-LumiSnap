import React from 'react';
import { useSceneStore } from '../store/sceneStore';

export const PlaceholderBuilding: React.FC = () => {
  const setBuildingModelLoaded = useSceneStore(state => state.setBuildingModelLoaded);
  
  // Mark the building as loaded
  React.useEffect(() => {
    setBuildingModelLoaded(true);
  }, [setBuildingModelLoaded]);
  
  return (
    <group>
      {/* Floor */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        receiveShadow
        userData={{ type: 'building' }}
      >
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#CCCCCC" roughness={0.7} metalness={0.1} />
      </mesh>
      
      {/* Room walls */}
      <group position={[0, 1.5, 0]}>
        {/* Back wall */}
        <mesh position={[0, 0, -5]} receiveShadow castShadow userData={{ type: 'building' }}>
          <boxGeometry args={[10, 3, 0.2]} />
          <meshStandardMaterial color="#aaaaaa" />
        </mesh>
        
        {/* Left wall */}
        <mesh position={[-5, 0, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow castShadow userData={{ type: 'building' }}>
          <boxGeometry args={[10, 3, 0.2]} />
          <meshStandardMaterial color="#999999" />
        </mesh>
        
        {/* Right wall */}
        <mesh position={[5, 0, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow castShadow userData={{ type: 'building' }}>
          <boxGeometry args={[10, 3, 0.2]} />
          <meshStandardMaterial color="#999999" />
        </mesh>
        
        {/* Ceiling */}
        <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow userData={{ type: 'building' }}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="#bbbbbb" />
        </mesh>
        
        {/* Furniture: Table */}
        <group position={[0, -0.5, 0]}>
          <mesh position={[0, 0.4, 0]} receiveShadow castShadow userData={{ type: 'building' }}>
            <boxGeometry args={[3, 0.1, 1.5]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          
          {/* Table legs */}
          <mesh position={[-1.4, 0, -0.6]} receiveShadow castShadow userData={{ type: 'building' }}>
            <boxGeometry args={[0.1, 0.8, 0.1]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          
          <mesh position={[1.4, 0, -0.6]} receiveShadow castShadow userData={{ type: 'building' }}>
            <boxGeometry args={[0.1, 0.8, 0.1]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          
          <mesh position={[-1.4, 0, 0.6]} receiveShadow castShadow userData={{ type: 'building' }}>
            <boxGeometry args={[0.1, 0.8, 0.1]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          
          <mesh position={[1.4, 0, 0.6]} receiveShadow castShadow userData={{ type: 'building' }}>
            <boxGeometry args={[0.1, 0.8, 0.1]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
        </group>
      </group>
    </group>
  );
}; 