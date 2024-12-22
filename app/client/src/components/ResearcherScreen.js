import React, { useState, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import SessionConstructor from './SessionConstructor';
import './ResearcherScreen.css';
import Dashboard from './Dashboard/Dashboard';
import SubjectsManagement from './SubjectsManagement/SubjectsManagement';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const TabItem = ({ id, text, icon, index, moveTab, isActive, onClick }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'TAB_ITEM',
    item: { id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'TAB_ITEM',
    hover(item, monitor) {
      if (!monitor.isOver({ shallow: true })) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      if (dragIndex === hoverIndex) return;
      
      moveTab(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  return (
    <button
      ref={(node) => drag(drop(node))}
      className={`tab-button ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={onClick}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <i className={`fas fa-${icon}`}></i>
      <span>{text}</span>
    </button>
  );
};

function ResearcherScreen() {
  const [error, setError] = useState(null);
  const defaultTabs = [
    { id: 'dashboard', text: 'Дашборд виджетов', icon: 'chart-line' },
    { id: 'session', text: 'Сборка сессиий', icon: 'puzzle-piece' },
    { id: 'subjects', text: 'Испытуемые', icon: 'users' }
  ];

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'session';
  });

  const [tabs, setTabs] = useState(() => {
    try {
      const savedTabs = localStorage.getItem('tabsOrder');
      return savedTabs ? JSON.parse(savedTabs) : defaultTabs;
    } catch (err) {
      console.error('Error loading tabs:', err);
      return defaultTabs;
    }
  });

  const [ecgData, setEcgData] = useState([]);

  useEffect(() => {
    let interval;
    if (activeTab === 'ecg') {
      const fetchData = async () => {
        try {
          const response = await fetch('http://localhost:5000/api/ecg');
          const data = await response.json();
          setEcgData(data.data);
        } catch (error) {
          console.error('Ошибка при получении данных:', error);
        }
      };

      interval = setInterval(fetchData, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('tabsOrder', JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  const moveTab = (dragIndex, hoverIndex) => {
    const newTabs = [...tabs];
    const dragTab = newTabs[dragIndex];
    newTabs.splice(dragIndex, 1);
    newTabs.splice(hoverIndex, 0, dragTab);
    setTabs(newTabs);
  };

  const chartData = {
    labels: Array.from({ length: ecgData.length }, (_, i) => i),
    datasets: [
      {
        label: 'ЭКГ',
        data: ecgData,
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  const resetTabs = () => {
    localStorage.removeItem('tabsOrder');
    localStorage.removeItem('activeTab');
    setTabs(defaultTabs);
    setActiveTab('session');
  };

  const handleStartSession = async (subjectId) => {
    try {
      // Обновляем статус на ready_to_start
      await fetch(`http://localhost:5000/api/subjects/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject_id: subjectId,
          status: 'ready_to_start'
        })
      });

      // Остальной код запуска сессии...
    } catch (error) {
      console.error('Ошибка при запуске сессии:', error);
    }
  };

  if (error) {
    return <div className="error-message">Произошла ошибка: {error}</div>;
  }

  return (
    <div className="researcher-screen">
      <div className="tabs">
        {tabs.map((tab, index) => (
          <TabItem
            key={tab.id}
            id={tab.id}
            text={tab.text}
            icon={tab.icon}
            index={index}
            moveTab={moveTab}
            isActive={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'dashboard' ? (
          <div className="dashboard-tab">
            <Dashboard />
          </div>
        ) : activeTab === 'session' ? (
          <div className="session-tab">
            <SessionConstructor />
          </div>
        ) : activeTab === 'subjects' ? (
          <div className="subjects-tab">
            <SubjectsManagement />
          </div>
        ) : (
          null
        )}
      </div>
    </div>
  );
}

export default ResearcherScreen; 