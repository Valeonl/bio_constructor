import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ConnectionProvider } from './context/ConnectionContext';
import ConnectionStatus from './components/ConnectionStatus';
import SelectionScreen from './components/SelectionScreen';
import SubjectScreen from './components/SubjectScreen';
import ResearcherScreen from './components/ResearcherScreen';
import AdminScreen from './components/AdminScreen';
import './App.css';

function App() {
  const [dndError, setDndError] = useState(null);

  useEffect(() => {
    localStorage.removeItem('tabsOrder');
    localStorage.removeItem('activeTab');
  }, []);

  if (dndError) {
    return (
      <div className="app-error">
        <h2>Произошла ошибка</h2>
        <p>{dndError.message}</p>
        <button onClick={() => window.location.reload()}>Перезагрузить страницу</button>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Router>
        <Routes>
          <Route path="/admin" element={<AdminScreen />} />
          <Route path="*" element={
            <ConnectionProvider>
              <Routes>
                <Route path="/" element={
                  <>
                    <ConnectionStatus />
                    <SelectionScreen />
                  </>
                } />
                <Route path="/subject" element={
                  <>
                    <ConnectionStatus />
                    <SubjectScreen />
                  </>
                } />
                <Route path="/researcher" element={
                  <>
                    <ConnectionStatus />
                    <ResearcherScreen />
                  </>
                } />
              </Routes>
            </ConnectionProvider>
          } />
        </Routes>
      </Router>
    </DndProvider>
  );
}

export default App; 