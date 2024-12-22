import React, { useState, useEffect } from 'react';
import { ReactComponent as HeartbeatIcon } from '../../../icon/heartbeat.svg';
import { ReactComponent as SkullIcon } from '../../../icon/skull.svg';
import { ReactComponent as LightningIcon } from '../../../icon/lightning.svg';
import './Widgets.css';

export const HeartRateWidget = () => {
  const [heartRate, setHeartRate] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let dataFetch;
    if (isActive) {
      dataFetch = setInterval(async () => {
        try {
          const response = await fetch('http://localhost:5000/api/ecg');
          const data = await response.json();
          
          if (data && data.bpm) {
            setHeartRate(data.bpm);
          }
        } catch (error) {
          console.error('Ошибка при получении данных:', error);
        }
      }, 1000);
    }
    return () => clearInterval(dataFetch);
  }, [isActive]);

  const getHeartRateStatus = (rate) => {
    if (rate < 40) return 'low';
    if (rate > 130) return 'high';
    return 'normal';
  };

  const status = getHeartRateStatus(heartRate);

  return (
    <div className={`widget heart-rate-widget ${status}`}>
      <div className="widget-header">
        <i className="fas fa-heartbeat"></i>
        <span>Частота пульса</span>
      </div>
      <div className="widget-content">
        <div className="heart-rate-display">
          <HeartbeatIcon 
            className={`heartbeat-icon ${heartRate ? 'pulse' : ''} ${status}`} 
          />
          <div className={`heart-rate-value ${status}`}>
            {heartRate}
            <span className="heart-rate-unit">уд/мин</span>
            {heartRate < 40 && <SkullIcon className="status-icon skull" />}
            {heartRate > 130 && <LightningIcon className="status-icon lightning" />}
          </div>
        </div>
        <div className="heart-rate-status">
          {heartRate < 40 && <span className="status low">Критически низкий пульс</span>}
          {heartRate > 130 && <span className="status high">Критически высокий пульс</span>}
          {heartRate >= 40 && heartRate <= 130 && <span className="status normal">Нормальный пульс</span>}
        </div>
      </div>
    </div>
  );
}; 