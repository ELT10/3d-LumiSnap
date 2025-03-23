import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stats, Environment } from '@react-three/drei';
import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { LightingFixtures, BuildingModel, FixturePreview } from '.';
import { useSceneStore } from '../store/sceneStore';
import { useSurfaceStore } from '../store/surfaceStore';
import { FixturePropertiesPanel } from './FixturePropertiesPanel';
import './Scene.css';

type SceneProps = {
  showStats?: boolean;
  environmentPreset?: 'night' | 'apartment' | 'city' | 'dawn' | 'forest' | 'lobby' | 'park' | 'studio' | 'sunset' | 'warehouse';
};

const Scene = ({ showStats = true, environmentPreset = 'night' }: SceneProps) => {
  const [isWebGLAvailable, setIsWebGLAvailable] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const orbitControlsRef = useRef<any>(null);
  const addFixture = useSceneStore(state => state.addFixture);
  const selectedFixtureId = useSceneStore(state => state.selectedFixtureId);
  const selectFixture = useSceneStore(state => state.selectFixture);
  const removeFixture = useSceneStore(state => state.removeFixture);
  
  // State for transform controls
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  
  // Handle keyboard shortcuts for transform modes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [selectedFixtureId, removeFixture, selectFixture]);
  
  // Get shared state from our surface store
  const isDragging = useSurfaceStore(state => state.isDragging);
  const currentHit = useSurfaceStore(state => state.currentHit);
  const setIsDragging = useSurfaceStore(state => state.setIsDragging);
  const clearDragState = useSurfaceStore(state => state.clearDragState);
  
  // Disable orbit controls when a fixture is selected or when dragging
  useEffect(() => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = !selectedFixtureId && !isDragging;
    }
  }, [selectedFixtureId, isDragging]);
  
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
  const handleBackgroundClick = (e: any) => {
    // Directly deselect if we click on the canvas (not a mesh)
    if (!e.object || e.object.type === 'Scene' || e.object.type === 'Mesh' && !e.object.userData?.type) {
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
          // position: [-100, 60, 100],
          position: [10, 10, 30],
          fov: 45,
          near: 0.1,
          far: 1000
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
        onClick={handleBackgroundClick}
      >
        {showStats && (
          <Stats 
            className="stats-panel"
            showPanel={0} // 0: fps, 1: ms, 2: mb, 3+: custom
          />
        )}
        
        <Suspense fallback={null}>
          <Environment preset={environmentPreset} background />
        </Suspense>
        
        <ambientLight intensity={0.2} />
        
        <BuildingModel />
        <LightingFixtures transformMode={transformMode} />
        
        {/* This component handles surface detection and preview inside Canvas */}
        <SurfaceDetector containerRef={canvasRef} />
        
        <OrbitControls 
          ref={orbitControlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={0.1}
          maxDistance={300}
          maxPolarAngle={Math.PI / 2 - 0.1} // Prevent going below the ground plane
        />
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
        // For floors, align with normal
        const upVector = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, normal);
        rotation = new THREE.Euler().setFromQuaternion(quaternion);
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