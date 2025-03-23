import React, { useState, useEffect } from 'react';
import { useSceneStore } from '../store/sceneStore';
import { 
  saveProject, 
  loadProject, 
  getSavedProjects, 
  deleteProject,
  deserializeFixture 
} from '../utils/projectStorage';
import './ProjectPanel.css';

interface ProjectPanelProps {
  isOpen: boolean;
  mode: 'save' | 'load';
  onClose: () => void;
}

const ProjectPanel: React.FC<ProjectPanelProps> = ({ isOpen, mode, onClose }) => {
  const [projectName, setProjectName] = useState('');
  const [savedProjects, setSavedProjects] = useState<{ name: string; date: string }[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  
  const lightFixtures = useSceneStore(state => state.lightFixtures);
  const clearFixtures = useSceneStore(state => state.clearFixtures);
  const addFixture = useSceneStore(state => state.addFixture);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      refreshProjectList();
      setMessage('');
      setMessageType('');
      
      // Reset appropriate fields based on mode
      if (mode === 'save') {
        setProjectName('');
      } else {
        setSelectedProject('');
      }
    }
  }, [isOpen, mode]);
  
  const refreshProjectList = () => {
    setSavedProjects(getSavedProjects());
  };
  
  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
    
    // Clear message after 3 seconds
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };
  
  const handleSave = () => {
    if (!projectName.trim()) {
      showMessage('Please enter a project name', 'error');
      return;
    }
    
    const success = saveProject(projectName, lightFixtures);
    
    if (success) {
      showMessage(`Project "${projectName}" saved successfully!`, 'success');
      refreshProjectList();
      setProjectName('');
      
      // Close modal after successful save
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      showMessage('Failed to save project', 'error');
    }
  };
  
  const handleLoad = () => {
    if (!selectedProject) {
      showMessage('Please select a project to load', 'error');
      return;
    }
    
    const fixtures = loadProject(selectedProject);
    
    if (fixtures) {
      // First clear existing fixtures
      clearFixtures();
      
      // Then add each loaded fixture
      fixtures.forEach(fixtureData => {
        // Convert serialized data to fixture format
        const fixtureProps = deserializeFixture(fixtureData);
        // Add to scene
        addFixture(fixtureProps);
      });
      
      showMessage(`Project "${selectedProject}" loaded successfully!`, 'success');
      
      // Close modal after successful load
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      showMessage(`Failed to load project "${selectedProject}"`, 'error');
    }
  };
  
  const handleDelete = () => {
    if (!selectedProject) {
      showMessage('Please select a project to delete', 'error');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete project "${selectedProject}"?`)) {
      const success = deleteProject(selectedProject);
      
      if (success) {
        showMessage(`Project "${selectedProject}" deleted successfully!`, 'success');
        refreshProjectList();
        setSelectedProject('');
      } else {
        showMessage(`Failed to delete project "${selectedProject}"`, 'error');
      }
    }
  };
  
  // Format date string
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return 'Unknown date';
    }
  };
  
  // If modal is not open, don't render anything
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="project-panel modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'save' ? 'Save Project' : 'Load Project'}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        {message && (
          <div className={`message ${messageType}`}>
            {message}
          </div>
        )}
        
        {mode === 'save' && (
          <div className="save-section">
            <div className="input-group">
              <input
                type="text"
                placeholder="Project Name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                autoFocus
              />
              <button onClick={handleSave}>Save</button>
            </div>
          </div>
        )}
        
        {mode === 'load' && (
          <div className="load-section">
            {savedProjects.length > 0 ? (
              <>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  autoFocus
                >
                  <option value="">Select a project</option>
                  {savedProjects.map((project) => (
                    <option key={project.name} value={project.name}>
                      {project.name} ({formatDate(project.date)})
                    </option>
                  ))}
                </select>
                <div className="button-group">
                  <button onClick={handleLoad}>Load</button>
                  <button onClick={handleDelete} className="delete-button">Delete</button>
                </div>
              </>
            ) : (
              <p className="no-projects">No saved projects found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectPanel; 