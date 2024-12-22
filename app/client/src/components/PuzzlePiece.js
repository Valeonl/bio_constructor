import React, { useState, useRef, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import BlockSelectionMenu from './BlockSelectionMenu';

// Вспомогательные функции
const formatSeconds = (seconds) => `${seconds} сек`;

function PuzzlePiece({ id, type, title, icon, isDraggable, onDragStart, onDragEnd, onRemove, index, onDrop, availableBlocks, isInserting, onSetDuration, onEditCustom, duration: initialDuration }) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const blueSquareRef = useRef(null);
  const [showDurationInput, setShowDurationInput] = useState(false);
  const [showCustomEdit, setShowCustomEdit] = useState(false);
  const [duration, setDuration] = useState(initialDuration || 60);
  const [customTitle, setCustomTitle] = useState(title || '');
  const [customDescription, setCustomDescription] = useState('');
  const [tempDuration, setTempDuration] = useState(initialDuration?.toString() || '60');

  useEffect(() => {
    if (initialDuration) {
      setDuration(initialDuration);
      setTempDuration(initialDuration.toString());
    }
  }, [initialDuration]);

  useEffect(() => {
    console.log(`PuzzlePiece ${id} duration changed:`, {
      initialDuration,
      currentDuration: duration
    });
  }, [id, initialDuration, duration]);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'puzzle-piece',
    drop: (item) => {
      if (onDrop) {
        console.log('Dropping at blue square, index:', index);
        onDrop(index + 1, item, true);
      }
      return undefined;
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver() && !!monitor.canDrop()
    })
  }));

  const handleDurationClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setTempDuration(duration.toString());
    setShowDurationInput(true);
  };

  const handleDurationKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newDuration = parseInt(tempDuration, 10);
      if (newDuration > 0 && newDuration <= 3600) { // максимум 1 час
        setDuration(newDuration);
        if (onSetDuration) {
          onSetDuration(id, newDuration);
        }
        setShowDurationInput(false);
      } else {
        alert('Пожалуйста, введите значение от 1 до 3600 секунд');
      }
    } else if (e.key === 'Escape') {
      setShowDurationInput(false);
      setTempDuration(duration.toString());
    }
  };

  const handleDurationChange = (e) => {
    // Разрешаем только цифры
    const value = e.target.value.replace(/\D/g, '');
    setTempDuration(value);
  };

  const handleDurationBlur = () => {
    setTempDuration(duration.toString());
  };

  const handleClickOutside = (e) => {
    if (!e.target.closest('.duration-input')) {
      setShowDurationInput(false);
    }
  };

  useEffect(() => {
    if (showDurationInput) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDurationInput]);

  const handleCustomEdit = (e) => {
    e.stopPropagation();
    setShowCustomEdit(!showCustomEdit);
  };

  const handleCustomSave = () => {
    if (onEditCustom) {
      onEditCustom(id, { title: customTitle, description: customDescription });
    }
    setShowCustomEdit(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsRemoving(true);
    setTimeout(() => {
      if (onRemove) onRemove();
    }, 300);
  };

  const handleBlueSquareClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.top,
      left: rect.left - 250,
    });
    setShowMenu(true);
  };

  const handleBlockSelect = (block) => {
    if (onDrop) {
      onDrop(index + 1, block, true);
    }
  };

  const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
    type: 'puzzle-piece',
    item: () => {
      if (onDragStart) onDragStart();
      const dragItem = { id, type, title, icon, duration };
      console.log('Dragging item with duration:', dragItem);
      return dragItem;
    },
    end: () => {
      if (onDragEnd) onDragEnd();
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    canDrag: () => isDraggable
  }));

  drop(blueSquareRef);

  return (
    <div
      ref={dragPreview}
      className={`puzzle-piece ${isDragging ? 'dragging' : ''}`}
      data-type={type}
      data-id={id}
      data-removing={isRemoving || undefined}
    >
      <div ref={drag} className="drag-handle">
        {onRemove && (
          <button className="delete-button" onClick={handleDelete}>
            <i className="fas fa-times"></i>
          </button>
        )}
        <div 
          ref={blueSquareRef}
          className={`blue-square ${isOver ? 'over' : ''}`}
          onClick={handleBlueSquareClick}
        />
        {showMenu && (
          <BlockSelectionMenu
            blocks={availableBlocks}
            onSelect={handleBlockSelect}
            position={menuPosition}
            onClose={() => setShowMenu(false)}
          />
        )}
        <div className="piece-info">
          <div className="piece-icon">{icon}</div>
          <div className="piece-title">{title}</div>
          <div className="piece-duration">{formatSeconds(duration)}</div>
        </div>
        <div className="piece-controls">
          <button 
            className="duration-button" 
            onClick={handleDurationClick}
            title="Установить длительность"
          >
            <i className="fas fa-clock"></i>
          </button>
          {type === 'custom' && (
            <button 
              className="edit-button" 
              onClick={handleCustomEdit}
              title="Редактировать блок"
            >
              <i className="fas fa-edit"></i>
            </button>
          )}
        </div>

        {showDurationInput && (
          <div className="duration-input" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              value={tempDuration}
              onChange={handleDurationChange}
              onKeyDown={handleDurationKeyDown}
              onBlur={handleDurationBlur}
              placeholder="Секунды"
              autoFocus
            />
            <span>сек</span>
          </div>
        )}

        {showCustomEdit && type === 'custom' && (
          <div className="custom-edit-popup" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder="Название блока"
            />
            <textarea
              value={customDescription}
              onChange={e => setCustomDescription(e.target.value)}
              placeholder="Описание блока"
            />
            <button onClick={handleCustomSave}>Сохранить</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PuzzlePiece; 