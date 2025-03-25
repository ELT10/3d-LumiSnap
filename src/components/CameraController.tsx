import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../store/sceneStore';
import { calculateBoundingBox } from '../utils/sceneUtils';

/**
 * CameraController component handles automatic camera positioning and provides debug information
 */
const CameraController = () => {
  const { camera, scene } = useThree();
  const buildingModelLoaded = useSceneStore(state => state.buildingModelLoaded);
  // Use a simple flag for debug mode instead of process.env
  const debugMode = true; // Set to false in production
  
  // Log camera debugging info
  useEffect(() => {
    if (debugMode) {
      console.log('Initial Camera Position:', camera.position);
      console.log('Initial Camera Rotation:', camera.rotation);
      console.log('Building Model Loaded:', buildingModelLoaded);
    }
  }, [camera, buildingModelLoaded, debugMode]);
  
  // Building debug info
  useEffect(() => {
    if (buildingModelLoaded && debugMode) {
      // Find the building model in the scene
      let buildingModel: THREE.Object3D | null = null;
      
      scene.traverse((object) => {
        if (object.userData?.type === 'building' && !buildingModel) {
          // Get the top parent which contains all building parts
          let parent = object;
          while (parent.parent && parent.parent.type !== 'Scene') {
            parent = parent.parent;
          }
          buildingModel = parent;
        }
      });
      
      if (buildingModel) {
        // Debug building position
        const worldPosition = new THREE.Vector3();
        (buildingModel as THREE.Object3D).getWorldPosition(worldPosition);
        console.log('Building world position:', worldPosition);
          
        // Calculate and log bounding box info
        const boundingBox = calculateBoundingBox(buildingModel);
        const size = new THREE.Vector3();
        boundingBox.getSize(size);
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
          
        console.log('Building Bounding Box Min:', boundingBox.min);
        console.log('Building Bounding Box Max:', boundingBox.max);
        console.log('Building Bounding Box Size:', size);
        console.log('Building Bounding Box Center:', center);
          
        // Count building meshes for debugging
        let meshCount = 0;
        (buildingModel as THREE.Object3D).traverse((child: THREE.Object3D) => {
          if (child.type === 'Mesh') {
            meshCount++;
          }
        });
        console.log(`Building contains ${meshCount} meshes`);
      }
    }
  }, [buildingModelLoaded, scene, debugMode]);
  
  return null;
};

export default CameraController; 