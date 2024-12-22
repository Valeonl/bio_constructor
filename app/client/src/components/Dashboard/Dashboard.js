import React, { useState } from 'react';
import DashboardTile from './DashboardTile';
import './Dashboard.css';

function Dashboard() {
  const [tiles, setTiles] = useState(() => {
    try {
      const savedTiles = localStorage.getItem('dashboardTiles');
      return savedTiles ? JSON.parse(savedTiles) : Array(4).fill({ widget: null });
    } catch (error) {
      console.error('Error loading dashboard state:', error);
      return Array(4).fill({ widget: null });
    }
  });

  const handleWidgetSelect = (tileIndex, widget) => {
    try {
      const newTiles = [...tiles];
      newTiles[tileIndex] = { widget: widget || null };
      setTiles(newTiles);
      localStorage.setItem('dashboardTiles', JSON.stringify(newTiles));
    } catch (error) {
      console.error('Error saving dashboard state:', error);
    }
  };

  const handleMoveWidget = (fromIndex, toIndex) => {
    try {
      if (fromIndex < 0 || fromIndex >= tiles.length || 
          toIndex < 0 || toIndex >= tiles.length || 
          fromIndex === toIndex) {
        return;
      }

      const newTiles = [...tiles];
      const movedTile = { ...newTiles[fromIndex] };
      const targetTile = { ...newTiles[toIndex] };
      
      newTiles[fromIndex] = targetTile;
      newTiles[toIndex] = movedTile;
      
      setTiles(newTiles);
      localStorage.setItem('dashboardTiles', JSON.stringify(newTiles));
    } catch (error) {
      console.error('Error moving widget:', error);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        {tiles.map((tile, index) => (
          <DashboardTile
            key={index}
            index={index}
            widget={tile.widget}
            onSelect={(widget) => handleWidgetSelect(index, widget)}
            onMove={handleMoveWidget}
          />
        ))}
      </div>
    </div>
  );
}

export default Dashboard; 