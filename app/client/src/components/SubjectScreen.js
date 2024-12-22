import React, { useState, useEffect } from 'react';
import { ReactComponent as HeartbeatIcon } from '../icon/heartbeat.svg';
import { ReactComponent as SkullIcon } from '../icon/skull.svg';
import { ReactComponent as LightningIcon } from '../icon/lightning.svg';
import { useConnection } from '../context/ConnectionContext';
import './SubjectScreen.css';

// Импортируем аватарки
import { ReactComponent as CatAvatar } from '../avatars/cat.svg';
import { ReactComponent as DogAvatar } from '../avatars/dog.svg';
import { ReactComponent as FishAvatar } from '../avatars/fish.svg';
import { ReactComponent as BirdAvatar } from '../avatars/bird.svg';
import { ReactComponent as RabbitAvatar } from '../avatars/rabbit.svg';

const AVATARS = [
  { id: 'cat', component: CatAvatar, name: 'Котик' },
  { id: 'dog', component: DogAvatar, name: 'Собачка' },
  { id: 'fish', component: FishAvatar, name: 'Рыбка' },
  { id: 'bird', component: BirdAvatar, name: 'Птичка' },
  { id: 'rabbit', component: RabbitAvatar, name: 'Кролик' }
];

function RegistrationForm({ onSubmit }) {
  const [fullName, setFullName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Пожалуйста, введите ФИО');
      return;
    }
    if (!selectedAvatar) {
      setError('Пожалуйста, выберите аватар');
      return;
    }
    onSubmit({ fullName, avatar: selectedAvatar });
  };

  return (
    <div className="registration-container">
      <h2>Добро пожаловать!</h2>
      <p className="registration-desc">
        Пожалуйста, представьтесь и выберите аватар для участия в исследовании
      </p>
      
      <form onSubmit={handleSubmit} className="registration-form">
        <div className="form-group">
          <label>Ваше ФИО:</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Иванов Иван Иванович"
            className={error && !fullName ? 'error' : ''}
          />
        </div>

        <div className="avatars-container">
          <label>Выберите аватар:</label>
          <div className="avatars-grid">
            {AVATARS.map(avatar => (
              <div
                key={avatar.id}
                className={`avatar-option ${selectedAvatar === avatar.id ? 'selected' : ''}`}
                onClick={() => setSelectedAvatar(avatar.id)}
              >
                <avatar.component />
                <span>{avatar.name}</span>
              </div>
            ))}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" className="submit-button">
          Начать участие
        </button>
      </form>
    </div>
  );
}

