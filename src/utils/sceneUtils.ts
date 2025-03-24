import * as THREE from 'three';

/**
 * Calculates bounding box for any 3D object
 */
export const calculateBoundingBox = (object: THREE.Object3D): THREE.Box3 => {
  return new THREE.Box3().setFromObject(object);
};

/**
 * Centers an object at origin based on its bounding box
 * Returns the original center point of the object before centering
 */
export const centerObject = (object: THREE.Object3D): THREE.Vector3 => {
  const boundingBox = calculateBoundingBox(object);
  const center = new THREE.Vector3();
  boundingBox.getCenter(center);
  
  // Move object geometry to be centered at origin
  object.position.x = -center.x;
  object.position.y = -center.y;
  object.position.z = -center.z;
  
  // Return the original center point
  return center;
};

/**
 * Auto scales an object to fit within specified dimensions
 */
export const autoScaleObject = (
  object: THREE.Object3D, 
  targetSize: number = 10
): void => {
  const boundingBox = calculateBoundingBox(object);
  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  
  const maxDimension = Math.max(size.x, size.y, size.z);
  const scale = targetSize / maxDimension;
  
  object.scale.set(scale, scale, scale);
};

/**
 * Positions camera to properly frame an object
 */
export const positionCameraToFrame = (
  camera: THREE.PerspectiveCamera,
  object: THREE.Object3D, 
  offset: THREE.Vector3 = new THREE.Vector3(1, 0.75, 1)
): THREE.Vector3 => {
  // Calculate the bounding box to get object dimensions
  const boundingBox = calculateBoundingBox(object);
  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  const center = new THREE.Vector3();
  boundingBox.getCenter(center);
  
  // Calculate distance based on object size
  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = maxDim * 2;
  
  // Position the camera with offset
  camera.position.set(
    center.x + distance * offset.x,
    center.y + distance * offset.y,
    center.z + distance * offset.z
  );
  
  // Look at the object's center, not just (0,0,0)
  camera.lookAt(center);
  
  return center;
};

/**
 * Setup model with proper scaling and positioning
 * Returns the center point of the model
 */
export const setupModelInScene = (
  model: THREE.Object3D, 
  targetSize: number = 10
): THREE.Vector3 => {
  // Center at origin first
  centerObject(model);
  
  // Then scale to reasonable size
  autoScaleObject(model, targetSize);
  
  // Position at exact center (0,0,0)
  model.position.set(0, 0, 0);
  
  // Return the center point at (0,0,0) for camera targeting
  return new THREE.Vector3(0, 0, 0);
}; 