import React, { useState, useEffect } from 'react';
import './StroopTest.css';

const StroopTest = ({ isFast = false }) => {
  const [word, setWord] = useState('КРАСНЫЙ');
  const [backgroundColor, setBackgroundColor] = useState('#dc3545');
  const [position, setPosition] = useState({ left: '50%', top: '50%' });
  const [showTest, setShowTest] = useState(false);
  const [initialHint, setInitialHint] = useState(true);

  const words = ["КРАСНЫЙ", "ЗЕЛЕНЫЙ", "СИНИЙ", "ЖЕЛТЫЙ", "ОРАНЖЕВЫЙ"];
  const colors = ["#dc3545", "#28a745", "#007bff", "#ffc107", "#fd7e14"];

  const getRandomNumber = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const changeWord = () => {
    const wordIndex = Math.floor(Math.random() * words.length);
    const colorIndex = Math.floor(Math.random() * colors.length);
    
    let newColorIndex = colorIndex;
    if (wordIndex === colorIndex) {
      newColorIndex = (colorIndex + 1) % colors.length;
    }

    const canvasWidth = document.getElementById('workCanvas')?.offsetWidth || 800;
    const canvasHeight = document.getElementById('workCanvas')?.offsetHeight || 600;

    const padding = 100;
    const randomLeft = getRandomNumber(padding, canvasWidth - padding);
    const randomTop = getRandomNumber(padding, canvasHeight - padding);

    setWord(words[wordIndex]);
    setBackgroundColor(colors[newColorIndex]);
    setPosition({
      left: `${randomLeft}px`,
      top: `${randomTop}px`
    });
  };

  useEffect(() => {
    setInitialHint(false);
    setShowTest(true);
    
    let interval;
    if (showTest) {
      interval = setInterval(changeWord, isFast ? 500 : 1000);
    }
    return () => clearInterval(interval);
  }, [showTest, isFast]);

  return (
    <div className="stroop-container">
      <div className="stroop-hint" style={{ backgroundColor: isFast ? '#fff3cd' : '#f8f9fa' }}>
        <strong>Задание:</strong> Называйте вслух <u>цвет фона</u>, на котором написано слово, 
        а не само слово
        {isFast && <div className="fast-mode-indicator">⚡ Ускоренный режим</div>}
      </div>
      <div id="workCanvas" className="stroop-canvas">
        <div
          className="stroop-word"
          style={{
            ...position,
            backgroundColor,
          }}
        >
          {word}
        </div>
      </div>
    </div>
  );
};

export default StroopTest; 