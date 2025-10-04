import { Canvas, useThree, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stats, Environment } from '@react-three/drei';
import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { LightingFixtures, FixturePreview } from '.';
import { BuildingModel } from './BuildingModel';
import { useSceneStore } from '../store/sceneStore';
import { useSurfaceStore } from '../store/surfaceStore';
import { FixturePropertiesPanel } from './FixturePropertiesPanel';
import DuplicationPreview from './DuplicationPreview';
import DuplicationHelper from './DuplicationHelper';
import CameraController from './CameraController';
import './Scene.css';

type SceneProps = {
  showStats?: boolean;
  environmentPreset?: 'night' | 'apartment' | 'city' | 'dawn' | 'forest' | 'lobby' | 'park' | 'studio' | 'sunset' | 'warehouse';
};

const Scene = ({ showStats = true, environmentPreset = 'sunset' }: SceneProps) => {
  const [isWebGLAvailable, setIsWebGLAvailable] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const addFixture = useSceneStore(state => state.addFixture);
  const selectedFixtureId = useSceneStore(state => state.selectedFixtureId);
  const selectFixture = useSceneStore(state => state.selectFixture);
  const removeFixture = useSceneStore(state => state.removeFixture);
  const isDuplicating = useSceneStore(state => state.isDuplicating);
  const fixturesVisible = useSceneStore(state => state.fixturesVisible);
  const toggleFixturesVisibility = useSceneStore(state => state.toggleFixturesVisibility);
  
  // State for transform controls
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  
  // Handle keyboard shortcuts for transform modes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcuts that don't require a selected fixture
      if (e.key.toLowerCase() === 'h') {
        toggleFixturesVisibility();
        return;
      }
      
      // Shortcuts that require a selected fixture
      if (!selectedFixtureId) return;
      
      switch (e.key.toLowerCase()) {
        case 'g': // 'g' for translate (grab in Blender)
          setTransformMode('translate');
          break;
        case 'r': // 'r' for rotate
          setTransformMode('rotate');
          break;
        case 's': // 's' for scale
          setTransformMode('scale');
          break;
        case 'delete': // Delete key for removing fixture
        case 'backspace': // Alternative key for removing fixture
          if (window.confirm('Are you sure you want to delete this fixture?')) {
            removeFixture(selectedFixtureId);
            selectFixture(null);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFixtureId, removeFixture, selectFixture, toggleFixturesVisibility]);
  
  // Get shared state from our surface store
  const isDragging = useSurfaceStore(state => state.isDragging);
  const currentHit = useSurfaceStore(state => state.currentHit);
  const setIsDragging = useSurfaceStore(state => state.setIsDragging);
  const clearDragState = useSurfaceStore(state => state.clearDragState);
  
  // Disable orbit controls when a fixture is selected, when dragging, or when duplicating
  useEffect(() => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = !selectedFixtureId && !isDragging && !isDuplicating;
    }
    
    // Log the control states for debugging
    console.log("Control states:", { 
      selectedFixtureId: !!selectedFixtureId, 
      isDragging, 
      isDuplicating, 
      orbitEnabled: orbitControlsRef.current?.enabled 
    });
  }, [selectedFixtureId, isDragging, isDuplicating]);
  
  useEffect(() => {
    // Check for WebGL compatibility
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setIsWebGLAvailable(!!gl);
    } catch (e) {
      setIsWebGLAvailable(false);
      console.error('WebGL not available:', e);
    }
  }, []);
  
  // Handle background click to deselect fixtures
  const handleBackgroundClick = (event: ThreeEvent<MouseEvent>) => {
    // Skip if we're in duplication mode
    if (isDuplicating) return;
    
    // Directly deselect if we click on the canvas (not a mesh)
    if (!event.object || event.object.type === 'Scene' || event.object.type === 'Mesh' && !event.object.userData?.type) {
      // We've clicked directly on the background or a non-fixture object
      selectFixture(null);
    }
  };

  // Handle drag over with surface detection
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    // Enable dragging state to show the preview
    setIsDragging(true);
    
    // Store mouse coordinates on the container element for the SurfaceDetector
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    if (canvasRef.current) {
      canvasRef.current.dataset.mouseX = String(((e.clientX - rect.left) / rect.width) * 2 - 1);
      canvasRef.current.dataset.mouseY = String(-((e.clientY - rect.top) / rect.height) * 2 + 1);
    }
  }, [setIsDragging]);

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, [setIsDragging]);

  // Handle drop to place a fixture on a surface
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    try {
      // Get fixture data from the drag event
      const fixtureData = JSON.parse(e.dataTransfer.getData('application/json'));
      
      // Use the current hit for placement if available
      if (currentHit) {
        // Get fixture type info to know how to place it
        const isWallFixture = fixtureData.type === 'wallLight';
        const isCeilingFixture = fixtureData.type === 'pendant';
        
        // Determine if this fixture type is appropriate for this surface
        let isCompatible = true;
        if (isWallFixture && currentHit.surfaceType !== 'wall') {
          isCompatible = false;
          console.warn('Wall lights can only be placed on walls');
        } else if (isCeilingFixture && currentHit.surfaceType !== 'ceiling') {
          isCompatible = false;
          console.warn('Pendant lights can only be placed on ceilings');
        }
        
        if (isCompatible) {
          // Add fixture with the correct position and orientation
          addFixture({
            type: fixtureData.type,
            position: currentHit.position.clone().add(
              currentHit.normal.clone().multiplyScalar(0.05)
            ),
            rotation: currentHit.rotation,
            scale: new THREE.Vector3(1, 1, 1),
            intensity: 1,
            color: new THREE.Color(0xffffff),
            iesProfile: fixtureData.iesProfile,
            name: fixtureData.name,
            manufacturer: fixtureData.manufacturer
          });
        }
      } else {
        // Fall back to placing at a default position if no surface hit
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        // Convert screen position to normalized coordinates (-1 to 1)
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const z = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Place fixture at a position based on the drop location
        addFixture({
          type: fixtureData.type,
          position: new THREE.Vector3(x * 5, 2, z * 5),
          rotation: new THREE.Euler(0, 0, 0),
          scale: new THREE.Vector3(1, 1, 1),
          intensity: 1,
          color: new THREE.Color(0xffffff),
          iesProfile: fixtureData.iesProfile,
          name: fixtureData.name,
          manufacturer: fixtureData.manufacturer
        });
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    } finally {
      // Clear the drag state when done
      clearDragState();
    }
  }, [addFixture, currentHit, clearDragState]);

  if (!isWebGLAvailable) {
    return (
      <div className="webgl-error">
        <h2>WebGL Not Available</h2>
        <p>Your browser or device doesn't support WebGL, which is required for this application.</p>
      </div>
    );
  }

  return (
    <div 
      className="scene-container" 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      ref={canvasRef}
    >
      {/* Add the duplication helper outside the Canvas */}
      <DuplicationHelper />
      
      {/* Toggle Fixture Visibility UI - outside of Canvas */}
      <div className="visibility-controls">
        <button 
          className={`visibility-toggle-btn ${!fixturesVisible ? 'active' : ''}`} 
          onClick={toggleFixturesVisibility}
          title="Toggle Fixture Objects Visibility (H)"
        >
          <span className="toggle-icon">
            {fixturesVisible ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            )}
          </span>
          <span className="toggle-text">{fixturesVisible ? 'Hide Fixtures' : 'Show Fixtures'}</span>
        </button>
      </div>
      
      {/* Transform Controls UI - outside of Canvas */}
      {selectedFixtureId && (
        <div className="transform-controls-ui">
          <div className="transform-controls-buttons">
            <button 
              className={`transform-btn ${transformMode === 'translate' ? 'active' : ''}`} 
              onClick={() => setTransformMode('translate')}
              title="Translate (G)"
            >
              Move
            </button>
            <button 
              className={`transform-btn ${transformMode === 'rotate' ? 'active' : ''}`} 
              onClick={() => setTransformMode('rotate')}
              title="Rotate (R)"
            >
              Rotate
            </button>
            <button 
              className={`transform-btn ${transformMode === 'scale' ? 'active' : ''}`} 
              onClick={() => setTransformMode('scale')}
              title="Scale (S)"
            >
              Scale
            </button>
            <button 
              className="transform-btn delete-btn"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this fixture?')) {
                  removeFixture(selectedFixtureId);
                  selectFixture(null);
                }
              }}
              title="Delete (Del)"
            >
              Delete
            </button>
          </div>
        </div>
      )}
      
      {/* Properties Panel for selected fixture */}
      <FixturePropertiesPanel />
      
      <Canvas
        shadows
        camera={{
          position: [30, 15, 30], // Start with a better position
          fov: 45,
          near: 0.1,
          far: 1000
        }}
        gl={{
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: true, // Needed for taking screenshots
          logarithmicDepthBuffer: true // Helps with z-fighting
        }}
        onClick={handleBackgroundClick}
      >
        {/* Scene background */}
        <color attach="background" args={[0x222222]} />
        
        {/* Environment lighting */}
        <Environment preset={environmentPreset} background={true} />
        
        {/* Ambient light */}
        <ambientLight intensity={0.4} />
        
        {/* Debug camera positioning - use only for debugging */}
        <CameraController />
        
        {/* Orbit controls */}
        <OrbitControls 
          ref={orbitControlsRef}
          target={[0, 0, 0]} 
          enableDamping={true}
          dampingFactor={0.05}
          rotateSpeed={0.5}
          maxPolarAngle={Math.PI * 1} // Prevent going below ground
          minDistance={2}
          maxDistance={200}
          makeDefault
        />
        
        {/* Helper grid for orientation */}
        <gridHelper 
          args={[100, 100, 0x444444, 0x222222]} 
          position={[0, 0, 0]} 
          rotation={[0, 0, 0]}
        />
        
        {/* Scene axis helper for orientation */}
        {/* <axesHelper args={[5]} /> */}
        
        {/* Surface detector for placing fixtures */}
        <SurfaceDetector containerRef={canvasRef} />
        
        {/* Building model at the center of scene */}
        <Suspense fallback={null}>
          <BuildingModel />
        </Suspense>
        
        {/* Fixtures */}
        <LightingFixtures transformMode={transformMode} />
        
        {/* Preview for dragging new fixtures */}
        {isDragging && currentHit && (
          <FixturePreview 
            position={currentHit.position} 
            normal={currentHit.normal}
            surfaceType={currentHit.surfaceType}
          />
        )}
        
        {/* Preview for duplicating fixtures */}
        <DuplicationPreview />
        
        {/* Stats display */}
        {showStats &&  
        <Stats 
            className="stats-panel"
            showPanel={0} // 0: fps, 1: ms, 2: mb, 3+: custom
          />}
        
      </Canvas>
    </div>
  );
};

