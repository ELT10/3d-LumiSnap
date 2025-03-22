import { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useSceneStore } from '../store/sceneStore';
import { Mesh, Group, MeshStandardMaterial, Material } from 'three';
import { useThree } from '@react-three/fiber';

// Use the new house model
const DEFAULT_MODEL_PATH = '/models/house1/result.gltf';

interface BuildingModelProps {
  modelPath?: string;
}

export const BuildingModel = ({ modelPath = DEFAULT_MODEL_PATH }: BuildingModelProps) => {
  const { scene } = useThree();
  const group = useRef<Group>(null);
  const setBuildingModelLoaded = useSceneStore(state => state.setBuildingModelLoaded);
  
  // Use Suspense with useGLTF to handle loading
  const { scene: model, materials } = useGLTF(modelPath);
  
  useEffect(() => {
    if (model) {
      // Clone the model to avoid modifying the cached original
      const modelClone = model.clone();
      
      // Apply PBR materials for better realism
      modelClone.traverse((child) => {
        if ((child as Mesh).isMesh) {
          const mesh = child as Mesh;
          
          // Make sure all meshes can receive shadows
          mesh.receiveShadow = true;
          mesh.castShadow = true;
          
          // Add userData for building elements
          mesh.userData.type = 'building';
          
          // Apply material adjustments if needed
          if (mesh.material) {
            // Adjust material properties for better lighting response
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(mat => {
                if (mat instanceof MeshStandardMaterial) {
                  mat.roughness = 0.7;
                  mat.metalness = 0.2;
                }
              });
            } else if (mesh.material instanceof MeshStandardMaterial) {
              mesh.material.roughness = 0.7;
              mesh.material.metalness = 0.2;
            }
          }
        }
      });
      
      // Add the model to our group ref
      if (group.current) {
        // Clear any previous models
        while (group.current.children.length > 0) {
          group.current.remove(group.current.children[0]);
        }
        
        // Add the new model
        group.current.add(modelClone);
        
        // Position and scale the building appropriately
        // Adjust position to center the model and place it on the ground
        group.current.position.set(0, -20, 0);
        group.current.scale.set(0.8, 0.8, 0.8); 
        
        // Mark the building as loaded in the store
        setBuildingModelLoaded(true);
      }
    }
    
    // Clean up function
    return () => {
      if (group.current) {
        while (group.current.children.length > 0) {
          group.current.remove(group.current.children[0]);
        }
      }
    };
  }, [model, setBuildingModelLoaded]);
  
  return (
    <group ref={group} />
  );
};

// Preload the model for better performance
useGLTF.preload(DEFAULT_MODEL_PATH); 