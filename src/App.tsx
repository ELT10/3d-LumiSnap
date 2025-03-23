import { useState, useEffect } from 'react'
import Scene from './components/Scene'
import { FixturePanel } from './components'
import { useSceneStore } from './store/sceneStore'
import KeyboardShortcuts from './components/KeyboardShortcuts'
import './App.css'

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const selectedFixtureId = useSceneStore(state => state.selectedFixtureId)
  const selectFixture = useSceneStore(state => state.selectFixture)
  const undo = useSceneStore(state => state.undo)
  const redo = useSceneStore(state => state.redo)
  const canUndo = useSceneStore(state => state.canUndo)
  const canRedo = useSceneStore(state => state.canRedo)
  const historyIndex = useSceneStore(state => state.historyIndex)
  const historyLength = useSceneStore(state => state.history.length)
  
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
  
  // Add keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for undo: Ctrl+Z or Command+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo()) undo()
      }
      
      // Check for redo: Ctrl+Y or Command+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        if (canRedo()) redo()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, canUndo, canRedo])
  
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
          <p><strong>Controls:</strong> Drag to rotate | Scroll to zoom | Right-click + drag to pan | Cmd+C to copy, Cmd+V to paste exact duplicate</p>
          <div className="controls-buttons">
            <button 
              className="control-button undo-button" 
              onClick={undo} 
              disabled={!canUndo()}
              title="Undo (Ctrl+Z)"
            >
              <span className="button-icon">↩</span> Undo
            </button>
            <button 
              className="control-button redo-button" 
              onClick={redo} 
              disabled={!canRedo()}
              title="Redo (Ctrl+Y)"
            >
              <span className="button-icon">↪</span> Redo
            </button>
            {selectedFixtureId && (
              <button 
                className="control-button deselect-button"
                onClick={() => selectFixture(null)}
              >
                Deselect
              </button>
            )}
          </div>
          
          <div className="history-status">
            History state: {historyIndex + 1}/{historyLength} 
            {historyLength > 0 && <span className="history-dot"></span>}
          </div>
        </div>
      </div>
      
      {/* Keyboard shortcuts help */}
      <KeyboardShortcuts />
    </div>
  )
}

export default App
