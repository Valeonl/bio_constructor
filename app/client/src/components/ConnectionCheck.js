import React, { useState, useEffect } from 'react';
import './ConnectionCheck.css';

function ConnectionCheck({ onSuccess, onRetry }) {
  const [timeLeft, setTimeLeft] = useState(10);
  const [isChecking, setIsChecking] = useState(true);
  const [hasConnection, setHasConnection] = useState(false);

  useEffect(() => {
    let timer;
    if (isChecking && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isChecking, timeLeft]);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/ecg');
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          setHasConnection(true);
          setIsChecking(false);
          onSuccess();
        }
      } catch (error) {
        console.error('Ошибка подключения:', error);
      }
    };

    if (isChecking) {
      const interval = setInterval(checkConnection, 1000);
      
      // Если за 10 секунд соединение не установлено
      setTimeout(() => {
        setIsChecking(false);
        clearInterval(interval);
      }, 10000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [isChecking, onSuccess]);

  if (!isChecking && !hasConnection) {
    return (
      <div className="connection-check">
        <div className="connection-error">
          <h2>Нет соединения с устройством ЭКГ</h2>
          <p>Пожалуйста, проверьте подключение и попробуйте снова</p>
          <button 
            className="retry-connection-button"
            onClick={() => {
              setTimeLeft(10);
              setIsChecking(true);
              if (onRetry) onRetry();
            }}
          >
            Повторить попытку подключения
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="connection-check">
      <div className="checking-connection">
        <h2>Проверка соединения с устройством ЭКГ</h2>
        <div className="loading-spinner"></div>
        <p>Подождите, идет проверка соединения... ({timeLeft}с)</p>
      </div>
    </div>
  );
}

export default ConnectionCheck; 