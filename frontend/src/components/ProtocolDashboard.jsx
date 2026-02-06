import React, { useState, useEffect } from 'react';
import { Wallet, Activity, Globe, Shield, Landmark } from 'lucide-react';

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
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="text-muted text-sm py-4 animate-pulse">Establishing secure link...</div>;

    return (
        <div className="protocol-v2-container">
            <h3 className="section-label mb-6">
                <span className="glow-dot"></span>
                Protocol Health
            </h3>

            <div className="flex flex-col gap-5">
                {/* Treasury Balances */}
                <div className="status-pill-v2 flex justify-between">
                    <div className="flex items-center gap-3">
                        <Landmark size={18} className="text-indigo-400" />
                        <span className="text-dim text-xs font-bold uppercase">Arc Treasury</span>
                    </div>
                    <span className="font-bold text-success">{status?.arcBalance} USDC</span>
                </div>

                {/* Yellow Network Status */}
                <div className="status-pill-v2 flex justify-between">
                    <div className="flex items-center gap-3">
                        <Activity size={18} className="text-yellow-400" />
                        <span className="text-dim text-xs font-bold uppercase">Scaling Flow</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${(status?.yellowStatus?.includes('Online')) ? 'bg-success shadow-[0_0_8px_#10b981]' : 'bg-danger'}`}></div>
                        <span className="font-bold text-xs">{status?.yellowStatus || 'Offline'}</span>
                    </div>
                </div>

                {/* Identity & Chain */}
                <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                        <span className="text-dim text-[10px] font-black uppercase mb-1 block">Network</span>
                        <div className="flex items-center gap-2">
                            <Globe size={14} className="text-blue-400" />
                            <span className="text-xs font-bold">{status?.network || 'Arc Testnet'}</span>
                        </div>
                    </div>
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                        <span className="text-dim text-[10px] font-black uppercase mb-1 block">Contract</span>
                        <div className="flex items-center gap-2">
                            <Shield size={14} className="text-purple-400" />
                            <span className="text-xs font-mono opacity-80">{status?.roscaAddress?.slice(0, 4)}...{status?.roscaAddress?.slice(-4)}</span>
                        </div>
                    </div>
                </div>

                {/* Member Earnings Section */}
                <div className="mt-4 p-5 bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-2xl border border-indigo-500/20 shadow-xl">
                    <div className="flex items-center gap-2 mb-4">
                        <Wallet size={20} className="text-indigo-300" />
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">My Earnings</h4>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-3xl font-black text-white mb-1">
                            {status?.dividends || '0.00'} <span className="text-sm text-indigo-300">USDC</span>
                        </span>
                        <p className="text-[10px] text-indigo-200/60 uppercase font-bold tracking-tighter">Interest generated from credit circles</p>

                        <button
                            className="mt-4 w-full py-3 bg-white text-indigo-900 font-black text-xs uppercase rounded-xl hover:bg-indigo-50 transition-colors shadow-lg"
                            onClick={() => window.alert("Executing withdrawal intent via voice recommended!")}
                        >
                            Withdraw All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProtocolDashboard;
