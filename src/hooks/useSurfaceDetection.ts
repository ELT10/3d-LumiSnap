import { useState, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface SurfaceHit {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  surfaceType: 'wall' | 'ceiling' | 'floor' | 'unknown';
  distance: number;
  object: THREE.Object3D;
}

export function useSurfaceDetection() {
  const { scene, camera } = useThree();
  const [currentHit, setCurrentHit] = useState<SurfaceHit | null>(null);
  
  // Function to detect surfaces under a screen position
  const detectSurfaceAtPosition = useCallback((normalizedX: number, normalizedY: number) => {
    // Create raycaster from camera through mouse position
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), camera);
    
    // Find building objects in the scene
    const buildingObjects: THREE.Object3D[] = [];
    scene.traverse(object => {
      if (object.userData?.type === 'building') {
        buildingObjects.push(object);
      }
    });
    
    // Find intersections with building elements
    const intersects = raycaster.intersectObjects(buildingObjects, true);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      const normal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);
      
      // Convert normal from object space to world space
      const objWorldMatrix = new THREE.Matrix4();
      hit.object.updateWorldMatrix(true, false);
      objWorldMatrix.extractRotation(hit.object.matrixWorld);
      normal.applyMatrix4(objWorldMatrix);
      
      // Determine surface type based on normal
      let surfaceType: 'wall' | 'ceiling' | 'floor' | 'unknown' = 'unknown';
      
      // Assuming Y is up in your world
      const normalYAbs = Math.abs(normal.y);
      if (normalYAbs > 0.8) {
        // Mostly vertical normal
        if (normal.y > 0) {
          surfaceType = 'floor'; // Normal pointing up
        } else {
          surfaceType = 'ceiling'; // Normal pointing down
        }
      } else {
        // Mostly horizontal normal
        surfaceType = 'wall';
      }
      
      // Create the hit information
      const surfaceHit: SurfaceHit = {
        position: hit.point.clone(),
        normal: normal,
        surfaceType: surfaceType,
        distance: hit.distance,
        object: hit.object
      };
      
      setCurrentHit(surfaceHit);
      return surfaceHit;
    } else {
      setCurrentHit(null);
      return null;
    }
  }, [scene, camera]);
  
  return { currentHit, detectSurfaceAtPosition };
} 