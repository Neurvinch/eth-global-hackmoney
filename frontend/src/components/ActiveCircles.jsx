import React, { useState, useEffect } from 'react';
import { Users, Lock, TrendingUp } from 'lucide-react';

const ActiveCircles = () => {
    const [circles, setCircles] = useState([]);

    const fetchCircles = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await fetch(`${API_URL}/api/circles`);
            const data = await response.json();
            setCircles(data);
        } catch (error) {
            console.error('Failed to fetch circles:', error);
        }
    };

    useEffect(() => {
        fetchCircles();
        const interval = setInterval(fetchCircles, 10000);
        return () => clearInterval(interval);
    }, []);

    if (circles.length === 0) return (
        <div className="bg-white/5 border border-white/5 rounded-2xl p-8 text-center">
            <p className="text-dim text-sm italic">No circles active yet. Be the first to start one!</p>
        </div>
    );

    return (
        <div className="circles-list-v2">
            {circles.map((circle) => {
                // Calculate progress (simplified for demo, usually we'd need current member count)
                // For now, let's derive it or just show a nice bar
                const progress = Math.min((parseFloat(circle.escrow) / (parseFloat(circle.contribution) * parseInt(circle.members))) * 100, 100);

                return (
                    <div key={circle.id} className="circle-item-v2">
                        <div className="circle-top">
                            <div>
                                <h4 className="circle-title-v2 text-white">{circle.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <Users size={12} className="text-dim" />
                                    <span className="text-[10px] text-dim font-bold uppercase tracking-widest">{circle.members} Members Required</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="circle-payout font-black text-lg">{circle.escrow}</span>
                                <span className="text-[10px] text-success block font-bold uppercase">Escrow Pooled</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 my-4">
                            <div className="bg-black/20 p-2 rounded-lg text-center">
                                <span className="text-[9px] text-dim block uppercase font-bold mb-1">Monthly</span>
                                <span className="text-xs font-bold text-white">{circle.contribution}</span>
                            </div>
                            <div className="bg-black/20 p-2 rounded-lg text-center">
                                <span className="text-[9px] text-dim block uppercase font-bold mb-1">Cycle</span>
                                <span className="text-xs font-bold text-white">#{circle.cycle || '1'}</span>
                            </div>
                            <div className="bg-black/20 p-2 rounded-lg text-center">
                                <span className="text-[9px] text-dim block uppercase font-bold mb-1">Status</span>
                                <span className="text-[10px] font-black text-blue-400 uppercase">Active</span>
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-bold text-dim uppercase">Pot Fulfillment</span>
                                <span className="text-[10px] font-bold text-white">{progress.toFixed(0)}%</span>
                            </div>
                            <div className="progress-track">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ActiveCircles;
