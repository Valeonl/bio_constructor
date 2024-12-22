import React from 'react';
import './Widgets.css';

export const StressWidget = () => (
  <div className="widget stress-widget">
    <div className="widget-header">
      <i className="fas fa-brain"></i>
      <span>Уровень стресса</span>
    </div>
    <div className="widget-content">
      <div className="stress-meter">
        <div className="stress-level" style={{ width: '45%' }}></div>
      </div>
      <div className="stress-value">Средний</div>
    </div>
  </div>
); 