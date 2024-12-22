import React, { useState, useEffect } from 'react';
import './SubjectsManagement.css';

// Импортируем аватарки
import { ReactComponent as CatAvatar } from '../../avatars/cat.svg';
import { ReactComponent as DogAvatar } from '../../avatars/dog.svg';
import { ReactComponent as FishAvatar } from '../../avatars/fish.svg';
import { ReactComponent as BirdAvatar } from '../../avatars/bird.svg';
import { ReactComponent as RabbitAvatar } from '../../avatars/rabbit.svg';

// Добавим объект с иконками для каждого статуса
const STATUS_ICONS = {
  'not_connected': 'power-off',
  'registration': 'user-edit',
  'reading_consent': 'file-contract',
  'accepted_consent': 'check-circle',
  'waiting_session': 'hourglass-half',
  'in_session': 'play-circle',
  'finished_session': 'flag-checkered'
};

function SubjectsManagement() {
  const [subjects, setSubjects] = useState([]);
  const [savedSession, setSavedSession] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  // Периодическая проверка списка испытуемых
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/subjects');
        const data = await response.json();
        setSubjects(data);
      } catch (error) {
        console.error('Ошибка при получении списка испытуемых:', error);
      }
    };

    fetchSubjects();
    const interval = setInterval(fetchSubjects, 1000);
    return () => clearInterval(interval);
  }, []);

  // Проверка наличия активной сессии
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/session/active');
        const data = await response.json();
        setSavedSession(data.session);
      } catch (error) {
        console.error('Ошибка при проверке сессии:', error);
        setSavedSession(null);
      }
    };

    checkActiveSession();
    const interval = setInterval(checkActiveSession, 1000);
    return () => clearInterval(interval);
  }, []);

  const getAvatarComponent = (avatarId) => {
    switch (avatarId) {
      case 'cat': return <CatAvatar />;
      case 'dog': return <DogAvatar />;
      case 'fish': return <FishAvatar />;
      case 'bird': return <BirdAvatar />;
      case 'rabbit': return <RabbitAvatar />;
      default: return <i className="fas fa-user-circle"></i>;
    }
  };

  const handleHistoryClick = async (subject) => {
    try {
      const response = await fetch(`http://localhost:5000/api/subjects/${subject.id}/history`);
      const history = await response.json();
      setSubjects(prev => prev.map(s => 
        s.id === subject.id 
          ? { ...s, statusHistory: history }
          : s
      ));
      setSelectedSubject(subject.id === selectedSubject ? null : subject.id);
      setShowHistory(true);
    } catch (error) {
      console.error('Ошибка при получении истории:', error);
    }
  };

  const handleStartSession = async (subjectId) => {
    if (!savedSession) {
      alert('Сначала необходимо создать и сохранить сессию');
      return;
    }

    try {
      await fetch('http://localhost:5000/api/subjects/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject_id: subjectId,
          status: 'ready_to_start'
        })
      });
    } catch (error) {
      console.error('Ошибка при запуске сессии:', error);
    }
  };

  const handleStopSession = async (subjectId) => {
    try {
      await fetch('http://localhost:5000/api/subjects/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject_id: subjectId,
          status: 'finished_session'
        })
      });
    } catch (error) {
      console.error('Ошибка при остановке сессии:', error);
    }
  };

  const handleRestartSession = async (subjectId) => {
    try {
      await fetch('http://localhost:5000/api/subjects/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject_id: subjectId,
          status: 'ready_to_start'
        })
      });
    } catch (error) {
      console.error('Ошибка при перезапуске сессии:', error);
    }
  };

  return (
    <div className="subjects-management">
      <div className="subjects-header">
        <h2>Управление испытуемыми</h2>
        <div className="subjects-stats">
          <div className="stat-item">
            <span className="stat-label">Всего участников:</span>
            <span className="stat-value">{subjects.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Активных сессий:</span>
            <span className="stat-value">
              {subjects.filter(s => s.status === 'in_session').length}
            </span>
          </div>
        </div>
      </div>

      <div className="subjects-grid">
        {subjects.map(subject => (
          <div key={subject.id} className="subject-card">
            <div className="subject-info">
              <div className="avatar">
                {getAvatarComponent(subject.avatar)}
              </div>
              <div className="subject-details">
                <h3>{subject.fullName}</h3>
                <div className="subject-status">
                  <i className={`fas fa-${STATUS_ICONS[subject.status] || 'circle'}`}></i>
                  <span>{subject.statusDescription}</span>
                </div>
                <div className="subject-meta">
                  <div className="subject-connection">
                    <i className="fas fa-network-wired"></i>
                    <span>{subject.ipAddress}</span>
                  </div>
                  <button 
                    className="history-button"
                    onClick={() => handleHistoryClick(subject)}
                  >
                    <i className="fas fa-history"></i>
                    История статусов
                  </button>
                </div>
              </div>
            </div>

            <div className="subject-actions">
              {subject.status === 'waiting_session' && (
                <button
                  className="action-button start-button"
                  onClick={() => handleStartSession(subject.id)}
                  disabled={!savedSession}
                  title={!savedSession ? "Сначала необходимо создать и сохранить сессию" : ""}
                >
                  <i className="fas fa-play"></i>
                  {savedSession ? "Начать сессию" : "Создайте сессию"}
                </button>
              )}

              {(subject.status === 'in_session' || subject.status === 'ready_to_start') && (
                <button
                  className="action-button stop-button"
                  onClick={() => handleStopSession(subject.id)}
                >
                  <i className="fas fa-stop"></i>
                  Остановить сессию
                </button>
              )}

              {subject.status === 'finished_session' && (
                <button
                  className="action-button restart-button"
                  onClick={() => handleRestartSession(subject.id)}
                >
                  <i className="fas fa-redo"></i>
                  Перезапустить
                </button>
              )}
            </div>

            {selectedSubject === subject.id && showHistory && (
              <div className="status-history-popup">
                <div className="popup-header">
                  <h4>История статусов</h4>
                  <button className="close-button" onClick={() => setShowHistory(false)}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className="timeline">
                  {subject.statusHistory?.map((record, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-date">
                        {new Date(record.timestamp).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <span className={`status-badge ${record.status}`}>
                        {record.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SubjectsManagement; 