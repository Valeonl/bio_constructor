import React, { useState, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import PuzzlePiece from './PuzzlePiece';
import PuzzleSlot from './PuzzleSlot';
import EmptyDropZone from './EmptyDropZone';
import './SessionConstructor.css';

const PUZZLE_PIECES = [
  {
    id: 'calm',
    type: 'calm',
    title: 'Спокойный этап',
    icon: '😌',
    description: 'Этап для расслабления и отдыха'
  },
  {
    id: 'tetris',
    type: 'tetris',
    title: 'Игра Тетрис',
    icon: '🟦',
    description: 'Классическая игра Тетрис'
  },
  {
    id: 'dino',
    type: 'dino',
    title: 'Игра Динозаврик',
    icon: '🦖',
    description: 'Игра в стиле Chrome Dino'
  },
  {
    id: 'custom',
    type: 'custom',
    title: 'Пользовательский блок',
    icon: 'cube',
    description: 'Создайте свой блок',
    duration: 60
  }
];

function SessionConstructor() {
  const [sessionPieces, setSessionPieces] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [customBlocks, setCustomBlocks] = useState([]);

  const filteredPieces = PUZZLE_PIECES.filter(piece => 
    piece.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDrop = (index, item, isInsertBetween = false) => {
    console.log('Dropping item:', item);

    const newPiece = {
      ...item,
      id: `${item.type}-${Date.now()}`,
      duration: item.duration || 60,
    };
    
    console.log('Created new piece:', newPiece);

    setSessionPieces(prevPieces => {
      const updatedPieces = [...prevPieces];
      
      // Создаем новый элемент с флагом анимации
      const newPiece = {
        ...item,
        id: `${item.type}-${Date.now()}`,
        isInserting: true // Устанавливаем флаг
      };

      if (isInsertBetween) {
        // Добавляем классы анимации к соседним блокам
        const slots = document.querySelectorAll('.puzzle-slot');
        slots.forEach((slot, i) => {
          if (i >= index) {
            slot.classList.add('shifting-right');
          }
        });

        // Вствляем элемент
        updatedPieces.splice(index, 0, newPiece);

        // Убираем классы анимации после её завершения
        setTimeout(() => {
          slots.forEach(slot => {
            slot.classList.remove('shifting-right');
          });
          // Убираем флаг анимации у нового блока
          const pieceElement = document.querySelector(`.puzzle-piece[data-id="${newPiece.id}"]`);
          if (pieceElement) {
            pieceElement.classList.remove('inserting');
          }
        }, 300);
      } else {
        // Обычное добавление в конец
        updatedPieces.push(newPiece);
      }

      // Убираем флаг isInserting через небольшую задержку
      setTimeout(() => {
        setSessionPieces(pieces => 
          pieces.map(piece => 
            piece.id === newPiece.id ? { ...piece, isInserting: false } : piece
          )
        );
      }, 300); // Время анимации

      return updatedPieces;
    });
  };

  const handleRemovePiece = (index) => {
    // Помечаем удаляемый элемент
    setSessionPieces(prevPieces => 
      prevPieces.map((piece, i) => 
        i === index ? { ...piece, isRemoving: true } : piece
      )
    );

    // Добавляем анимацию сдвига для блоков справа
    const slots = document.querySelectorAll('.puzzle-slot');
    slots.forEach((slot, i) => {
      if (i > index) {
        slot.classList.add('collapsing-left');
      }
    });

    // Ждем завершения анимации
    setTimeout(() => {
      setSessionPieces(prevPieces => {
        // Фильтруем удаляемый элемент и очищаем все флаги isRemoving
        const newPieces = prevPieces
          .filter((piece, i) => i !== index)
          .map(piece => ({
            ...piece,
            isRemoving: false // Очищаем флаг у всех элементов
          }));
        
        // Если удаляли начальный блок
        if (index === 0 && newPieces.length > 0) {
          newPieces[0] = {
            ...newPieces[0],
            isStart: true,
            isRemoving: false // Убеждаемся, что у нового начального блока нет флага
          };
        }

        return newPieces;
      });

      // Убираем классы анимации
      slots.forEach(slot => {
        slot.classList.remove('collapsing-left');
        const piece = slot.querySelector('.puzzle-piece');
        if (piece) {
          piece.removeAttribute('data-removing'); // Уираем атрибут
        }
      });
    }, 300);
  };

  const handleSetLastPiece = (index) => {
    const newPieces = sessionPieces.map((piece, i) => ({
      ...piece,
      isLast: i === index
    }));
    setSessionPieces(newPieces);
  };

  const handleResetSession = async () => {
    if (window.confirm('Вы уверены, что хотите сбросить сессию?')) {
      try {
        // Очищаем сессии в базе
        await fetch('http://localhost:5000/api/session/clear', {
          method: 'POST'
        });
        
        // Очищаем локальное состояние
        setSessionPieces([]);
        localStorage.removeItem('sessionPieces');
        
      } catch (error) {
        console.error('Ошибка при сбросе сессии:', error);
      }
    }
  };

  const handleSaveSession = async () => {
    try {
      const blocksWithDuration = sessionPieces.map(piece => {
        const defaultDuration = {
          'calm': 120,
          'tetris': 60,
          'dino': 60,
          'custom': 60
        };

        const duration = piece.duration || defaultDuration[piece.type] || 60;
        console.log(`Block ${piece.id} duration:`, {
          original: piece.duration,
          default: defaultDuration[piece.type],
          final: duration
        });

        return {
          ...piece,
          duration
        };
      });

      // Считаем общую длительность сессии
      const totalDuration = blocksWithDuration.reduce((sum, block) => sum + block.duration, 0);
      const minutes = Math.floor(totalDuration / 60);
      const seconds = totalDuration % 60;

      console.log('Сохранение сессии:');
      console.log('Блоки:', blocksWithDuration.map(block => ({
        type: block.type,
        title: block.title,
        duration: block.duration
      })));
      console.log(`Общая длительность: ${minutes} мин ${seconds} сек (${totalDuration} сек)`);

      const response = await fetch('http://localhost:5000/api/session/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          blocks: blocksWithDuration
        })
      });

      if (response.ok) {
        alert('Сессия успешно сохранена');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка при сохранении сессии');
      }
    } catch (error) {
      console.error('Ошбка:', error);
      alert('Не удалось сохранить сессию: ' + error.message);
    }
  };

  // Добавляем обработчик горячих клавиш
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl/Cmd + F
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault(); // Предотвращаем стандартное поведение
        const element = document.querySelector('.puzzle-slots');
        if (element) {
          const wrapper = document.querySelector('.canvas-container');
          const wrapperRect = wrapper.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          
          // Вычисляем центр
          const x = (wrapperRect.width - elementRect.width) / 2;
          const y = (wrapperRect.height - elementRect.height) / 2;
          
          // Применям трансформацию к TransformComponent
          const transformComponent = document.querySelector('.react-transform-component');
          if (transformComponent) {
            transformComponent.style.transform = `translate(${x}px, ${y}px) scale(1)`;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Добавляем эфект для инициализации
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  const centerContent = () => {
    const element = document.querySelector('.initial-drop-container') || 
                    document.querySelector('.puzzle-slots');
    if (element) {
      const wrapper = document.querySelector('.canvas-container');
      const wrapperRect = wrapper.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      // Вычисляем центр
      const x = (wrapperRect.width - elementRect.width) / 2;
      const y = (wrapperRect.height - elementRect.height) / 2;
      
      // Применяем трансформацию к TransformComponent
      const transformComponent = document.querySelector('.react-transform-component');
      if (transformComponent) {
        transformComponent.style.transform = `translate(${x}px, ${y}px)`;
      }
    }
  };

  // Сохраняем сессию при каждом изменении
  useEffect(() => {
    localStorage.setItem('sessionPieces', JSON.stringify(sessionPieces));
  }, [sessionPieces]);

  const handleSetDuration = async (pieceId, duration) => {
    console.log('Обновление длительности блока:', {
      pieceId,
      duration,
      block: sessionPieces.find(p => p.id === pieceId)
    });

    try {
      // Обновляем в БД
      const response = await fetch('http://localhost:5000/api/session/update-duration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          blockId: pieceId,
          duration: parseInt(duration)
        })
      });

      if (!response.ok) {
        throw new Error('Ошибка при обновлении длительности');
      }

      // Обновляем локальное состояние
      setSessionPieces(prev => prev.map(piece => 
        piece.id === pieceId 
          ? { ...piece, duration: parseInt(duration) } 
          : piece
      ));

    } catch (error) {
      console.error('Ошибка при обновлении длительности:', error);
    }
  };

  const handleEditCustom = (pieceId, { title, description }) => {
    setSessionPieces(prev => prev.map(piece => 
      piece.id === pieceId ? { ...piece, title, description } : piece
    ));
  };

  // Функция для создания нового пользовательского блока
  const handleCreateCustomBlock = () => {
    const newBlock = {
      id: `custom-${Date.now()}`,
      type: 'custom',
      title: 'Пользовательский блок',
      icon: '',
      duration: 60,
      isDraggable: true
    };
    
    setSessionPieces(prev => [...prev, newBlock]);
  };

  // Функция для обновления пользовательского блока
  const handleUpdateCustomBlock = (blockId, updates) => {
    setSessionPieces(prev => prev.map(piece => 
      piece.id === blockId ? { ...piece, ...updates } : piece
    ));
  };

  // Обновляем рендер доступных блоков
  const renderAvailableBlocks = () => {
    const standardBlocks = PUZZLE_PIECES.filter(piece => piece.type !== 'custom');
    return (
      <div className="available-pieces">
        <h3>Доступные элементы</h3>
        <div className="pieces-list">
          {standardBlocks.map(piece => (
            <PuzzlePiece
              key={piece.id}
              {...piece}
              isDraggable
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
              onSetDuration={handleSetDuration}
            />
          ))}
          <button 
            className="add-custom-block"
            onClick={handleCreateCustomBlock}
          >
            <i className="fas fa-plus"></i>
            <span>Добавить блок</span>
          </button>
        </div>
      </div>
    );
  };

  // Добавляем эффект для загрузки сессии при монтировании компонента
  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/session/active');
        const data = await response.json();
        
        if (data.session && data.session.blocks) {
          // Преобразуем блоки из БД в формат для sessionPieces
          const pieces = data.session.blocks.map(block => ({
            id: `${block.type}-${block.id}`,
            type: block.type,
            title: block.name,
            icon: getBlockIcon(block.type),
            duration: block.duration,
            isLast: block.is_last
          }));
          
          setSessionPieces(pieces);
        } else {
          // Если сессии нет - очищаем состояние
          setSessionPieces([]);
          localStorage.removeItem('sessionPieces');
        }
      } catch (error) {
        console.error('Ошибка при загрузке сессии:', error);
        setSessionPieces([]);
      }
    };

    loadSession();
  }, []); // Загружаем один раз при монтировании

  // Добавляем вспомогательную функцию для получения иконки
  const getBlockIcon = (type) => {
    switch (type) {
      case 'calm': return '😌';
      case 'tetris': return '🟦';
      case 'dino': return '🦖';
      default: return '📦';
    }
  };

  return (
    <div className="session-constructor-wrapper">
      <div className="session-constructor">
        {/* Левая панель */}
        <div className="sidebar">
          <div className="search-container">
            <input
              type="text"
              placeholder="Поиск элементов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          
          {renderAvailableBlocks()}
        </div>

        {/* Правая панель с холстом */}
        <div className={`canvas-container ${sessionPieces.some(piece => piece.isLast) ? 'session-ended' : ''} ${isDragging ? 'is-dragging' : ''}`}>
          {sessionPieces.length === 0 && isInitialized && (
            <div className={`empty-slot-hint ${isDragging ? 'dragging' : ''}`}>
              {isDragging ? 
                "Отпустите, чтобы создать начал�� цепочки" : 
                "Перетащите элемент, чтобы начать"
              }
            </div>
          )}
          
          {sessionPieces.some(piece => piece.isLast) && isDragging && (
            <div className="session-end-warning">
              Формирование сессии окончено. 
              <br />
              Уберите финальный блок, если хотите продолжить формирование сессии
            </div>
          )}
          
          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={2}
            centerOnInit={true}
            alignmentAnimation={{ disabled: true }}
            limitToBounds={false}
            panning={{ disabled: isDragging }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="canvas-controls">
                  <button onClick={() => zoomIn()}>+</button>
                  <button onClick={() => zoomOut()}>-</button>
                  <button onClick={() => {
                    resetTransform();
                    centerContent();
                  }}>Сбросить вид</button>
                </div>
                <TransformComponent>
                  <div className="canvas">
                    {sessionPieces.length > 0 ? (
                      <div className="puzzle-slots">
                        {sessionPieces.map((piece, index) => (
                          <PuzzleSlot
                            key={`slot-${index}`}
                            index={index}
                            piece={piece}
                            onDrop={handleDrop}
                            onRemove={handleRemovePiece}
                            onSetLast={handleSetLastPiece}
                            isLast={piece.isLast}
                            isStart={piece.isStart}
                            isDragging={isDragging}
                            hasLastPiece={sessionPieces.some(p => p.isLast)}
                            availableBlocks={PUZZLE_PIECES}
                          />
                        ))}
                        {!sessionPieces.some(piece => piece.isLast) && (
                          <PuzzleSlot
                            index={sessionPieces.length}
                            onDrop={handleDrop}
                            isEmpty
                            isDragging={isDragging}
                            hasLastPiece={sessionPieces.some(p => p.isLast)}
                            availableBlocks={PUZZLE_PIECES}
                          />
                        )}
                      </div>
                    ) : (
                      isInitialized && (
                        <div className="initial-drop-container">
                          <EmptyDropZone onDrop={handleDrop} />
                        </div>
                      )
                    )}
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        </div>

        {/* Копки управления сессией */}
        <div className="session-controls">
          <button 
            className="reset-button"
            onClick={handleResetSession}
          >
            Сбросить сессию
          </button>
          {sessionPieces.some(piece => piece.isLast) && (
            <>
              <button 
                className="save-button"
                onClick={handleSaveSession}
              >
                Сохранить сессию
              </button>
            </>
          )}
        </div>

        {/* Модальное окно */}
        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3>Состав сессии</h3>
              <div className="session-summary">
                {sessionPieces.map((piece, index) => (
                  <div key={piece.id} className="session-piece-summary">
                    <span className="piece-number">{index + 1}.</span>
                    {index === 0 ? (
                      <span className="piece-start">
                        <i className="fas fa-flag-checkered"></i>
                        <span>Нчало: {PUZZLE_PIECES.find(p => p.type === piece.type)?.title}</span>
                      </span>
                    ) : piece.isLast ? (
                      <span className="piece-end">
                        <i className="fas fa-flag"></i>
                        <span>Конец: {PUZZLE_PIECES.find(p => p.type === piece.type)?.title}</span>
                      </span>
                    ) : (
                      <span className="piece-middle">
                        <i className="fas fa-puzzle-piece"></i>
                        <span>{PUZZLE_PIECES.find(p => p.type === piece.type)?.title}</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => setShowModal(false)}>Закрыть</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SessionConstructor; 