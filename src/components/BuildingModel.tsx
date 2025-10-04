import { useRef, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useSceneStore } from '../store/sceneStore';
import { Mesh, Group, MeshStandardMaterial, Vector3 } from 'three';
import type { OrbitControls } from 'three-stdlib';
import { calculateBoundingBox } from '../utils/sceneUtils';
import { useThree } from '@react-three/fiber';

// Use the new house model
const DEFAULT_MODEL_PATH = '/models/house3/house.glb';

interface BuildingModelProps {
  modelPath?: string;
}

export const BuildingModel = ({ modelPath = DEFAULT_MODEL_PATH }: BuildingModelProps) => {
  const group = useRef<Group>(null);
  const { camera, controls } = useThree();
  const setBuildingModelLoaded = useSceneStore(state => state.setBuildingModelLoaded);
  
  // Use Suspense with useGLTF to handle loading
  const { scene: model } = useGLTF(modelPath);
  
  useEffect(() => {
    const groupInstance = group.current;

    if (model && groupInstance) {
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
      
      // Clear any previous models
      while (groupInstance.children.length > 0) {
        groupInstance.remove(groupInstance.children[0]);
      }
      
      // Add the new model
      groupInstance.add(modelClone);
      
      // Explicitly position group at origin
      groupInstance.position.set(0, 0, 0);
      
      // Calculate bounding box of the model
      const bbox = calculateBoundingBox(modelClone);
      const center = new Vector3();
      const size = new Vector3();
      bbox.getCenter(center);
      bbox.getSize(size);
      
      // Auto-scale the model (without changing position)
      const maxDim = Math.max(size.x, size.z); // Use x and z for horizontal dimensions
      const scale = 20 / maxDim; // Scale to size 20
      modelClone.scale.set(scale, scale, scale);
      
      // Recalculate bounding box after scaling
      const scaledBbox = calculateBoundingBox(modelClone);
      const scaledSize = new Vector3();
      scaledBbox.getSize(scaledSize);
      
      // Position the model so its base is on the grid
      // First, recalculate the center after scaling
      const scaledCenter = new Vector3();
      scaledBbox.getCenter(scaledCenter);
      
      // Move the model so that:
      // 1. Its bottom is at y=0 (grid level)
      // 2. It's centered horizontally at x=0, z=0
      modelClone.position.set(
        -scaledCenter.x,
        -scaledBbox.min.y,
        -scaledCenter.z
      );
      
      // Position camera for a good view
      const distance = Math.max(scaledSize.x, scaledSize.z) * 1.5;
      camera.position.set(distance, distance * 0.6, distance);
      camera.lookAt(0, scaledSize.y / 2, 0); // Look at the middle of the building
      
      // Update orbit controls target
      const orbitControls = controls as OrbitControls | undefined;
      if (orbitControls?.target) {
        // Set orbit controls target to the middle of the building
        orbitControls.target.set(0, scaledSize.y / 2, 0);
      }
      
      // Mark the building as loaded in the store
      setBuildingModelLoaded(true);
      
    }
    
    // Clean up function
    return () => {
      if (groupInstance) {
        while (groupInstance.children.length > 0) {
          groupInstance.remove(groupInstance.children[0]);
        }
      }
    };
  }, [model, setBuildingModelLoaded, camera, controls]);
  
  return (
    <group ref={group} position={[0, 0, 0]} />
  );
};

// Preload the model for better performance
useGLTF.preload(DEFAULT_MODEL_PATH); 