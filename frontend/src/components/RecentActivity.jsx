import React, { useState, useEffect } from 'react';
import { Clock, Zap, Target, Package } from 'lucide-react';

const RecentActivity = () => {
    const [activities, setActivities] = useState([]);

    const fetchActivity = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await fetch(`${API_URL}/api/activity`);
            const data = await response.json();
            setActivities(data);
        } catch (error) {
            console.error('Failed to fetch activity:', error);
        }
    };

    useEffect(() => {
        fetchActivity();
        const interval = setInterval(fetchActivity, 5000);
        return () => clearInterval(interval);
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'GROUP_STARTED': return <Package size={14} className="text-blue-400" />;
            case 'CONTRIBUTION': return <Target size={14} className="text-emerald-400" />;
            case 'BID_PLACED': return <Zap size={14} className="text-amber-400" />;
            default: return <Clock size={14} className="text-purple-400" />;
        }
    }

    if (activities.length === 0) return (
        <div className="bg-black/10 rounded-2xl p-6 text-center border border-dashed border-white/10">
            <div className="live-dot mx-auto mb-4 bg-dim shadow-none"></div>
            <p className="text-dim text-[11px] font-bold uppercase tracking-tighter">Observing Chain Events...</p>
        </div>
    );

    return (
        <div className="activity-feed-v2">
            {activities.map((act, i) => (
                <div key={act.id || i} className="feed-card animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="feed-meta">
                        <div className="flex items-center gap-2">
                            {getIcon(act.type)}
                            <span className="feed-tag">{act.type.replace('_', ' ')}</span>
                        </div>
                        <span className="feed-time">{act.timestamp}</span>
                    </div>
                    <p className="text-xs text-main leading-relaxed tracking-tight">
                        {act.description}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default RecentActivity;
