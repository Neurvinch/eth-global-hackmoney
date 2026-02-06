import React, { useState, useEffect } from 'react';
import { Users, Share2, Plus, ArrowUpRight, CheckCircle2, LayoutDashboard, Globe } from 'lucide-react';
import { useAccount } from 'wagmi';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const CircleDashboard = () => {
    const { address } = useAccount();
    const [circles, setCircles] = useState([]);
    const [activeTab, setActiveTab] = useState('all'); // 'all' or 'my'
    const [loading, setLoading] = useState(true);

    const fetchCircles = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const url = address
                ? `${API_URL}/api/circles?address=${address}`
                : `${API_URL}/api/circles`;

            const response = await fetch(url);
            const data = await response.json();
            setCircles(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch circles:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCircles();
        const interval = setInterval(fetchCircles, 10000);
        return () => clearInterval(interval);
    }, [address]);

    const handleCopyInvite = (id) => {
        const inviteLink = `${window.location.origin}/join/${id}`;
        navigator.clipboard.writeText(inviteLink);
        toast.success('Invite link copied to clipboard!', {
            style: {
                background: '#1f2937',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)'
            }
        });
    };

    const filteredCircles = activeTab === 'all'
        ? circles
        : circles.filter(c => c.isMember || c.isCreator);

    if (loading) return (
        <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
    );

    return (
        <div className="discovery-section">
            <div className="flex items-center justify-between mb-8">
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'text-dim hover:text-white'}`}
                    >
                        <Globe size={14} />
                        Discover
                    </button>
                    <button
                        onClick={() => setActiveTab('my')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'my' ? 'bg-indigo-600 text-white shadow-lg' : 'text-dim hover:text-white'}`}
                    >
                        <LayoutDashboard size={14} />
                        My Circles
                    </button>
                </div>

                <div className="text-[10px] text-dim font-bold uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                    <span className="text-indigo-400">{filteredCircles.length}</span> Active Circles Found
                </div>
            </div>

            {filteredCircles.length === 0 ? (
                <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-12 text-center">
                    <div className="bg-white/5 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="text-dim" size={20} />
                    </div>
                    <p className="text-dim text-sm italic">
                        {activeTab === 'all' ? "No circles found on-chain." : "You haven't joined any circles yet."}
                    </p>
                    {activeTab === 'my' && (
                        <p className="text-xs text-indigo-400 mt-2 font-bold uppercase tracking-tighter">Use voice to "Create a group"</p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence mode="popLayout">
                        {filteredCircles.map((circle) => {
                            const progress = Math.min((parseFloat(circle.escrow) / (parseFloat(circle.contribution) * parseInt(circle.members))) * 100, 100);

                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    key={circle.id}
                                    className={`circle-card-v3 ${circle.isCreator ? 'border-indigo-500/30' : 'border-white/5'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-lg font-bold text-white tracking-tight">{circle.name}</h4>
                                                {circle.isCreator && (
                                                    <span className="bg-indigo-500/20 text-indigo-300 text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter border border-indigo-500/30">Admin</span>
                                                )}
                                                {circle.isMember && !circle.isCreator && (
                                                    <CheckCircle2 size={14} className="text-success" />
                                                )}
                                            </div>
                                            <p className="text-[10px] text-dim font-mono tracking-tighter truncate max-w-[150px]">
                                                ID: {circle.id} • {circle.creator.slice(0, 6)}...
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleCopyInvite(circle.id)}
                                            className="p-2 hover:bg-white/10 rounded-lg text-dim hover:text-indigo-400 transition-colors"
                                            title="Copy Invite Link"
                                        >
                                            <Share2 size={16} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-black/20 p-3 rounded-xl border border-white/5 transition-all hover:border-white/10">
                                            <span className="text-[9px] text-dim block uppercase font-bold mb-1 tracking-widest">Monthly Pot</span>
                                            <span className="text-sm font-black text-white">{circle.contribution} <span className="text-[10px] text-dim font-normal">USDC</span></span>
                                        </div>
                                        <div className="bg-black/20 p-3 rounded-xl border border-white/5 transition-all hover:border-white/10">
                                            <span className="text-[9px] text-dim block uppercase font-bold mb-1 tracking-widest">Current Escrow</span>
                                            <span className="text-sm font-black text-success">{circle.escrow} <span className="text-[10px] text-dim font-normal">USDC</span></span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between items-end mb-1.5">
                                                <span className="text-[9px] font-bold text-dim uppercase tracking-widest">Group Formation</span>
                                                <span className="text-[10px] font-black text-white">{progress.toFixed(0)}%</span>
                                            </div>
                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                    className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 shadow-[0_0_10px_rgba(79,70,229,0.5)]"
                                                ></motion.div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] font-bold text-dim">
                                            <div className="flex items-center gap-1.5">
                                                <Users size={12} />
                                                <span>{circle.members} Positions</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                                <span>Cycle #{circle.cycle}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 pt-4 border-t border-white/5">
                                        {circle.isMember ? (
                                            <button className="w-full bg-white/5 hover:bg-white/10 p-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all">
                                                Manage Circle <ArrowUpRight size={14} />
                                            </button>
                                        ) : (
                                            <button className="w-full bg-indigo-600 hover:bg-indigo-500 p-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                                                Join Circle <Plus size={14} />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            <style jsx>{`
                .circle-card-v3 {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(12px);
                    border-radius: 24px;
                    padding: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .circle-card-v3:hover {
                    transform: translateY(-4px);
                    background: rgba(255, 255, 255, 0.06);
                    border-color: rgba(255, 255, 255, 0.1);
                    box-shadow: 0 20px 40px -20px rgba(0,0,0,0.5);
                }
            `}</style>
        </div>
    );
};

export default CircleDashboard;
