import React, { useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { Mic, Info, ArrowRight, X, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import LanguageSelector from './components/LanguageSelector';
import VoiceRecorder from './components/VoiceRecorder';
import IntentPreview from './components/IntentPreview';
import ProtocolDashboard from './components/ProtocolDashboard';
import RecentActivity from './components/RecentActivity';
import ActiveCircles from './components/ActiveCircles';
import { processVoice } from './services/api';
import './index.css';

function App() {
  const [language, setLanguage] = useState('en');
  const [intent, setIntent] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRecordingComplete = async (audioBlob) => {
    setIsProcessing(true);
    setIntent(null);
    const id = toast.loading("Listening to your voice...", {
      style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
    });

    try {
      const result = await processVoice(audioBlob, language);
      setIntent(result);
      toast.success("I understood your intent!", { id });
    } catch (error) {
      toast.error("I couldn't hear you clearly. Please try again.", { id });
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    const id = toast.loading("Broadcasting to Blockchain...", {
      style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
    });

    try {
      setIsProcessing(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/execute-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent })
      });

      if (!response.ok) throw new Error('Execution failed');

      const result = await response.json();
      toast.success(
        <div className="flex flex-col">
          <span className="font-bold">Transaction Confirmed!</span>
          <span className="text-xs opacity-75">{result.status || 'Success'}</span>
        </div>,
        { id, duration: 5000 }
      );
      setIntent(null);
    } catch (error) {
      toast.error(`Transaction Failed: ${error.message}`, { id });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="app-container">
      <Toaster position="top-right" />

      {/* Main Column */}
      <div className="glass-card main-workflow">
        <header className="header">
          <div className="title-group">
            <h1 className="title">Bol-DeFi</h1>
            <span className="badge-v2">LIVE ON ARC</span>
          </div>
          <p className="subtitle">Speak your intent in your native language. Our AI handles the DeFi complexity on-chain.</p>
        </header>

        <section className="voice-hub">
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
        </section>

        <div className="discovery-grid">
          <div className="circles-wrapper">
            <h3 className="section-label">
              <span className="glow-dot"></span>
              Active Savings Circles
            </h3>
            <ActiveCircles />
          </div>

          <div className="activity-wrapper">
            <h3 className="section-label">Live Activity Stream</h3>
            <RecentActivity />
          </div>
        </div>
      </div>

      {/* Sidebar Column */}
      <div className="dashboard-sidebar">
        <div className="glass-card status-card">
          <ProtocolDashboard />
        </div>

        <div className="glass-card feature-promo">
          <h3 className="section-label">Security Protocol</h3>
          <div className="status-pill-v2">
            <ShieldCheck size={20} className="text-blue-400" />
            <span>Multi-Sig Treasury Active</span>
          </div>
          <div className="status-pill-v2 mt-2">
            <Zap size={20} className="text-yellow-400" />
            <span>Nitrolite Off-chain Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
