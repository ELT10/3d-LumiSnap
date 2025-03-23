import React, { useState } from 'react';
import { useSceneStore } from '../store/sceneStore';
import * as THREE from 'three';
import { useSurfaceStore } from '../store/surfaceStore';
import { ProjectPanel } from '.';
import './FixturePanel.css';

// Sample fixture data (would be replaced with real catalog data)
const SAMPLE_FIXTURES = [
  {
    id: 'fixture-1',
    name: 'Ceiling Spotlight',
    manufacturer: 'LightCorp',
    type: 'spotlight',
    iesProfile: '/ies/spot.ies',
    thumbnail: '/thumbnails/spot.jpg'
  },
  {
    id: 'fixture-2',
    name: 'Grazer',
    manufacturer: 'LightCorp',
    type: 'grazer',
    iesProfile: '/ies/grazer.ies',
    thumbnail: '/thumbnails/grazer.jpg'
  },
  {
    id: 'fixture-3',
    name: 'Wall Sconce',
    manufacturer: 'LightCorp',
    type: 'wallLight',
    iesProfile: '/ies/sconce.ies',
    thumbnail: '/thumbnails/sconce.jpg'
  },
  {
    id: 'fixture-4',
    name: 'Pendant Light',
    manufacturer: 'LightCorp',
    type: 'pendant',
    iesProfile: '/ies/pendant.ies',
    thumbnail: '/thumbnails/pendant.jpg'
  }
];

interface FixtureCatalogItem {
  id: string;
  name: string;
  manufacturer: string;
  type: string;
  iesProfile: string;
  thumbnail: string;
}

export const FixturePanel: React.FC = () => {
  const addFixture = useSceneStore(state => state.addFixture);
  const removeFixture = useSceneStore(state => state.removeFixture);
  const lightFixtures = useSceneStore(state => state.lightFixtures);
  const selectFixture = useSceneStore(state => state.selectFixture);
  const selectedFixtureId = useSceneStore(state => state.selectedFixtureId);
  const setDraggedFixtureData = useSurfaceStore(state => state.setDraggedFixtureData);
  const [searchTerm, setSearchTerm] = useState('');
  const [fixtures] = useState<FixtureCatalogItem[]>(SAMPLE_FIXTURES);
  
  // State for project modal
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState<'save' | 'load'>('save');
  
  // Filter fixtures based on search term
  const filteredFixtures = fixtures.filter(fixture => 
    fixture.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    fixture.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleDragStart = (e: React.DragEvent, fixture: FixtureCatalogItem) => {
    // Store the data in dataTransfer for the drop handler
    e.dataTransfer.setData('application/json', JSON.stringify(fixture));
    e.dataTransfer.effectAllowed = 'copy';
    
    // Also store it in our shared store for the preview
    setDraggedFixtureData(fixture);
  };
  
  const handleDragEnd = () => {
    // Clear the dragged fixture data when the drag operation ends
    // (but not immediately, as it might still be needed during the drop processing)
    setTimeout(() => {
      setDraggedFixtureData(null);
    }, 100);
  };
  
  const handleAddFixture = (fixture: FixtureCatalogItem) => {
    // Create a new fixture at a default position
    addFixture({
      type: fixture.type,
      position: new THREE.Vector3(0, 2, 0), // Default position above the floor
      rotation: new THREE.Euler(0, 0, 0),
      scale: new THREE.Vector3(1, 1, 1),
      intensity: 1.5, // Higher default intensity
      color: new THREE.Color(0xffffff),
      iesProfile: fixture.iesProfile,
      name: fixture.name,
      manufacturer: fixture.manufacturer
    });
  };
  
  const handleDeleteFixture = (id: string) => {
    if (window.confirm('Are you sure you want to delete this fixture?')) {
      removeFixture(id);
    }
  };
  
  const openSaveModal = () => {
    setProjectModalMode('save');
    setIsProjectModalOpen(true);
  };
  
  const openLoadModal = () => {
    setProjectModalMode('load');
    setIsProjectModalOpen(true);
  };
  
  const closeProjectModal = () => {
    setIsProjectModalOpen(false);
  };
  
  return (
    <div className="fixture-panel">
      <div className="fixture-panel-header">
        <h2>Lighting Fixtures</h2>
        <div className="project-buttons">
          <button className="project-button save-button" onClick={openSaveModal}>
            Save
          </button>
          <button className="project-button load-button" onClick={openLoadModal}>
            Load
          </button>
        </div>
      </div>
      
      <div className="search-container">
        <input 
          type="text"
          placeholder="Search fixtures..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
      
      <div className="fixtures-list">
        {filteredFixtures.map(fixture => (
          <div 
            key={fixture.id}
            className="fixture-item"
            draggable
            onDragStart={(e) => handleDragStart(e, fixture)}
            onDragEnd={handleDragEnd}
            onClick={() => handleAddFixture(fixture)}
          >
            <div className="fixture-thumbnail">
              {fixture.thumbnail ? (
                <img src={fixture.thumbnail} alt={fixture.name} />
              ) : (
                <div className="thumbnail-placeholder">{fixture.name[0]}</div>
              )}
            </div>
            <div className="fixture-info">
              <div className="fixture-name">{fixture.name}</div>
              <div className="fixture-manufacturer">{fixture.manufacturer}</div>
            </div>
          </div>
        ))}
        
        {filteredFixtures.length === 0 && (
          <div className="no-fixtures">
            No fixtures found matching "{searchTerm}"
          </div>
        )}
      </div>
      
      {/* Active fixtures section with delete buttons */}
      <div className="active-fixtures-section">
        <h3>Scene Fixtures</h3>
        <div className="active-fixtures-list">
          {lightFixtures.length > 0 ? (
            lightFixtures.map(fixture => (
              <div 
                key={fixture.id} 
                className={`active-fixture-item ${selectedFixtureId === fixture.id ? 'selected' : ''}`}
                onClick={() => selectFixture(fixture.id)}
              >
                <div className="fixture-info">
                  <div className="fixture-name">{fixture.name}</div>
                  <div className="fixture-type">{fixture.type}</div>
                </div>
                <div className="fixture-controls">
                  <button 
                    className="fixture-delete-button"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the parent onClick
                      handleDeleteFixture(fixture.id);
                    }}
                    title="Delete Fixture"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="no-active-fixtures">
              No fixtures in scene
            </div>
          )}
        </div>
      </div>
      
      {/* Project modal */}
      <ProjectPanel 
        isOpen={isProjectModalOpen}
        mode={projectModalMode}
        onClose={closeProjectModal}
      />
    </div>
  );
}; 