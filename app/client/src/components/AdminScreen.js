import React, { useState } from 'react';
import './AdminScreen.css';
import SessionsManagement from './AdminScreen/SessionsManagement';
import AdminSubjectsTable from './AdminScreen/AdminSubjectsTable';

function AdminScreen() {
  const [activeTab, setActiveTab] = useState('subjects');
  const [isResetting, setIsResetting] = useState(false);

  const handleResetSystem = async () => {
    if (window.confirm('Вы уверены, что хотите сбросить все данные? Это действие нельзя отменить.')) {
      setIsResetting(true);
      try {
        await fetch('http://localhost:5000/api/admin/reset', {
          method: 'POST'
        });
        alert('Система успешно сброшена');
      } catch (error) {
        console.error('Ошибка при сбросе системы:', error);
        alert('Ошибка при сбросе системы');
      }
      setIsResetting(false);
    }
  };

  return (
    <div className="admin-screen">
      <div className="admin-header">
        <h1>Панель администратора</h1>
        <button 
          className="reset-system-button"
          onClick={handleResetSystem}
          disabled={isResetting}
        >
          {isResetting ? 'Сброс системы...' : 'Сбросить систему'}
        </button>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'subjects' ? 'active' : ''}`}
          onClick={() => setActiveTab('subjects')}
        >
          <i className="fas fa-users"></i>
          Испытуемые
        </button>
        <button 
          className={`tab-button ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          <i className="fas fa-list"></i>
          Сессии
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'subjects' ? (
          <AdminSubjectsTable />
        ) : (
          <SessionsManagement />
        )}
      </div>
    </div>
  );
}

export default AdminScreen; 