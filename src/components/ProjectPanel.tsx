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
  const [isLoading, setIsLoading] = useState(false);
  // Store the currently loaded project name
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null);
  
  const lightFixtures = useSceneStore(state => state.lightFixtures);
  const clearFixtures = useSceneStore(state => state.clearFixtures);
  const addFixture = useSceneStore(state => state.addFixture);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      refreshProjectList();
      setMessage('');
      setMessageType('');
      setIsLoading(false);
      
      // Reset appropriate fields based on mode
      if (mode === 'save') {
        // If we have a currentProjectName, use it for saving
        if (currentProjectName) {
          setProjectName(currentProjectName);
        } else {
          setProjectName('');
        }
      } else {
        setSelectedProject('');
      }
    }
  }, [isOpen, mode]);
  
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, isLoading]);
  
  const refreshProjectList = () => {
    setSavedProjects(getSavedProjects());
  };
  
  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
    
    // Clear message after 3 seconds
    // setTimeout(() => {
    //     setMessage('');
    //     setMessageType('');
    // }, 3000);
  };
  
  const handleSave = async () => {
    if (!projectName.trim()) {
      showMessage('Please enter a project name', 'error');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Small delay to simulate processing and show the loader
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const success = saveProject(projectName, lightFixtures);
      
      if (success) {
        // Update the current project name when we save
        setCurrentProjectName(projectName);
        refreshProjectList();
        
        // Stop loading animation but keep modal open to show success message
        setIsLoading(false);
        
        // Show success message
        showMessage(`Project "${projectName}" saved successfully!`, 'success');
        
        // Close modal after giving time to read the success message
        setTimeout(() => {
            setMessage('');
            setMessageType('');
          onClose();
        }, 1000);
      } else {
        showMessage('Failed to save project', 'error');
        setIsLoading(false);
      }
    } catch (error) {
      showMessage('An error occurred while saving', 'error');
      console.error(error);
      setIsLoading(false);
    }
  };
  
  const handleLoad = async () => {
    if (!selectedProject) {
      showMessage('Please select a project to load', 'error');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Small delay to simulate processing and show the loader
      await new Promise(resolve => setTimeout(resolve, 600));
      
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
        
        // Remember the loaded project name for future saves
        setCurrentProjectName(selectedProject);
        // Stop loading animation but keep modal open to show success message
        setIsLoading(false);
        
        // Show success message
        showMessage(`Project "${selectedProject}" loaded successfully!`, 'success');
        
        // Close modal after giving time to read the success message
        setTimeout(() => {
            setMessage('');
            setMessageType('');
            
          onClose();
        }, 1000);
      } else {
        showMessage(`Failed to load project "${selectedProject}"`, 'error');
        setIsLoading(false);
      }
    } catch (error) {
      showMessage('An error occurred while loading', 'error');
      console.error(error);
      setIsLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!selectedProject) {
      showMessage('Please select a project to delete', 'error');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete project "${selectedProject}"?`)) {
      setIsLoading(true);
      
      try {
        // Small delay to simulate processing and show the loader
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const success = deleteProject(selectedProject);
        
        if (success) {
          // If we deleted the current project, clear the current project name
          if (selectedProject === currentProjectName) {
            setCurrentProjectName(null);
          }
          
          refreshProjectList();
          setSelectedProject('');
          
          // Stop loading animation but keep modal open to show success message
          setIsLoading(false);
          
          // Show success message
          showMessage(`Project "${selectedProject}" deleted successfully!`, 'success');
          
          // For delete, we don't auto-close the modal so user can select another project
        } else {
          showMessage(`Failed to delete project "${selectedProject}"`, 'error');
          setIsLoading(false);
        }
      } catch (error) {
        showMessage('An error occurred while deleting', 'error');
        console.error(error);
        setIsLoading(false);
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
  
  // Handle Enter key press for forms
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' && !isLoading) {
      action();
    }
  };
  
  // If modal is not open, don't render anything
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="project-panel modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{mode === 'save' ? 'Save Project' : 'Load Project'}</h3>
          <button 
            className="close-button" 
            onClick={onClose} 
            disabled={isLoading}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        {message && (
          <div className={`message ${messageType}`}>
            {message}
          </div>
        )}
        
        {isLoading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <div className="loading-text">
              {mode === 'save' ? 'Saving...' : mode === 'load' ? 'Loading...' : 'Processing...'}
            </div>
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
                onKeyDown={(e) => handleKeyDown(e, handleSave)}
                autoFocus
                disabled={isLoading}
              />
              <button onClick={handleSave} disabled={isLoading} style={{marginBottom: '10px'}}>
                Save
              </button>
            </div>
            {currentProjectName && (
              <div className="current-project-info" style={{marginTop: '10px'}}>
                {currentProjectName === projectName ? 
                  `Updating existing project` : 
                  `Previously loaded: ${currentProjectName}`}
              </div>
            )}
          </div>
        )}
        
        {mode === 'load' && (
          <div className="load-section">
            {savedProjects.length > 0 ? (
              <>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleLoad)}
                  autoFocus
                  disabled={isLoading}
                >
                  <option value="">Select a project</option>
                  {savedProjects.map((project) => (
                    <option key={project.name} value={project.name}>
                      {project.name} ({formatDate(project.date)})
                    </option>
                  ))}
                </select>
                <div className="button-group">
                  <button 
                    onClick={handleDelete} 
                    className="icon-button delete-button" 
                    disabled={isLoading || !selectedProject}
                    title="Delete selected project"
                    aria-label="Delete selected project"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                  <button 
                    onClick={handleLoad} 
                    disabled={isLoading}
                    className="primary-button"
                  >
                    Load Project
                  </button>
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