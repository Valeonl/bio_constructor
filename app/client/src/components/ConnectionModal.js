import React, { useState, useEffect } from 'react';
import './ConnectionModal.css';
import { ReactComponent as HeartIcon } from '../icon/heartbeat.svg';

function ConnectionModal({ onRetry, connectionStatus, connectionError, onClose }) {
  const [timeLeft, setTimeLeft] = useState(10);
  const [autoCloseTime, setAutoCloseTime] = useState(5);
  const [fadeOut, setFadeOut] = useState(false);
  const [isProgressAnimating, setIsProgressAnimating] = useState(false);

  useEffect(() => {
    if (connectionStatus === 'checking') {
      setTimeLeft(10);
    }
  }, [connectionStatus]);

  useEffect(() => {
    let timer;
    if (connectionStatus === 'checking' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleRetry();
    }
    return () => clearInterval(timer);
  }, [connectionStatus, timeLeft]);

  useEffect(() => {
    let timer;
    if (connectionStatus === 'connected') {
      setIsProgressAnimating(true);
      
      timer = setInterval(() => {
        setAutoCloseTime((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setFadeOut(true);
            setTimeout(() => {
            }, 1500);
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [connectionStatus]);

  const handleRetry = () => {
    setTimeLeft(10);
    onRetry();
  };

  const renderContent = () => {
    if (connectionError) {
      return (
        <>
          <h2 className="status-error">Не удалось связаться с оборудованием</h2>
          <p>Проверьте подключение устройства и попробуйте снова</p>
          <button 
            className="retry-button"
            onClick={handleRetry}
          >
            Повторить попытку подключения
          </button>
        </>
      );
    }

    switch (connectionStatus) {
      case 'checking':
        return (
          <>
            <h2>Проверка соединения с устройством ЭКГ</h2>
            <div className="loading-spinner"></div>
            <p>Подождите, проверяем соединение... ({timeLeft}с)</p>
          </>
        );
      case 'detected':
        return (
          <>
            <h2 className="status-detected">Обнаружен сигнал</h2>
            <div className="spinner-container">
              <div className="loading-spinner yellow"></div>
              <div className="heart-container">
                <HeartIcon className="heart-icon" />
              </div>
            </div>
            <p>Проверка стабильности соединения...</p>
          </>
        );
      case 'connected':
        return (
          <>
            <div className="modal-close-button" onClick={onClose}>×</div>
            <h2 className="status-connected">Устройство подключено</h2>
            <div className="check-mark"></div>
            <p>Соединение восстановлено</p>
            <div className="auto-close-progress">
              <div 
                className={`progress-bar ${isProgressAnimating ? 'animate' : ''}`}
              ></div>
            </div>
            <p className="auto-close-text">
              Окно закроется автоматически через {autoCloseTime} сек
            </p>
          </>
        );
      case 'lost':
        return (
          <>
            <h2>Потеряно соединение с устройством ЭКГ</h2>
            <p>Пожалуйста, проверьте подключение устройства</p>
            <button 
              className="retry-button"
              onClick={handleRetry}
            >
              Повторить подключение
            </button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`modal-overlay ${fadeOut ? 'fade-out' : ''}`}>
      <div className="modal-content">
        {renderContent()}
      </div>
    </div>
  );
}

export default ConnectionModal; 