import * as THREE from 'three';

/**
 * Calculates the scale factor for a light fixture based on building size
 * @param building - The building model object
 * @param fixtureSizeConfig - Configuration for fixture scaling
 * @returns The scale factor to apply to the fixture
 */
export function calculateFixtureScaleFactor(
  building: THREE.Object3D,
  fixtureSizeConfig = {
    // Percentage of building size (adjust this value to change relative fixture size)
    desiredRelativeSize: 0.02, 
    // Minimum scale factor to ensure fixtures are never too small
    minScaleFactor: 0.5,
    // Maximum scale factor to ensure fixtures are never too large
    maxScaleFactor: 2.0 
  }
): number {
  // Calculate building bounding box
  const buildingBoundingBox = new THREE.Box3().setFromObject(building);
  const buildingSize = new THREE.Vector3();
  buildingBoundingBox.getSize(buildingSize);
  
  // Determine a reference dimension (average of width, height, depth)
  const referenceDimension = (buildingSize.x + buildingSize.y + buildingSize.z) / 3;
  
  // Set scale factor - adjust the divisor to get desired relative size
  const calculatedScaleFactor = referenceDimension * fixtureSizeConfig.desiredRelativeSize;
  
  // Clamp the scale factor to min/max values
  return Math.max(
    fixtureSizeConfig.minScaleFactor,
    Math.min(calculatedScaleFactor, fixtureSizeConfig.maxScaleFactor)
  );
}

/**
 * Scales a fixture based on the building model size
 * @param fixture - The light fixture to scale
 * @param building - The building model 
 * @param options - Scaling options
 * @returns The scaled fixture
 */
export function scaleFixtureToBuilding(
  fixture: THREE.Object3D, 
  building: THREE.Object3D,
  options = {
    desiredRelativeSize: 0.02,
    minScaleFactor: 0.5,
    maxScaleFactor: 2.0
  }
): THREE.Object3D {
  const scaleFactor = calculateFixtureScaleFactor(building, options);
  
  // Apply scale to fixture
  fixture.scale.set(scaleFactor, scaleFactor, scaleFactor);
  
  return fixture;
} 