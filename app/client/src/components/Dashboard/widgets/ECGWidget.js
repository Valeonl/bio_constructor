import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import './Widgets.css';

export const ECGWidget = () => {
  const [ecgData, setEcgData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Функция для сглаживания данных
  const smoothData = (data, factor = 0.2) => {
    if (data.length <= 2) return data;
    
    const smoothed = [];
    smoothed[0] = data[0];
    
    for(let i = 1; i < data.length - 1; i++) {
      const prev = smoothed[i - 1];
      const current = data[i];
      const next = data[i + 1];
      
      smoothed[i] = prev * factor + current * (1 - 2 * factor) + next * factor;
    }
    
    smoothed[data.length - 1] = data[data.length - 1];
    return smoothed;
  };

  // Функция для прореживания данных
  const decimateData = (data, factor = 3) => {
    return data.filter((_, index) => index % factor === 0);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/ecg');
        const data = await response.json();
        
        // Прореживаем и сглаживаем данные
        const processedData = smoothData(decimateData(data.data));
        setEcgData(processedData);
        setError(null);
      } catch (error) {
        console.error('Ошибка при получении данных:', error);
        setError('Ошибка загрузки данных');
      }
    };

    // Начальная задержка перед первой загрузкой
    const initialTimeout = setTimeout(() => {
      fetchData();
      setIsLoading(false);
    }, 1500);

    // Интервал обновления данных
    const interval = setInterval(fetchData, 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  const chartData = {
    labels: Array.from({ length: ecgData.length }, (_, i) => i),
    datasets: [
      {
        label: 'ЭКГ',
        data: ecgData,
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.4, // Увеличиваем tension для более плавной линии
        pointRadius: 0, // Убираем точки
        borderWidth: 1.5
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        min: -2,  // Фиксируем минимальное значение
        max: 2,   // Фиксируем максимальное значение
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        title: {
          display: true,
          text: 'Амплитуда (мВ)',
          color: '#666',
          font: {
            size: 12
          }
        },
        ticks: {
          display: true,
          color: '#666',
          font: {
            size: 10
          },
          stepSize: 0.5
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
          drawBorder: false
        },
        title: {
          display: true,
          text: 'Время (с)',
          color: '#666',
          font: {
            size: 12
          }
        },
        ticks: {
          display: true,
          color: '#666',
          font: {
            size: 10
          },
          maxTicksLimit: 10, // Ограничиваем количество меток по оси X
          callback: function(value) {
            return (value / 250).toFixed(1); // Преобразуем индекс в секунды
          }
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false // Отключаем всплывающие подсказки
      }
    },
    animation: {
      duration: 0
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 1.5,
        borderColor: 'rgb(75, 192, 192)',
        fill: false
      },
      point: {
        radius: 0
      }
    }
  };

  return (
    <div className="widget ecg-widget">
      <div className="widget-header">
        <i className="fas fa-wave-square"></i>
        <span>ЭКГ Монитор</span>
      </div>
      <div className="widget-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span>Инициализация ЭКГ...</span>
          </div>
        ) : error ? (
          <div className="error-container">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
          </div>
        ) : (
          <div className="ecg-chart">
            <Line data={chartData} options={chartOptions} />
          </div>
        )}
      </div>
    </div>
  );
}; 