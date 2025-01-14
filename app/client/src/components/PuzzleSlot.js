import React, { useRef } from 'react';
import { useDrop } from 'react-dnd';
import PuzzlePiece from './PuzzlePiece';

function PuzzleSlot({ index, piece, onDrop, onRemove, onSetLast, isLast, isStart, isEmpty, isDragging, availableBlocks, onSetDuration }) {
  const ref = useRef(null);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'puzzle-piece',
    canDrop: () => isEmpty || !piece,
    drop: (item) => {
      if (isEmpty || !piece) {
        console.log('Dropping at index:', index);
        onDrop(index, item);
      }
      return undefined;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver() && (isEmpty || !piece)
    })
  }));

  drop(ref);

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (!isStart) {
      const menu = document.createElement('div');
      menu.className = 'context-menu';
      menu.style.position = 'absolute';
      menu.style.left = `${e.pageX}px`;
      menu.style.top = `${e.pageY}px`;
      
      if (isLast) {
        const cancelLastOption = document.createElement('div');
        cancelLastOption.innerText = 'Отменить конец сессии';
        cancelLastOption.onclick = () => {
          onSetLast(-1);
          document.body.removeChild(menu);
        };
        menu.appendChild(cancelLastOption);
      } else {
        const setLastOption = document.createElement('div');
        setLastOption.innerText = 'Сделать последним в сессии';
        setLastOption.onclick = () => {
          onSetLast(index);
          document.body.removeChild(menu);
        };
        menu.appendChild(setLastOption);
      }

      document.body.appendChild(menu);

      const handleClickOutside = () => {
        if (document.body.contains(menu)) {
          document.body.removeChild(menu);
        }
        document.removeEventListener('click', handleClickOutside);
      };

      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
    }
  };

  return (
    <div
      ref={ref}
      className={`puzzle-slot ${isOver ? 'over' : ''} ${isEmpty ? 'empty' : ''} ${isLast ? 'last' : ''} ${isDragging && isEmpty ? 'show' : ''}`}
      onContextMenu={handleContextMenu}
    >
      {piece && (
        <PuzzlePiece 
          {...piece} 
          isDraggable={!isStart} 
          onRemove={() => onRemove(index)}
          index={index}
          onDrop={onDrop}
          availableBlocks={availableBlocks}
          isInserting={piece.isInserting || false}
          onSetDuration={onSetDuration}
          duration={piece.duration}
        />
      )}
    </div>
  );
}

export default PuzzleSlot; 