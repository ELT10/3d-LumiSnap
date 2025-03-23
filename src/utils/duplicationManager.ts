import * as THREE from 'three';
import { useSceneStore } from '../store/sceneStore';
import { useSurfaceStore } from '../store/surfaceStore';

/**
 * Handles the fixture copy-paste process
 */
export class DuplicationManager {
  private static instance: DuplicationManager;
  private raycaster: THREE.Raycaster;
  private camera: THREE.Camera | null = null;
  private scene: THREE.Scene | null = null;
  private mousePosition: THREE.Vector2;
  private previewPosition: THREE.Vector3;
  private isPreviewing: boolean = false;
  private currentSurfaceHit: {
    position: THREE.Vector3,
    normal: THREE.Vector3,
    surfaceType: string,
    rotation: THREE.Euler
  } | null = null;
  
  // Store complete transform of original fixture
  private originalFixture: {
    id: string,
    position: THREE.Vector3,
    rotation: THREE.Euler,
    scale: THREE.Vector3
  } | null = null;
  
  private constructor() {
    this.raycaster = new THREE.Raycaster();
    this.mousePosition = new THREE.Vector2();
    this.previewPosition = new THREE.Vector3();
    console.log("DuplicationManager initialized");
  }
  
  /**
   * Get the DuplicationManager singleton instance
   */
  public static getInstance(): DuplicationManager {
    if (!DuplicationManager.instance) {
      DuplicationManager.instance = new DuplicationManager();
    }
    return DuplicationManager.instance;
  }
  