// Component that handles surface detection inside the Canvas
interface SurfaceDetectorProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const SurfaceDetector: React.FC<SurfaceDetectorProps> = ({ containerRef }) => {
  const { scene, camera } = useThree();
  const raycaster = new THREE.Raycaster();
  
  // Get shared state from our surface store
  const isDragging = useSurfaceStore(state => state.isDragging);
  const setCurrentHit = useSurfaceStore(state => state.setCurrentHit);
  const currentHit = useSurfaceStore(state => state.currentHit);
  
  // Store mouse coordinates in refs to avoid re-renders
  const mouseXRef = useRef(0);
  const mouseYRef = useRef(0);
  
  // Use a frame callback for continuous updates during dragging
  // This is better than useEffect for animations/continuous updates
  useFrame(() => {
    if (!isDragging || !containerRef.current) return;
    
    // Read mouse coordinates from container dataset
    const newMouseX = parseFloat(containerRef.current.dataset.mouseX || '0');
    const newMouseY = parseFloat(containerRef.current.dataset.mouseY || '0');
    
    // Update refs - this doesn't trigger re-renders
    mouseXRef.current = newMouseX;
    mouseYRef.current = newMouseY;
    
    // Find building objects in the scene
    const buildingObjects: THREE.Object3D[] = [];
    scene.traverse(object => {
      if (object.userData?.type === 'building') {
        buildingObjects.push(object);
      }
    });
    
    // Setup raycaster
    raycaster.setFromCamera(
      new THREE.Vector2(mouseXRef.current, mouseYRef.current), 
      camera
    );
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
        if (normal.y > 0) {
          surfaceType = 'floor'; // Normal pointing up
        } else {
          surfaceType = 'ceiling'; // Normal pointing down
        }
      } else {
        surfaceType = 'wall';
      }
      
      // Calculate rotation based on surface type and normal
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
        // For floors, we want the fixture to be upright (not rotate to align with normal)
        // Using default orientation (0, 0, 0) which keeps it upright
        rotation = new THREE.Euler(0, 0, 0);
      }
      
      // Create the hit information with rotation information
      const surfaceHit = {
        position: hit.point.clone(),
        normal: normal,
        surfaceType: surfaceType,
        distance: hit.distance,
        object: hit.object,
        rotation: rotation
      };
      
      setCurrentHit(surfaceHit);
    } else {
      setCurrentHit(null);
    }
  });
  
  // Render the preview if dragging and we have a hit
  if (isDragging && currentHit) {
    return (
      <FixturePreview 
        position={currentHit.position} 
        normal={currentHit.normal}
        surfaceType={currentHit.surfaceType}
      />
    );
  }
  
  return null;
};

export default Scene; 