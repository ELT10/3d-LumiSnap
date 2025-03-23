import { useState, useEffect } from 'react';
import './KeyboardShortcuts.css';

const KeyboardShortcuts = () => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setShowShortcuts(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', () => setShowShortcuts(false));

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', () => setShowShortcuts(false));
    };
  }, []);

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
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts; 