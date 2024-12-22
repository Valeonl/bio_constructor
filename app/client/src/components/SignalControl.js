import React, { useState } from 'react';
import './SignalControl.css';

const PATTERNS = [
  {
    id: 'calm',
    name: 'Спокойный',
    icon: '😌',
    bpmRange: { min: 60, max: 80 },
    description: 'Нормальный сердечный ритм в состоянии покоя'
  },
  {
    id: 'medium',
    name: 'Умеренный',
    icon: '😅',
    bpmRange: { min: 81, max: 120 },
    description: 'Повышенный ритм при физической нагрузке'
  },
  {
    id: 'extreme',
    name: 'Экстремальный',
    icon: '😰',
    bpmRange: { min: 121, max: 180 },
    description: 'Учащенный ритм при интенсивной нагрузке'
  }
];

function SignalControl() {
  const [isSignalEnabled, setIsSignalEnabled] = useState(true);
  const [selectedPattern, setSelectedPattern] = useState(PATTERNS[0]);
  const [currentBPM, setCurrentBPM] = useState(PATTERNS[0].bpmRange.min);

  const handlePatternSelect = (pattern) => {
    setSelectedPattern(pattern);
    setCurrentBPM(pattern.bpmRange.min);
  };

  const handleBPMChange = (e) => {
    setCurrentBPM(Number(e.target.value));
  };

  const toggleSignal = () => {
    setIsSignalEnabled(!isSignalEnabled);
  };

  return (
    <div className="signal-control">
      <h1>Моделирование сигнала ЭКГ</h1>
      
      <div className="control-panel">
        <div className="signal-toggle">
          <button 
            className={`toggle-button ${isSignalEnabled ? 'active' : ''}`}
            onClick={toggleSignal}
          >
            <div className="toggle-slider"></div>
            <span>{isSignalEnabled ? 'Сигнал включен' : 'Сигнал выключен'}</span>
          </button>
        </div>

        <div className="patterns-container">
          <h2>Паттерны сигнала</h2>
          <div className="pattern-cards">
            {PATTERNS.map(pattern => (
              <div 
                key={pattern.id}
                className={`pattern-card ${selectedPattern.id === pattern.id ? 'selected' : ''}`}
                onClick={() => handlePatternSelect(pattern)}
              >
                <div className="pattern-icon">{pattern.icon}</div>
                <h3>{pattern.name}</h3>
                <p className="pattern-bpm">{pattern.bpmRange.min}-{pattern.bpmRange.max} уд/мин</p>
                <p className="pattern-description">{pattern.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bpm-control">
          <h2>Настройка пульса</h2>
          <div className="slider-container">
            <input
              type="range"
              min={selectedPattern.bpmRange.min}
              max={selectedPattern.bpmRange.max}
              value={currentBPM}
              onChange={handleBPMChange}
              className="bpm-slider"
            />
            <div className="bpm-value">
              {currentBPM} <span>уд/мин</span>
            </div>
          </div>
        </div>
      </div>

      <div className="current-status">
        <h2>Текущее состояние</h2>
        <div className="status-info">
          <div className="status-item">
            <span>Статус:</span>
            <span className={`status-value ${isSignalEnabled ? 'active' : ''}`}>
              {isSignalEnabled ? 'Активен' : 'Неактивен'}
            </span>
          </div>
          <div className="status-item">
            <span>Паттерн:</span>
            <span className="status-value">{selectedPattern.name}</span>
          </div>
          <div className="status-item">
            <span>Текущий пульс:</span>
            <span className="status-value">{currentBPM} уд/мин</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignalControl; 