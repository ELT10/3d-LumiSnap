import React, { useEffect, useState } from 'react';
import { useSceneStore } from '../store/sceneStore';
import './DuplicationPreview.css';

/**
 * Component that shows helper text and instructions during duplication
 */
const DuplicationHelper: React.FC = () => {
  const isDuplicating = useSceneStore(state => state.isDuplicating);
  const [visible, setVisible] = useState(false);
  
  // Update visibility based on duplication state
  useEffect(() => {
    setVisible(isDuplicating);
    
    // Also update the body class for cursor styling
    if (isDuplicating) {
      document.body.classList.add('duplication-active');
    } else {
      document.body.classList.remove('duplication-active');
    }
  }, [isDuplicating]);
  
  if (!visible) return null;
  
  return (
    <div className="duplication-helper">
      <div>
        <strong>Positioning Copied Fixture</strong>
        <div>Move cursor to desired position. Press Cmd+V to place here. Press ESC to cancel.</div>
      </div>
    </div>
  );
};

export default DuplicationHelper; 