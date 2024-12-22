import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import ConnectionModal from '../components/ConnectionModal';

const ConnectionContext = createContext(null);

export function ConnectionProvider({ children }) {
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [connectionState, setConnectionState] = useState(() => {
    const savedState = localStorage.getItem('connectionState');
    return savedState || 'checking';
  });
  const [lastSuccessfulCheck, setLastSuccessfulCheck] = useState(() => {
    const savedCheck = localStorage.getItem('lastSuccessfulCheck');
    return savedCheck ? parseInt(savedCheck) : Date.now();
  });
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    localStorage.setItem('connectionState', connectionState);
  }, [connectionState]);

  useEffect(() => {
    localStorage.setItem('lastSuccessfulCheck', lastSuccessfulCheck.toString());
  }, [lastSuccessfulCheck]);

  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:5000/api/ecg');
      const data = await response.json();
      if (!data.data || data.data.length === 0) {
        throw new Error('Нет данных');
      }
      
      const currentTime = Date.now();
      const timeSinceLastSuccess = currentTime - lastSuccessfulCheck;
      
      setLastSuccessfulCheck(currentTime);
      setConnectionError(false);

      if (showConnectionModal) {
        if (connectionStatus === 'checking') {
          setConnectionStatus('detected');
          setTimeout(() => {
            setConnectionStatus('connected');
            setTimeout(() => {
              setShowConnectionModal(false);
              setConnectionStatus('checking');
            }, 5000);
          }, 5000);
        }
      }

      if (timeSinceLastSuccess > 10000) {
        setConnectionState('lost');
      } else if (timeSinceLastSuccess > 3000) {
        setConnectionState('unstable');
      } else {
        setConnectionState('stable');
      }
      
      return true;
    } catch (error) {
      console.error('Ошибка соединения:', error);
      const timeSinceLastSuccess = Date.now() - lastSuccessfulCheck;
      
      if (timeSinceLastSuccess <= 10000) {
        setConnectionState('unstable');
      } else {
        setConnectionState('lost');
        setConnectionError(true);
        if (!showConnectionModal) {
          setShowConnectionModal(true);
          setConnectionStatus('checking');
        }
      }
      return false;
    }
  }, [showConnectionModal, connectionStatus, lastSuccessfulCheck]);

  useEffect(() => {
    const connectionTimer = setInterval(() => {
      const timeSinceLastSuccess = Date.now() - lastSuccessfulCheck;
      if (timeSinceLastSuccess > 10000 && !showConnectionModal) {
        setShowConnectionModal(true);
        setConnectionStatus('checking');
      }
    }, 1000);

    const checkTimer = setInterval(checkConnection, 1000);
    
    return () => {
      clearInterval(connectionTimer);
      clearInterval(checkTimer);
    };
  }, [checkConnection, lastSuccessfulCheck, showConnectionModal]);

  const handleRetryConnection = () => {
    setConnectionStatus('checking');
    setConnectionError(false);
    checkConnection();
  };

  const value = {
    isConnected: !connectionError,
    connectionError,
    connectionState,
    checkConnection,
    handleRetryConnection
  };

  return (
    <ConnectionContext.Provider value={value}>
      {showConnectionModal && (
        <ConnectionModal 
          onRetry={handleRetryConnection}
          connectionStatus={connectionStatus}
          connectionError={connectionError}
          onClose={() => setShowConnectionModal(false)}
          key={connectionStatus}
        />
      )}
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within ConnectionProvider');
  }
  return context;
} 