  /**
   * Set the camera used for raycasting
   */
  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
    console.log("DuplicationManager: Camera set", camera);
  }
  
  /**
   * Set the scene for raycasting
   */
  public setScene(scene: THREE.Scene): void {
    this.scene = scene;
    console.log("DuplicationManager: Scene set");
  }
  
  /**
   * Copy a fixture for later pasting
   * @param fixtureId ID of the fixture to copy
   */
  public copyFixture(fixtureId: string): boolean {
    console.log("Copying fixture:", fixtureId);
    
    if (!fixtureId) {
      console.error("Cannot copy: No fixture ID provided");
      return false;
    }
    
    // Get the fixture to verify it exists
    const fixtures = useSceneStore.getState().lightFixtures;
    const fixture = fixtures.find(f => f.id === fixtureId);
    
    if (!fixture) {
      console.error("Cannot copy: Fixture not found", fixtureId);
      return false;
    }
    
    // Store complete transform information (make explicit copies of THREE.js objects)
    this.originalFixture = {
      id: fixture.id,
      position: new THREE.Vector3(fixture.position.x, fixture.position.y, fixture.position.z),
      rotation: new THREE.Euler(fixture.rotation.x, fixture.rotation.y, fixture.rotation.z, fixture.rotation.order),
      scale: new THREE.Vector3(fixture.scale.x, fixture.scale.y, fixture.scale.z)
    };
    
    console.log("Stored original transform:", {
      position: [
        this.originalFixture.position.x.toFixed(2),
        this.originalFixture.position.y.toFixed(2),
        this.originalFixture.position.z.toFixed(2)
      ],
      rotation: [
        this.originalFixture.rotation.x.toFixed(2),
        this.originalFixture.rotation.y.toFixed(2),
        this.originalFixture.rotation.z.toFixed(2)
      ],
      scale: [
        this.originalFixture.scale.x.toFixed(2),
        this.originalFixture.scale.y.toFixed(2),
        this.originalFixture.scale.z.toFixed(2)
      ]
    });
    
    // Store the ID in the scene store
    useSceneStore.getState().copyFixture(fixtureId);
    
    // Show success notification
    this.showNotification("Fixture copied. Press Cmd+V to paste.");
    
    return true;
  }
  
  /**
   * Start showing a preview of where the fixture will be pasted
   */
  public startPastePreview(): boolean {
    console.log("Starting paste preview");
    
    const copiedFixtureId = useSceneStore.getState().copiedFixtureId;
    
    if (!copiedFixtureId) {
      console.error("Cannot preview paste: No fixture has been copied");
      this.showNotification("No fixture has been copied. Select a fixture and press Cmd+C first.");
      return false;
    }
    
    if (!this.originalFixture) {
      console.error("Cannot preview paste: No original transform information stored");
      return false;
    }
    
    this.isPreviewing = true;
    useSceneStore.getState().setDuplicating(true);
    
    // Add visual indicator cursor
    document.body.classList.add('duplication-active');
    
    return true;
  }
  
  /**
   * Stop showing the paste preview
   */
  public stopPastePreview(): void {
    this.isPreviewing = false;
    useSceneStore.getState().setDuplicating(false);
    document.body.classList.remove('duplication-active');
    this.currentSurfaceHit = null;
  }
  
  /**
   * Get current surface hit information
   */
  public getCurrentSurfaceHit() {
    return this.currentSurfaceHit;
  }
  
  /**
   * Get original fixture transform
   */
  public getOriginalFixture() {
    return this.originalFixture;
  }
  
  /**
   * Update the preview position based on mouse position
   * @param x Mouse X position in screen coordinates
   * @param y Mouse Y position in screen coordinates
   */
  public updatePreviewPosition(x: number, y: number): THREE.Vector3 | null {
    if (!this.isPreviewing || !this.originalFixture) {
      return null;
    }
    
    if (!this.camera || !this.scene) {
      console.warn("Cannot update preview position: No camera or scene set");
      return null;
    }
    
    // Convert screen coordinates to normalized device coordinates (-1 to 1)
    this.mousePosition.x = (x / window.innerWidth) * 2 - 1;
    this.mousePosition.y = -(y / window.innerHeight) * 2 + 1;
    
    // Set up raycaster from the camera through the mouse position
    this.raycaster.setFromCamera(this.mousePosition, this.camera);
    
    // Find building objects in the scene
    const buildingObjects: THREE.Object3D[] = [];
    this.scene.traverse(object => {
      if (object.userData?.type === 'building') {
        buildingObjects.push(object);
      }
    });
    
    const intersects = this.raycaster.intersectObjects(buildingObjects, true);
    
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
        if (normal.y > 0) {
          surfaceType = 'floor'; // Normal pointing up
        } else {
          surfaceType = 'ceiling'; // Normal pointing down
        }
      } else {
        surfaceType = 'wall';
      }
      
      // Use original rotation always - ignore surface type
      const originalRotation = this.originalFixture.rotation;
      
      // Store surface hit information with original rotation
      this.currentSurfaceHit = {
        position: hit.point.clone(),
        normal: normal.clone(),
        surfaceType: surfaceType,
        rotation: new THREE.Euler(
          originalRotation.x,
          originalRotation.y,
          originalRotation.z,
          originalRotation.order
        )
      };
      
      // Update the preview position
      this.previewPosition.copy(hit.point.clone());
      return this.previewPosition.clone();
    } else {
      // If no surface hit, fall back to a plane at camera height
      const ray = this.raycaster.ray;
      const intersectionPoint = new THREE.Vector3();
      const defaultHeight = 1.0; // Default height if no surface is hit
      
      // Create a horizontal plane at the default height
      const horizontalPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -defaultHeight);
      
      if (ray.intersectPlane(horizontalPlane, intersectionPoint)) {
        this.previewPosition.copy(intersectionPoint);
        
        // Use original rotation
        const originalRotation = this.originalFixture.rotation;
        
        this.currentSurfaceHit = {
          position: intersectionPoint.clone(),
          normal: new THREE.Vector3(0, 1, 0),
          surfaceType: 'floor',
          rotation: new THREE.Euler(
            originalRotation.x,
            originalRotation.y,
            originalRotation.z,
            originalRotation.order
          )
        };
        return this.previewPosition.clone();
      } else {
        // Last resort: place a fixed distance from camera
        ray.at(10, intersectionPoint);
        this.previewPosition.copy(intersectionPoint);
        
        // Use original rotation
        const originalRotation = this.originalFixture.rotation;
        
        this.currentSurfaceHit = {
          position: intersectionPoint.clone(),
          normal: new THREE.Vector3(0, 1, 0),
          surfaceType: 'floor',
          rotation: new THREE.Euler(
            originalRotation.x,
            originalRotation.y,
            originalRotation.z,
            originalRotation.order
          )
        };
        return this.previewPosition.clone();
      }
    }
  }
  
  /**
   * Paste the copied fixture at the current preview position
   * @returns ID of the new fixture if successful, null otherwise
   */
  public pasteFixture(): string | null {
    console.log("Pasting fixture");
    
    if (!this.isPreviewing) {
      console.warn("Not currently previewing");
      // Allow pasting without preview
      const newFixtureId = useSceneStore.getState().pasteFixture();
      if (newFixtureId) {
        this.showNotification("Fixture pasted");
      }
      return newFixtureId;
    }
    
    const copiedFixtureId = useSceneStore.getState().copiedFixtureId;
    
    if (!copiedFixtureId) {
      console.error("Cannot paste: No fixture has been copied");
      this.showNotification("No fixture has been copied");
      this.stopPastePreview();
      return null;
    }
    
    if (!this.currentSurfaceHit || !this.originalFixture) {
      console.error("Cannot paste: No surface detected or original transform");
      this.showNotification("No surface detected for placement");
      return null;
    }
    
    // Get the original fixture to duplicate
    const fixtures = useSceneStore.getState().lightFixtures;
    const originalFixture = fixtures.find(f => f.id === copiedFixtureId);
    
    if (!originalFixture) {
      console.error("Cannot paste: Original fixture no longer exists");
      this.stopPastePreview();
      return null;
    }
    
    // Create a new fixture at the new position but with original rotation
    console.log("Pasting with original rotation:", 
      this.originalFixture.rotation.x.toFixed(2), 
      this.originalFixture.rotation.y.toFixed(2), 
      this.originalFixture.rotation.z.toFixed(2)
    );
    
    // Add the fixture to the scene - ensure we create proper copies of Vector3 and Euler
    const newFixtureId = useSceneStore.getState().duplicateFixture(
      copiedFixtureId,
      new THREE.Vector3().copy(this.currentSurfaceHit.position),
      new THREE.Euler(
        this.originalFixture.rotation.x,
        this.originalFixture.rotation.y,
        this.originalFixture.rotation.z,
        this.originalFixture.rotation.order
      )
    );
    
    if (newFixtureId) {
      this.showNotification("Fixture pasted");
    }
    
    // Clean up
    this.stopPastePreview();
    
    return newFixtureId;
  }
  
  /**
   * Check if paste preview is active
   */
  public isPreviewActive(): boolean {
    return this.isPreviewing;
  }
  
  /**
   * Show a notification message to the user
   */
  private showNotification(message: string): void {
    // In a real app, implement a toast notification
    console.log("NOTIFICATION:", message);
  }
} 