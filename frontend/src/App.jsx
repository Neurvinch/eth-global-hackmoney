import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ShieldCheck, Zap } from 'lucide-react';
import ProtocolDashboard from './components/ProtocolDashboard';
import Home from './pages/Home';
import GroupDetail from './pages/GroupDetail';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Toaster position="top-right" />

        {/* Global Sidebar & Layout Wrapper */}
        <div className="glass-card main-workflow">
          <header className="header">
            <Link to="/" style={{ textDecoration: 'none' }}>
              <div className="title-group">
                <h1 className="title">Bol-DeFi</h1>
                <span className="badge-v2">LIVE ON ARC</span>
              </div>
            </Link>
            <p className="subtitle">Speak your intent in your native language. Our AI handles the DeFi complexity on-chain.</p>
          </header>

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/group/:id" element={<GroupDetail />} />
            {/* Fallback for deep-links/legacy invites */}
            <Route path="/join/:id" element={<GroupDetail />} />
          </Routes>
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
    </BrowserRouter>
  );
}

export default App;
