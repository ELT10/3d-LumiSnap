import { useState, useEffect } from 'react';
import { useSceneStore } from '../store/sceneStore';
import { DuplicationManager } from '../utils/duplicationManager';
import './KeyboardShortcuts.css';

const KeyboardShortcuts = () => {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const selectedFixtureId = useSceneStore(state => state.selectedFixtureId);
  const copiedFixtureId = useSceneStore(state => state.copiedFixtureId);
  const duplicationManager = DuplicationManager.getInstance();
  
  // Show/hide preview state
  const [showingPreview, setShowingPreview] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only show shortcuts when Ctrl or Cmd is pressed
      if (e.ctrlKey || e.metaKey) {
        setShowShortcuts(true);
      }
      
      // Handle Cmd+C to copy a fixture and immediately start preview
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedFixtureId) {
        e.preventDefault(); // Prevent browser's "Copy" action
        if (duplicationManager.copyFixture(selectedFixtureId)) {
          // If copy successful, immediately start preview
          duplicationManager.startPastePreview();
          setShowingPreview(true);
        }
      }
      
      // Handle Cmd+V to paste a fixture (now only needs to finalize)
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && copiedFixtureId && showingPreview) {
        e.preventDefault(); // Prevent browser's "Paste" action
        // Complete the paste
        duplicationManager.pasteFixture();
        setShowingPreview(false);
      }
      
      // Cancel duplication with Escape
      if (e.key === 'Escape' && showingPreview) {
        duplicationManager.stopPastePreview();
        setShowingPreview(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Hide shortcuts help when Ctrl/Cmd is released
      if (!e.ctrlKey && !e.metaKey) {
        setShowShortcuts(false);
      }
    };
    
    // Handle window blur to reset states
    const handleBlur = () => {
      setShowShortcuts(false);
      if (showingPreview) {
        duplicationManager.stopPastePreview();
        setShowingPreview(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [selectedFixtureId, copiedFixtureId, duplicationManager, showingPreview]);

  if (!showShortcuts) return null;

  return (
    <div className="keyboard-shortcuts">
      <h3>Keyboard Shortcuts</h3>
      <div className="shortcuts-grid">
        <div className="shortcut-group">
          <h4>History</h4>
          <div className="shortcut-item">
            <span className="key-combo">
              <kbd>Ctrl</kbd>+<kbd>Z</kbd>
            </span>
            <span>Undo</span>
          </div>
          <div className="shortcut-item">
            <span className="key-combo">
              <kbd>Ctrl</kbd>+<kbd>Y</kbd>
            </span>
            <span>Redo</span>
          </div>
        </div>
        
        <div className="shortcut-group">
          <h4>Transform</h4>
          <div className="shortcut-item">
            <span className="key-combo">
              <kbd>G</kbd>
            </span>
            <span>Move</span>
          </div>
          <div className="shortcut-item">
            <span className="key-combo">
              <kbd>R</kbd>
            </span>
            <span>Rotate</span>
          </div>
          <div className="shortcut-item">
            <span className="key-combo">
              <kbd>S</kbd>
            </span>
            <span>Scale</span>
          </div>
          <div className="shortcut-item">
            <span className="key-combo">
              <kbd>Del</kbd>/<kbd>Backspace</kbd>
            </span>
            <span>Delete fixture</span>
          </div>
          <div className="shortcut-item">
            <span className="key-combo">
              <kbd>Ctrl</kbd>+<kbd>C</kbd>
            </span>
            <span>Copy fixture + start preview</span>
          </div>
          <div className="shortcut-item">
            <span className="key-combo">
              <kbd>Ctrl</kbd>+<kbd>V</kbd>
            </span>
            <span>Paste at cursor position</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts; 