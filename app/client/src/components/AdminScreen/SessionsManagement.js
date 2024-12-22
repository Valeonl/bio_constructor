import React, { useState, useEffect } from 'react';
import './SessionsManagement.css';

function SessionsManagement() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/sessions');
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Ошибка при получении сессий:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSessions = async () => {
    if (window.confirm('Вы уверены, что хотите удалить все сессии? Это действие нельзя отменить.')) {
      try {
        await fetch('http://localhost:5000/api/session/clear', {
          method: 'POST'
        });
        setSessions([]);
        setSelectedSession(null);
        alert('Все сессии успешно удалены');
      } catch (error) {
        console.error('Ошибка при очистке сессий:', error);
        alert('Ошибка при удалении сессий');
      }
    }
  };

  const renderSessionCard = (session) => {
    const isNew = (new Date() - new Date(session.created_at)) < 5000;

    return (
      <div 
        key={session.id} 
        className={`session-card ${session.is_active ? 'active' : ''} ${isNew ? 'new-session' : ''}`}
        onClick={() => setSelectedSession(session.id === selectedSession ? null : session.id)}
      >
        <div className="session-header">
          <div className="session-info">
            <span className="session-id">Сессия #{session.id}</span>
            <span className="session-date">
              {new Date(session.created_at).toLocaleString('ru-RU')}
            </span>
          </div>
          <div className="session-badges">
            {isNew && (
              <span className="new-badge">
                <i className="fas fa-star"></i>
                Новая
              </span>
            )}
            {session.is_active && (
              <span className="active-badge">
                <i className="fas fa-check-circle"></i>
                Активная
              </span>
            )}
          </div>
        </div>

        {selectedSession === session.id && (
          <div className="session-blocks">
            <h4>Блоки сессии:</h4>
            <div className="blocks-list">
              {session.blocks.map((block, index) => (
                <div key={index} className="block-item">
                  <div className="block-icon">
                    <i className={`fas fa-${getBlockIcon(block.type)}`}></i>
                  </div>
                  <div className="block-info">
                    <span className="block-name">{block.name}</span>
                    <span className="block-duration">
                      {block.duration} сек
                    </span>
                  </div>
                  {block.is_last && (
                    <span className="last-block-badge">
                      Последний блок
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="sessions-management">
      <div className="sessions-header">
        <h2>Управление сессиями</h2>
        <button 
          className="clear-sessions-button"
          onClick={handleClearSessions}
        >
          <i className="fas fa-trash"></i>
          Очистить все сессии
        </button>
      </div>

      <div className="sessions-list">
        {sessions.map(session => renderSessionCard(session))}

        {sessions.length === 0 && (
          <div className="no-sessions">
            <i className="fas fa-inbox"></i>
            <p>Нет сохранённых сессий</p>
          </div>
        )}
      </div>
    </div>
  );
}

function getBlockIcon(type) {
  switch (type) {
    case 'calm': return 'heart';
    case 'tetris': return 'th-large';
    case 'dino': return 'dragon';
    default: return 'cube';
  }
}

export default SessionsManagement; 