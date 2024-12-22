import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ReactComponent as PlayerIcon } from '../icon/player.svg';
import { ReactComponent as ScientistIcon } from '../icon/scientist.svg';
import { ReactComponent as AdminIcon } from '../icon/admin.svg';

function SelectionScreen() {
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/subjects/current-state');
        const data = await response.json();
        
        // Если есть активная сессия - перенаправляем на соответствующую страницу
        if (data.step === 'measurement') {
          window.location.href = '/subject';
        }
      } catch (error) {
        console.error('Ошибка при проверке статуса:', error);
      }
    };

    checkStatus();
  }, []);

  return (
    <div className="selection-screen">
      <h1 className="welcome-text">
        Добро пожаловать в систему анализа данных ЭКГ.<br />
        Выберите вашу роль
      </h1>
      
      <div className="cards-container">
        <Link to="/subject" className="role-card">
          <PlayerIcon className="role-icon" />
          <p className="role-label">Я испытуемый</p>
        </Link>

        <Link to="/researcher" className="role-card">
          <ScientistIcon className="role-icon" />
          <p className="role-label">Я исследователь</p>
        </Link>

        <Link to="/admin" className="role-card">
          <AdminIcon className="role-icon" />
          <p className="role-label">Администратор</p>
        </Link>
      </div>
    </div>
  );
}

export default SelectionScreen; 