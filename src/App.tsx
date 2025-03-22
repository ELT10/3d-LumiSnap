import { useState, useEffect } from 'react'
import Scene from './components/Scene'
import { FixturePanel } from './components'
import { useSceneStore } from './store/sceneStore'
import './App.css'

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const selectedFixtureId = useSceneStore(state => state.selectedFixtureId)
  const selectFixture = useSceneStore(state => state.selectFixture)
  
  // Simulate loading assets
  useEffect(() => {
    // In a real app, we would load models, textures, and IES profiles here
    const loadAssets = async () => {
      // Simulate loading time with a timeout
      await new Promise(resolve => setTimeout(resolve, 1000))
      setIsLoading(false)
    }
    
    loadAssets()
  }, [])
  
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h2>Loading 3D Lighting Simulator</h2>
          <div className="loading-spinner"></div>
          <p>Preparing scene and assets...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="app">
      {/* Main 3D Scene */}
      <Scene showStats={true} />
      
      {/* Fixture selection panel */}
      <FixturePanel />
      
      {/* Information overlay */}
      <div className="info-overlay">
        <div className="app-title">3D Lighting Simulator</div>
        <div className="controls-info">
          <p><strong>Controls:</strong> Drag to rotate | Scroll to zoom | Right-click + drag to pan</p>
          {selectedFixtureId && (
            <button 
              className="deselect-button"
              onClick={() => selectFixture(null)}
            >
              Deselect Fixture
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
