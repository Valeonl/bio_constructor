import React from 'react';
import { useDrop } from 'react-dnd';

function EmptyDropZone({ onDrop }) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'puzzle-piece',
    drop: (item) => {
      console.log('Dropping first piece:', item);
      onDrop(0, item);
      return undefined;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  }), [onDrop]);

  return (
    <div
      ref={drop}
      className={`empty-canvas-drop-zone ${canDrop ? 'can-drop' : ''} ${isOver ? 'over' : ''}`}
      style={{
        border: isOver ? '2px dashed #4CAF50' : 'none',
        backgroundColor: isOver ? 'rgba(76, 175, 80, 0.1)' : 'transparent'
      }}
    />
  );
}

export default EmptyDropZone; 