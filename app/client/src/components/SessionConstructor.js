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
    icon: '🔧',
    description: 'Настраиваемый блок для произвольных действий'
  }
];

function SessionConstructor() {
  const [sessionPieces, setSessionPieces] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [customBlocks, setCustomBlocks] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saving'); // 'saving', 'success', 'error'
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStatus, setResetStatus] = useState('confirming'); // 'confirming', 'resetting', 'success', 'error'
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isSessionSaved, setIsSessionSaved] = useState(false);

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
    if (!showResetModal) {
      setShowResetModal(true);
      return;
    }

    if (resetStatus === 'confirming') {
      setResetStatus('resetting');
      
      try {
        // Отправляем запрос на очистку всей таблицы сессий
        const response = await fetch('http://localhost:5000/api/session/clear', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Ошибка при очистке сессий');
        }

        // Очищаем локальное состояние
        setSessionPieces([]);
        setCurrentSessionId(null);
        setIsSessionSaved(false);
        setResetStatus('success');
        
        setTimeout(() => {
          const overlay = document.querySelector('.reset-modal-overlay');
          if (overlay) {
            overlay.classList.add('fade-out');
          }
          
          setTimeout(() => {
            setShowResetModal(false);
            setResetStatus('confirming');
          }, 300);
        }, 1000);

      } catch (error) {
        console.error('Ошибка при сбросе сессии:', error);
        setResetStatus('error');
        
        setTimeout(() => {
          const overlay = document.querySelector('.reset-modal-overlay');
          if (overlay) {
            overlay.classList.add('fade-out');
          }
          
          setTimeout(() => {
            setShowResetModal(false);
            setResetStatus('confirming');
          }, 300);
        }, 1000);
      }
    }
  };

  const handleSaveSession = async () => {
    setShowSaveModal(true);
    setSaveStatus('saving');
    
    try {
      // Добавим отладочный вывод текущего состояния
      console.log('Текущее состояние sessionPieces:', sessionPieces);

      const sessionData = {
        session_id: currentSessionId,
        blocks: sessionPieces.map(piece => {
          // Добавим отладочный вывод для каждого блока
          console.log('Обработка блока:', {
            id: piece.id,
            type: piece.type,
            currentDuration: piece.duration
          });

          return {
            type: piece.type,
            duration: piece.duration, // Используем значение напрямую без parseInt
            is_last: piece.isLast || false,
            name: PUZZLE_PIECES.find(p => p.type === piece.type)?.title || ''
          };
        })
      };

      console.log('Подготовленные данные для отправки:', sessionData);

      const response = await fetch('http://localhost:5000/api/session/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(sessionData)
      });

      console.log('Статус ответа:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Ошибка от сервера:', errorData);
        throw new Error(errorData.message || 'Ошибка при сохранении сессии');
      }

      const data = await response.json();
      console.log('Ответ сервера:', data);
      
      // Если получили ID - сохраняем его и помечаем сессию как сохраненную
      if (data.session && data.session.id) {
        setCurrentSessionId(data.session.id);
        setIsSessionSaved(true);
        
        // Обновляем блоки, сохраняя текущие значения длительности
        setSessionPieces(prev => prev.map(piece => ({
          ...piece,
          sessionId: data.session.id,
          duration: piece.duration // Сохраняем текущую длительность
        })));
      }

      setSaveStatus('success');
      
      setTimeout(() => {
        const overlay = document.querySelector('.save-modal-overlay');
        if (overlay) {
          overlay.classList.add('fade-out');
        }
        
        setTimeout(() => {
          setShowSaveModal(false);
        }, 300);
      }, 1000);

    } catch (error) {
      console.error('Ошибка при сохранении сессии:', error);
      setSaveStatus('error');
      setTimeout(() => {
        const overlay = document.querySelector('.save-modal-overlay');
        if (overlay) {
          overlay.classList.add('fade-out');
        }
        
        setTimeout(() => {
          setShowSaveModal(false);
        }, 300);
      }, 1000);
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
    console.log('handleSetDuration вызван с:', { pieceId, duration });
    
    try {
      // Обновляем локальное состояние
      setSessionPieces(prev => {
        const newPieces = prev.map(piece => 
          piece.id === pieceId 
            ? { ...piece, duration: parseInt(duration) } 
            : piece
        );
        console.log('Обновленное состояние sessionPieces:', newPieces);
        return newPieces;
      });

      // Если есть ID сессии - отправляем обновление на сервер
      if (currentSessionId) {
        const response = await fetch(`http://localhost:5000/api/session/${currentSessionId}/update-block`, {
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
      }
    } catch (error) {
      console.error('Ошибка при обновлении длительности:', error);
    }
  };

  const handleEditCustom = (pieceId, { title, description }) => {
    setSessionPieces(prev => prev.map(piece => 
      piece.id === pieceId ? { ...piece, title, description } : piece
    ));
  };

  // Обновляем рендер доступных блоков
  const renderAvailableBlocks = () => {
    return (
      <div className="available-pieces">
        <h3>Доступные элементы</h3>
        <div className="pieces-list">
          {PUZZLE_PIECES.map(piece => (
            <PuzzlePiece
              key={piece.id}
              {...piece}
              isDraggable
              onDragStart={() => setIsDragging(true)}
              onDragEnd={() => setIsDragging(false)}
              onSetDuration={handleSetDuration}
            />
          ))}
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
      case 'custom': return '🔧';
      default: return '';
    }
  };

  // Обновляем функцию fetchSessionInfo
  const fetchSessionInfo = async () => {
    // Проверяем наличие блоков вместо проверки ID
    if (sessionPieces.length === 0) {
      setSessionInfo({ error: 'Сессия пуста' });
      return;
    }

    setIsLoadingInfo(true);
    try {
      // Получаем активную сессию
      const response = await fetch('http://localhost:5000/api/session/active');
      if (!response.ok) {
        throw new Error('Ошибка при получении информации о сессии');
      }
      const data = await response.json();
      
      // Преобразуем данные в нужный формат
      const sessionInfo = {
        id: data.session.id,
        blocks: data.session.blocks.map(block => ({
          type: block.type,
          duration: block.duration,
          isLast: block.is_last
        })),
        totalDuration: data.session.blocks.reduce((sum, block) => sum + block.duration, 0)
      };
      
      setSessionInfo(sessionInfo);
      
      // Сохраняем ID сессии если его нет
      if (!currentSessionId) {
        setCurrentSessionId(data.session.id);
      }

    } catch (error) {
      console.error('Ошибка при загрузке информации:', error);
      setSessionInfo({ error: error.message });
    } finally {
      setIsLoadingInfo(false);
    }
  };

  // Добавляем обработчик открытия модального окна
  const handleInfoClick = () => {
    setShowInfoModal(true);
    fetchSessionInfo();
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
                "Отпустите, чтобы создать начало цепочки" : 
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
                  <button onClick={() => zoomOut()}>−</button>
                  <button 
                    onClick={() => {
                      resetTransform();
                      centerContent();
                    }}
                  >
                    Сбросить
                  </button>
                </div>

                {/* Отдельная кнопка информации */}
                <button 
                  className="info-button"
                  onClick={handleInfoClick}
                >
                  <i className="fas fa-info-circle"></i>
                </button>

                {currentSessionId && (
                  <div className="session-id-display">
                    ID сессии: {currentSessionId}
                  </div>
                )}

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
                            onSetDuration={handleSetDuration}
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
          {sessionPieces.length > 0 && (
            <button 
              className="reset-button"
              onClick={handleResetSession}
            >
              Сбросить сессию
            </button>
          )}
          {sessionPieces.some(piece => piece.isLast) && (
            <button 
              className={`save-button ${isSessionSaved ? 'update' : 'create'}`}
              onClick={handleSaveSession}
            >
              {isSessionSaved ? 'Обновить данные сессии' : 'Создать сессию'}
            </button>
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

        {showSaveModal && (
          <div className="save-modal-overlay">
            <div className="save-modal">
              {saveStatus === 'saving' && (
                <>
                  <div className="save-spinner"></div>
                  <p>{isSessionSaved ? 'Обновление сессии...' : 'Создание сессии...'}</p>
                </>
              )}
              {saveStatus === 'success' && (
                <>
                  <div className="save-success">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <p>{isSessionSaved ? 'Сессия успешно обновлена' : 'Сессия успешно создана'}</p>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <div className="save-error">
                    <i className="fas fa-exclamation-circle"></i>
                  </div>
                  <p>Ошибка при {isSessionSaved ? 'обновлении' : 'создании'} сессии</p>
                </>
              )}
            </div>
          </div>
        )}

        {showResetModal && (
          <div className="reset-modal-overlay">
            <div className="reset-modal">
              {resetStatus === 'confirming' && (
                <>
                  <div className="reset-warning">
                    <i className="fas fa-exclamation-triangle"></i>
                  </div>
                  <p className="reset-message">Вы уверены, что хотите сбросить сессию?</p>
                  <p className="reset-submessage">Это действие нельзя будет отменить</p>
                  <div className="reset-buttons">
                    <button 
                      className="cancel-button"
                      onClick={() => setShowResetModal(false)}
                    >
                      Отмена
                    </button>
                    <button 
                      className="confirm-button"
                      onClick={() => handleResetSession()}
                    >
                      <i className="fas fa-trash-alt"></i>
                      Сбросить
                    </button>
                  </div>
                </>
              )}
              {resetStatus === 'resetting' && (
                <>
                  <div className="save-spinner"></div>
                  <p>Сброс сессии...</p>
                </>
              )}
              {resetStatus === 'success' && (
                <>
                  <div className="save-success">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <p>Сессия успешно сброшена</p>
                </>
              )}
              {resetStatus === 'error' && (
                <>
                  <div className="save-error">
                    <i className="fas fa-exclamation-circle"></i>
                  </div>
                  <p>Ошибка при сбросе сессии</p>
                </>
              )}
            </div>
          </div>
        )}

        {showInfoModal && (
          <div className="info-modal-overlay">
            <div className="info-modal">
              <div className="info-modal-header">
                <h3>Информация о сессии</h3>
                <button 
                  className="close-button"
                  onClick={() => setShowInfoModal(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="info-modal-content">
                {isLoadingInfo ? (
                  <div className="info-loading">
                    <div className="spinner"></div>
                    <p>Загрузка информации...</p>
                  </div>
                ) : sessionInfo?.error ? (
                  <div className="info-error">
                    <i className="fas fa-exclamation-circle"></i>
                    <p>{sessionInfo.error}</p>
                  </div>
                ) : sessionInfo && sessionInfo.blocks ? (
                  <>
                    <div className="session-id">
                      ID сессии: {sessionInfo.id}
                    </div>
                    <div className="blocks-info">
                      <h4>Блоки сессии:</h4>
                      {sessionInfo.blocks.map((block, index) => (
                        <div key={index} className="block-info">
                          <div className="block-icon">
                            {getBlockIcon(block.type)}
                          </div>
                          <div className="block-details">
                            <span className="block-title">
                              {PUZZLE_PIECES.find(p => p.type === block.type)?.title}
                            </span>
                            <span className="block-duration">
                              {block.duration} сек
                            </span>
                          </div>
                          {block.isLast && (
                            <div className="last-block-badge">
                              Финальный блок
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="total-duration">
                      Общая длительность: {sessionInfo.totalDuration} сек 
                      ({Math.floor(sessionInfo.totalDuration / 60)} мин {sessionInfo.totalDuration % 60} сек)
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SessionConstructor; 