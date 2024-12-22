import React, { useState } from 'react';
import './Widgets.css';

export const RecordingWidget = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [filename, setFilename] = useState('session_001.ecg');

  return (
    <div className="widget recording-widget">
      <div className="widget-header">
        <i className="fas fa-record-vinyl"></i>
        <span>Запись сессии</span>
      </div>
      <div className="widget-content">
        <div className="file-input">
          <input 
            type="text" 
            value={filename} 
            onChange={(e) => setFilename(e.target.value)}
          />
        </div>
        <button 
          className={`record-button ${isRecording ? 'recording' : ''}`}
          onClick={() => setIsRecording(!isRecording)}
        >
          <i className="fas fa-circle"></i>
          <span>{isRecording ? 'Остановить' : 'Начать запись'}</span>
        </button>
      </div>
    </div>
  );
}; 