function SubjectScreen() {
  const [step, setStep] = useState('loading');
  const [fullName, setFullName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [error, setError] = useState('');
  const [sessionState, setSessionState] = useState('waiting'); // 'waiting', 'ready', 'running', 'finished'
  const [currentBlock, setCurrentBlock] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionBlocks, setSessionBlocks] = useState([]);
  const [heartRate, setHeartRate] = useState(0);
  const [isStopped, setIsStopped] = useState(false);
  const [stopReason, setStopReason] = useState(null);
  const { checkConnection, connectionState } = useConnection();
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Подписываемся на обновления состояния сессии
    const checkSessionStatus = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:5000/api/session/status');
        const data = await response.json();
        
        if (data.state === 'ready' && sessionState === 'waiting') {
          setSessionState('ready');
          setSessionBlocks(data.blocks);
        } else if (data.state === 'running' && sessionState === 'ready') {
          setSessionState('running');
          startSession(data.blocks);
        }
      } catch (error) {
        console.error('Error checking session status:', error);
      }
    }, 1000);

    return () => clearInterval(checkSessionStatus);
  }, [sessionState]);

  useEffect(() => {
    let timer;
    if (sessionState === 'running' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setSessionState('finished');
    }
    return () => clearInterval(timer);
  }, [sessionState, timeLeft]);

  useEffect(() => {
    let dataFetch;
    if (sessionState === 'running') {
      dataFetch = setInterval(async () => {
        try {
          const response = await fetch('http://localhost:5000/api/ecg');
          const data = await response.json();
          
          // Используем bpm напрямую из ответа сервера
          if (data && data.bpm) {
            setHeartRate(data.bpm);
          }
        } catch (error) {
          console.error('Ошибка при получении данных:', error);
        }
      }, 1000);
    }
    return () => clearInterval(dataFetch);
  }, [sessionState]);

  useEffect(() => {
    if (connectionState === 'lost') {
      setSessionState('finished');
      setIsStopped(true);
      setHeartRate(0);
      setStopReason('connection');
    }
  }, [connectionState]);

  const startSession = (blocks) => {
    const runBlock = async (index) => {
      if (index >= blocks.length) {
        // Сессия завершена
        setSessionState('finished');
        await updateStatus('finished_session');
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
        return;
      }

      const block = blocks[index];
      setCurrentBlock(block);
      
      // Используем duration из блока
      const blockDuration = block.duration || 60; // 60 секунд по умолчанию, если duration не задан
      console.log(`Запуск блока ${index + 1}/${blocks.length}:`, {
        type: block.type,
        duration: blockDuration
      });
      
      setTimeLeft(blockDuration);
      setCurrentBlockIndex(index);

      // Запускаем таймер для текущего блока
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Показываем анимацию перехода
            setIsTransitioning(true);
            setTimeout(() => {
              setIsTransitioning(false);
              // Запускаем следующий блок
              runBlock(index + 1);
            }, 1000);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    // Выводим информацию о всей сессии
    const totalDuration = blocks.reduce((sum, block) => sum + (block.duration || 60), 0);
    const minutes = Math.floor(totalDuration / 60);
    const seconds = totalDuration % 60;
    console.log('Начало сессии:', {
      totalBlocks: blocks.length,
      totalDuration: totalDuration,
      formattedDuration: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      blocks: blocks.map(block => ({
        type: block.type,
        duration: block.duration || 60
      }))
    });

    // Начинаем с первого блока
    runBlock(0);
  };

  const updateStatus = async (status) => {
    try {
      await fetch('http://localhost:5000/api/subjects/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error);
    }
  };

  // Добавим стили для анимации перехода
  const blockStyles = {
    opacity: isTransitioning ? 0 : 1,
    transform: isTransitioning ? 'scale(0.9)' : 'scale(1)',
    transition: 'all 0.5s ease'
  };

  const getBlockIcon = (type) => {
    switch (type) {
      case 'calm':
        return 'heart';
      case 'tetris':
        return 'th-large';
      case 'dino':
        return 'dragon';
      default:
        return 'question';
    }
  };

  const getBlockTitle = (type) => {
    switch (type) {
      case 'calm':
        return 'Спокойный этап';
      case 'tetris':
        return 'Игра Тетрис';
      case 'dino':
        return 'Игра Динозаврик';
      default:
        return 'Неизвестный этап';
    }
  };

  const renderSessionContent = () => {
    switch (step) {
      case 'waiting':
        return (
          <div className="waiting-screen">
            <h2>Ожидание подготовки сессии</h2>
            <p>Пожалуйста, подождите. Исследователь готовит сессию...</p>
            <div className="loading-spinner"></div>
          </div>
        );

      case 'ready':
        return (
          <div className="ready-screen">
            <h2>Сессия подготовлена</h2>
            <p>Вы можете начать сессию</p>
            <div className="session-preview">
              {sessionBlocks.map((block, index) => (
                <div key={index} className="block-preview">
                  <i className={`fas fa-${getBlockIcon(block.type)}`}></i>
                  <span>{getBlockTitle(block.type)}</span>
                  <span className="block-duration">{formatDuration(block.duration || 60)}</span>
                </div>
              ))}
              <div className="session-total">
                Общая длительность: {formatDuration(sessionBlocks.reduce((sum, block) => sum + (block.duration || 60), 0))}
              </div>
            </div>
            <button 
              className="start-session-button"
              onClick={() => handleStartSession()}
            >
              <i className="fas fa-play"></i>
              Начать сессию
            </button>
          </div>
        );

      case 'running':
        return (
          <div className="session-block" style={blockStyles}>
            <div className="timer">{formatTime(timeLeft)}</div>
            <div className="block-content">
              {currentBlock && (
                <>
                  <div className="block-header">
                    <span className="block-number">Блок {currentBlockIndex + 1}</span>
                    <h2>{currentBlock.title}</h2>
                  </div>
                  <i className={`fas fa-${getBlockIcon(currentBlock.type)}`}></i>
                  <h2>{getBlockTitle(currentBlock.type)}</h2>
                  {currentBlock.type === 'calm' ? (
                    <p>Пожалуйста, сохраняйте спокойствие...</p>
                  ) : (
                    <p>Этап: {getBlockTitle(currentBlock.type)}</p>
                  )}
                </>
              )}
            </div>
          </div>
        );

      case 'finished':
        return (
          <div className="finished-screen">
            <h2>Сессия завершена</h2>
            <p>Спасибо за участие!</p>
            <div className="redirect-message">
              Перенаправление на главную страницу...
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const startMeasurement = () => {
    setSessionState('ready');
    setIsStopped(false);
    setStopReason(null);
  };

  const stopMeasurement = () => {
    setSessionState('finished');
    setIsStopped(true);
    setStopReason('user');
  };

  const resetMeasurement = () => {
    setTimeLeft(0);
    setHeartRate(0);
    setIsStopped(false);
    setSessionState('ready');
    setStopReason(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConsent = async () => {
    localStorage.setItem('subjectConsent', 'true');
    
    try {
      const response = await fetch('http://localhost:5000/api/subjects/accept-consent', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to update consent status');
      }
      
      setStep('measurement');
      await checkConnection();
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error);
    }
  };

  const getHeartRateStatus = (rate) => {
    if (rate < 40) return 'low';
    if (rate > 130) return 'high';
    return 'normal';
  };

  const handleRegistration = async (data) => {
    if (!data.fullName.trim()) {
      setError('Пожалуйста, введите ФИО');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/subjects/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: data.fullName,
          avatar: data.avatar
        }),
      });

      if (response.ok) {
        setFullName(data.fullName);
        setAvatar(data.avatar);
        await fetch('http://localhost:5000/api/subjects/start-consent', {
          method: 'POST'
        });
        setStep('info');
      } else {
        setError('Ошибка регистрации');
      }
    } catch (error) {
      setError('Ошибка соединения с сервером');
    }
  };

  const handleReset = async () => {
    try {
      // Обновляем статус на finished_session
      await fetch('http://localhost:5000/api/subjects/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'finished_session'
        })
      });
      
      // Перенаправляем на главную страницу
      window.location.href = '/';
      
    } catch (error) {
      console.error('Ошибка при сбросе:', error);
    }
  };

  // Проверяем статус при загрузке
  useEffect(() => {
    const checkFinishedStatus = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/subjects/current-state');
        const data = await response.json();
        
        if (data.step === 'finished') {
          // Если сессия завершена - перенаправляем на главную
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Ошибка пр проверке статуса:', error);
      }
    };

    checkFinishedStatus();
  }, []);

  // Загрузка текущего состояния при монтировании
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Сначала отмечаем вход
        await fetch('http://localhost:5000/api/subjects/enter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Затем получаем текущее состояние
        const response = await fetch('http://localhost:5000/api/subjects/current-state');
        const data = await response.json();
        
        if (response.ok) {
          setStep(data.step);
          if (data.fullName) setFullName(data.fullName);
          if (data.avatar) setAvatar(data.avatar);
        } else {
          setStep('registration');
        }
      } catch (error) {
        console.error('Ошибка при инициализации:', error);
        setStep('registration');
      }
    };

    initializeSession();
  }, []);

  // Добавляем периодическую проверку текущего состояния
  useEffect(() => {
    const checkCurrentState = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/subjects/current-state');
        const data = await response.json();
        
        if (data.step !== step) {
          setStep(data.step);
          if (data.fullName) setFullName(data.fullName);
          if (data.avatar) setAvatar(data.avatar);
        }

        // Если статус ready_to_start, загружаем информацию о сессии
        if (data.step === 'ready') {
          const sessionResponse = await fetch('http://localhost:5000/api/session/active');
          const sessionData = await sessionResponse.json();
          if (sessionData.session) {
            setSessionBlocks(sessionData.session.blocks);
          }
        }
      } catch (error) {
        console.error('Ошибка при проверке состояния:', error);
      }
    };

    // Проверяем состояние каждую секунду
    checkCurrentState();
    const interval = setInterval(checkCurrentState, 1000);
    return () => clearInterval(interval);
  }, [step]); // Добавляем step в зависимости

  const handleStartSession = async () => {
    try {
      await fetch('http://localhost:5000/api/subjects/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'in_session'
        })
      });
      setStep('running');
      startSession(sessionBlocks);
    } catch (error) {
      console.error('Ошибка при начале сессии:', error);
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (step === 'loading') {
    return <div>Загрузка...</div>;
  }

  if (step === 'registration') {
    return (
      <div className="subject-screen">
        <RegistrationForm onSubmit={handleRegistration} />
      </div>
    );
  }

  if (step === 'info') {
    return (
      <div className="subject-screen">
        <div className="info-container">
          <h1>О проекте</h1>
          <div className="info-text">
            <p>
              Данный проект направлен на исследование и анализ ЭКГ-данных с целью разработки
              методов ранней диагностики сердечно-сосудистых заболеваний.
            </p>
            <p>
              В ходе исследования будут собираться биометрические данные (ЭКГ),
              которые будут использоваться исключительно в научных целях.
            </p>
            <p>
              Вся персональная информация будет зашифрована и обезличена.
              Ваши ФИО и другие личные данные будут храниться отдельно от измерений
              и будут доступны только ответственным исследователям.
            </p>
          </div>
          <div className="consent-button-container">
            <button 
              className="consent-button"
              onClick={handleConsent}
            >
              Согласиться и продолжить
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="subject-screen">
      {step !== 'registration' && (
        <button className="reset-session-button" onClick={handleReset}>
          <i className="fas fa-exclamation-circle"></i>
          Остановить сессию
        </button>
      )}
      {renderSessionContent()}
    </div>
  );
}

export default SubjectScreen; 