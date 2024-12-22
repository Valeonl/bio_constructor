import React, { useState, useRef, useEffect } from 'react';
import './BlockSelectionMenu.css';

function BlockSelectionMenu({ blocks, onSelect, position, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef(null);

  // Добавляем обработчик клика вне меню
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredBlocks = blocks.filter(block => 
    block.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div 
      ref={menuRef}
      className="block-selection-menu"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
      <div className="search-container">
        <input
          type="text"
          placeholder="Поиск блоков..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
          autoFocus
        />
      </div>
      <div className="blocks-list">
        {filteredBlocks.map(block => (
          <div 
            key={block.id}
            className="block-item"
            onClick={() => {
              onSelect(block);
              onClose();
            }}
          >
            <span className="block-icon">{block.icon}</span>
            <span className="block-title">{block.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BlockSelectionMenu; 