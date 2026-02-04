import React, { useState } from 'react';
import LanguageSelector from './components/LanguageSelector';
import VoiceRecorder from './components/VoiceRecorder';
import IntentPreview from './components/IntentPreview';
import { processVoice } from './services/api';
import './index.css';

function App() {
  const [language, setLanguage] = useState('en');
  const [intent, setIntent] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRecordingComplete = async (audioBlob) => {
    setIsProcessing(true);
    setIntent(null);
    try {
      const result = await processVoice(audioBlob, language);
      setIntent(result);
    } catch (error) {
      alert("Error processing voice. Make sure the backend is running!");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    alert(`Executing: ${intent.type}`);
    setIntent(null);
  };

  return (
    <div className="app-container">
      <div className="main-card">
        <header className="header">
          <h1 className="title">Bol-DeFi</h1>
          <p className="subtitle">Vernacular Voice-First Finance</p>
        </header>

        <main>
          <LanguageSelector selectedLanguage={language} onLanguageChange={setLanguage} />

          <VoiceRecorder
            onRecordingComplete={handleRecordingComplete}
            isProcessing={isProcessing}
          />

          <IntentPreview
            intent={intent}
            onConfirm={handleConfirm}
            onCancel={() => setIntent(null)}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
