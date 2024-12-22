import React from 'react';
import { useConnection } from '../context/ConnectionContext';
import './ConnectionStatus.css';

function ConnectionStatus() {
  const { connectionState } = useConnection();

  const getStatusColor = () => {
    switch (connectionState) {
      case 'stable':
        return 'green';
      case 'unstable':
        return 'yellow';
      case 'lost':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <div className="connection-status">
      <span className="connection-text">Связь с оборудованием</span>
      <div className={`status-indicator ${getStatusColor()}`}></div>
    </div>
  );
}

export default ConnectionStatus; 