import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useDrag, useDrop } from 'react-dnd';
import './DashboardTile.css';
import { HeartRateWidget } from './widgets/HeartRateWidget';
import { StressWidget } from './widgets/StressWidget';
import { RecordingWidget } from './widgets/RecordingWidget';
import { ECGWidget } from './widgets/ECGWidget';

const AVAILABLE_WIDGETS = [
  { id: 'heart-rate', title: 'Частота пульсаs', icon: 'heartbeat', color: '#ff4081' },
  { id: 'stress', title: 'Уровень стресса', icon: 'brain', color: '#7c4dff' },
  { id: 'ecg', title: 'ЭКГ Монитор', icon: 'wave-square', color: '#00bcd4' },
  { id: 'recording', title: 'Управление записью', icon: 'record-vinyl', color: '#4caf50' }
];

const DashboardTile = ({ index, widget, onSelect, onMove }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  const [{ isDragging }, drag] = useDrag({
    type: 'DASHBOARD_WIDGET',
    item: { index, widget },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'DASHBOARD_WIDGET',
    drop: (draggedItem) => {
      if (draggedItem.index !== index) {
        onMove(draggedItem.index, index);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const dragDropRef = (el) => {
    drag(el);
    drop(el);
  };

  const handleDoubleClick = () => {
    if (widget) {
      setShowResetModal(true);
    } else {
      setIsFlipped(true);
    }
  };

  const handleClick = () => {
    if (!isFlipped) {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 500);
    }
  };

  const handleWidgetSelect = (widget) => {
    onSelect(widget);
    setIsFlipped(false);
  };

  const handleReset = () => {
    setShowResetModal(false);
    onSelect(null);
  };

  if (widget) {
    return (
      <div 
        ref={dragDropRef}
        className={`dashboard-tile ${isDragging ? 'dragging' : ''} ${isOver ? 'over' : ''}`}
        style={{ opacity: isDragging ? 0.5 : 1 }}
        onDoubleClick={handleDoubleClick}
      >
        <div className="tile-content">
          {renderWidget(widget)}
          {showResetModal && (
            <div className="widget-reset-modal">
              <p>Желаете сбросить виджет?</p>
              <div className="buttons">
                <button 
                  className="confirm-btn"
                  onClick={handleReset}
                >
                  Да
                </button>
                <button 
                  className="cancel-btn"
                  onClick={() => setShowResetModal(false)}
                >
                  Нет
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={drop}
      className={`dashboard-tile empty ${isOver ? 'over' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleDoubleClick}
      onClick={handleClick}
      animate={{ scale: isHovered ? 1.02 : 1 }}
    >
      <motion.div 
        className="tile-content"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className={`tile-front ${isPulsing ? 'pulse' : ''}`}>
          <div className="tile-hint">
            <div className="mouse-icon"></div>
            <span>Нажмите два раза,<br />чтобы добавить виджет</span>
          </div>
        </div>
        <div className="tile-back">
          <h3>Выберите виджет</h3>
          <div className="widgets-grid">
            {AVAILABLE_WIDGETS.map(widget => (
              <motion.div
                key={widget.id}
                className="widget-option"
                whileHover={{ scale: 1.1 }}
                onClick={() => handleWidgetSelect(widget)}
                style={{ backgroundColor: widget.color }}
              >
                <i className={`fas fa-${widget.icon}`}></i>
                <span>{widget.title}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const renderWidget = (widget) => {
  switch (widget.id) {
    case 'heart-rate':
      return <HeartRateWidget />;
    case 'stress':
      return <StressWidget />;
    case 'recording':
      return <RecordingWidget />;
    case 'ecg':
      return <ECGWidget />;
    default:
      return null;
  }
};

export default DashboardTile; 