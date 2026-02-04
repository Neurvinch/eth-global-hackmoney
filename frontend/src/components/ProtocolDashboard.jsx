import React, { useState, useEffect } from 'react';

const ProtocolDashboard = () => {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await fetch(`${API_URL}/api/protocol-status`);
            const data = await response.json();
            setStatus(data);
        } catch (error) {
            console.error('Failed to fetch protocol status:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="loading-state">Syncing Protocol State...</div>;

    return (
        <div className="protocol-dashboard">
            <h3 className="section-title">Protocol Integrity Stream</h3>
            <div className="status-grid">
                <div className="status-item">
                    <span className="label">Arc Protocol Treasury</span>
                    <span className="value highlighting">{status?.arcBalance} USDC</span>
                </div>
                <div className="status-item">
                    <span className="label">Yellow Network State</span>
                    <span className="value status-online">{status?.yellowStatus}</span>
                </div>
                <div className="status-item">
                    <span className="label">ROSCA On-Chain Hub</span>
                    <span className="value address">{status?.roscaAddress?.slice(0, 6)}...{status?.roscaAddress?.slice(-4)}</span>
                </div>
                <div className="status-item">
                    <span className="label">ENS Identity</span>
                    <span className="value">{status?.ensIdentity}</span>
                </div>
            </div>
        </div>
    );
};

export default ProtocolDashboard;
