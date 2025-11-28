import React, { useState, useEffect } from 'react';
import CameraCapture from './components/CameraCapture/CameraCapture';
import ProtocolEditor from './components/ProtocolEditor/ProtocolEditor';
import ProtocolList from './components/ProtocolList/ProtocolList';
import LearningDashboard from './components/LearningDashboard/LearningDashboard';
import Database from './services/database';
import './App.css';

function App() {
  const [currentImage, setCurrentImage] = useState(null);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [activeTab, setActiveTab] = useState('camera');
  const [protocols, setProtocols] = useState([]);
  const [context, setContext] = useState({});

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await Database.init();
        await loadProtocols();
        console.log('Application initialized successfully');
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  const loadProtocols = async () => {
    try {
      const allProtocols = await Database.getAllProtocols();
      setProtocols(allProtocols);
    } catch (error) {
      console.error('Failed to load protocols:', error);
    }
  };

  const handleImageCapture = (imageData) => {
    setCurrentImage(imageData);
    setActiveTab('editor');
  };

  const handleRecognition = (result) => {
    setRecognitionResult(result);
  };

  const updateContext = (newContext) => {
    setContext(prev => ({ ...prev, ...newContext }));
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🤖 AI Система поверки счетчиков</h1>
        <p>Автоматизация процесса поверки средств измерений с искусственным интеллектом</p>
      </header>

      <nav className="app-nav">
        <button 
          className={activeTab === 'camera' ? 'active' : ''}
          onClick={() => setActiveTab('camera')}
        >
          📷 Камера
        </button>
        <button 
          className={activeTab === 'editor' ? 'active' : ''}
          onClick={() => setActiveTab('editor')}
          disabled={!currentImage}
        >
          📝 Протокол
        </button>
        <button 
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          📊 История
        </button>
        <button 
          className={activeTab === 'learning' ? 'active' : ''}
          onClick={() => setActiveTab('learning')}
        >
          🧠 Обучение
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'camera' && (
          <CameraCapture 
            onCapture={handleImageCapture}
            onRecognize={handleRecognition}
            onContextUpdate={updateContext}
          />
        )}

        {activeTab === 'editor' && (
          <ProtocolEditor 
            imageData={currentImage}
            recognitionResult={recognitionResult}
            context={context}
            onProtocolSaved={loadProtocols}
          />
        )}

        {activeTab === 'history' && (
          <ProtocolList 
            protocols={protocols}
            onProtocolsUpdate={loadProtocols}
          />
        )}

        {activeTab === 'learning' && (
          <LearningDashboard />
        )}
      </main>

      <footer className="app-footer">
        <p>Разработано с использованием React, IndexedDB и AI технологий</p>
        <p>Цифровая метрология - автоматизация поверки средств измерений</p>
      </footer>
    </div>
  );
}

export default App;
