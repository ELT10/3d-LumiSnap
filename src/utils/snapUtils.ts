import * as THREE from 'three';
import { LightFixture } from '../store/sceneStore';

interface SnapResult {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  surfaceType: string;
}

/**
 * Snaps a fixture to the nearest surface
 * @param fixture - The fixture to snap
 * @param buildingObjects - Array of building objects to check for snapping
 * @param maxSnapDistance - Maximum distance to check for snapping
 * @returns Snap information if successful, null if no surface found
 */
export function snapFixtureToNearestSurface(
  fixture: LightFixture,
  buildingObjects: THREE.Object3D[],
  maxSnapDistance: number = 1.0
): SnapResult | null {
  // Create a raycaster in six directions (up, down, left, right, forward, backward)
  const raycaster = new THREE.Raycaster();
  const directions = [
    new THREE.Vector3(0, 1, 0),   // Up
    new THREE.Vector3(0, -1, 0),  // Down
    new THREE.Vector3(1, 0, 0),   // Right
    new THREE.Vector3(-1, 0, 0),  // Left
    new THREE.Vector3(0, 0, 1),   // Forward
    new THREE.Vector3(0, 0, -1),  // Backward
  ];
  
  // Initialize variables to track closest hit
  let closestHit: THREE.Intersection | null = null;
  let closestDirection: THREE.Vector3 | null = null;
  let closestDistance = maxSnapDistance;
  
  // Check each direction
  for (const direction of directions) {
    raycaster.set(fixture.position, direction);
    const intersects = raycaster.intersectObjects(buildingObjects, true);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      
      // If this hit is closer than our current closest, update
      if (hit.distance < closestDistance) {
        closestDistance = hit.distance;
        closestHit = hit;
        closestDirection = direction;
      }
    }
  }
  
  // If we found a hit, calculate snap information
  if (closestHit && closestDirection) {
    const normal = closestHit.face ? closestHit.face.normal.clone() : closestDirection.clone().negate();
    
    // Convert normal from object space to world space
    const objWorldMatrix = new THREE.Matrix4();
    closestHit.object.updateWorldMatrix(true, false);
    objWorldMatrix.extractRotation(closestHit.object.matrixWorld);
    normal.applyMatrix4(objWorldMatrix);
    
    // Determine surface type based on normal
    let surfaceType = 'unknown';
    const normalYAbs = Math.abs(normal.y);
    
    if (normalYAbs > 0.8) {
      if (normal.y > 0) {
        surfaceType = 'floor';
      } else {
        surfaceType = 'ceiling';
      }
    } else {
      surfaceType = 'wall';
    }
    
    // Calculate position with small offset from surface
    const position = closestHit.point.clone().add(
      normal.clone().multiplyScalar(0.05)
    );
    
    // Calculate rotation to align with the surface
    let rotation: THREE.Euler;
    
    if (surfaceType === 'wall') {
      // For walls, create rotation that makes fixture face outward
      const upVector = new THREE.Vector3(0, 1, 0);
      const rightVector = new THREE.Vector3().crossVectors(upVector, normal).normalize();
      
      const quaternion = new THREE.Quaternion();
      const targetMatrix = new THREE.Matrix4().makeBasis(
        rightVector,
        upVector,
        normal
      );
      quaternion.setFromRotationMatrix(targetMatrix);
      rotation = new THREE.Euler().setFromQuaternion(quaternion);
    } else if (surfaceType === 'ceiling') {
      // For ceilings, point downward
      rotation = new THREE.Euler(Math.PI, 0, 0);
    } else {
      // For floors, align with normal
      const upVector = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, normal);
      rotation = new THREE.Euler().setFromQuaternion(quaternion);
    }
    
    return {
      position,
      rotation,
      surfaceType
    };
  }
  
  return null;
}

/**
 * Calculate rotation for a fixture based on surface normal and type
 * @param normal Surface normal vector
 * @param surfaceType Type of surface (wall, ceiling, floor)
 * @returns Euler rotation angles for the fixture
 */
export function calculateFixtureRotation(
  normal: THREE.Vector3,
  surfaceType: string
): THREE.Euler {
  if (surfaceType === 'wall') {
    // For walls, create rotation that makes fixture face outward
    const upVector = new THREE.Vector3(0, 1, 0);
    const rightVector = new THREE.Vector3().crossVectors(upVector, normal).normalize();
    
    const quaternion = new THREE.Quaternion();
    const targetMatrix = new THREE.Matrix4().makeBasis(
      rightVector,
      upVector,
      normal
    );
    quaternion.setFromRotationMatrix(targetMatrix);
    return new THREE.Euler().setFromQuaternion(quaternion);
  } else if (surfaceType === 'ceiling') {
    // For ceilings, point downward
    return new THREE.Euler(Math.PI, 0, 0);
  } else {
    // For floors, align with normal
    const upVector = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, normal);
    return new THREE.Euler().setFromQuaternion(quaternion);
  }
} 