import React, { useState, useEffect } from 'react';
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
  const [isPreciseMode, setIsPreciseMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actualBPM, setActualBPM] = useState(0);

  // Загрузка начальных настроек
  useEffect(() => {
    fetchSettings();
  }, []);

  // Добавляем эффект для получения текущего значения пульса
  useEffect(() => {
    const fetchCurrentBPM = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/ecg');
        const data = await response.json();
        if (data && data.bpm) {
          setActualBPM(data.bpm);
        }
      } catch (error) {
        console.error('Ошибка при получении данных:', error);
      }
    };

    // Обновляем значение каждую секунду
    const interval = setInterval(fetchCurrentBPM, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/settings');
      const settings = await response.json();
      setIsSignalEnabled(settings.is_enabled);
      const pattern = PATTERNS.find(p => p.id === settings.pattern) || PATTERNS[0];
      setSelectedPattern(pattern);
      setCurrentBPM(settings.bpm);
    } catch (error) {
      console.error('Ошибка при получении настроек:', error);
    }
  };

  const updateSettings = async (newSettings) => {
    setIsSaving(true);
    try {
      await fetch('http://localhost:5000/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });
    } catch (error) {
      console.error('Ошибка при обновлении настроек:', error);
    }
    setIsSaving(false);
  };

  const handlePatternSelect = (pattern) => {
    setSelectedPattern(pattern);
    setCurrentBPM(pattern.bpmRange.min);
    setIsPreciseMode(false);
    updateSettings({
      pattern: pattern.id,
      bpm: pattern.bpmRange.min,
      precise_mode: false
    });
  };

  const handleSliderClick = () => {
    if (!isPreciseMode) {
      setIsPreciseMode(true);
      updateSettings({ 
        precise_mode: true,
        bpm: currentBPM 
      });
    }
  };

  const handleBPMChange = (e) => {
    const newBPM = Number(e.target.value);
    setCurrentBPM(newBPM);
    if (!isPreciseMode) {
      setIsPreciseMode(true);
      updateSettings({ 
        precise_mode: true,
        bpm: newBPM 
      });
    } else {
      updateSettings({ bpm: newBPM });
    }
  };

  const toggleSignal = () => {
    const newState = !isSignalEnabled;
    setIsSignalEnabled(newState);
    updateSettings({ is_enabled: newState });
  };

  const handlePreciseModeToggle = () => {
    const newPreciseMode = !isPreciseMode;
    setIsPreciseMode(newPreciseMode);
    
    if (newPreciseMode) {
      updateSettings({ 
        precise_mode: true,
        bpm: currentBPM 
      });
    } else {
      const avgBPM = Math.floor(
        (selectedPattern.bpmRange.min + selectedPattern.bpmRange.max) / 2
      );
      setCurrentBPM(avgBPM);
      updateSettings({ 
        precise_mode: false,
        bpm: avgBPM 
      });
    }
  };

  const getCurrentPattern = () => {
    if (isPreciseMode) {
      return "Ручная настройка";
    }
    return selectedPattern.name;
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
          <div className="precise-mode-toggle">
            <label>
              <input
                type="checkbox"
                className="heart-checkbox"
                checked={isPreciseMode}
                onChange={handlePreciseModeToggle}
              />
              <span></span>
              Точная настройка пульса
            </label>
          </div>
          <div className="slider-container">
            <input
              type="range"
              min={0}
              max={200}
              value={currentBPM}
              onChange={handleBPMChange}
              onClick={handleSliderClick}
              onMouseDown={handleSliderClick}
              className="bpm-slider"
              style={{ cursor: 'pointer' }}
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
            <span className="status-value">{getCurrentPattern()}</span>
          </div>
          <div className="status-item">
            <span>Текущий пульс:</span>
            <span className="status-value">{actualBPM} уд/мин</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignalControl; 