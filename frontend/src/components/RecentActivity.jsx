import React, { useState, useEffect } from 'react';

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

    if (activities.length === 0) return (
        <div className="recent-activity empty">
            <h3 className="section-title">Live Transaction Feed</h3>
            <p className="no-activity">Waiting for blockchain events...</p>
        </div>
    );

    return (
        <div className="recent-activity">
            <h3 className="section-title"><span className="live-dot"></span>Live Transaction Feed</h3>
            <div className="activity-list">
                {activities.map((act, i) => (
                    <div key={i} className="activity-card animate-in">
                        <div className="activity-header">
                            <span className={`status-pill ${act.type.toLowerCase()}`}>{act.type.replace('_', ' ')}</span>
                            <span className="activity-time">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="activity-desc">
                            {act.type === 'GROUP_STARTED' && <span>Circle <strong>{act.name}</strong> is now live on Sepolia.</span>}
                            {act.type === 'CONTRIBUTION' && <span><strong>{act.member.slice(0, 6)}...</strong> contributed <strong>{act.amount} USDC</strong></span>}
                            {act.type === 'BID_PLACED' && <span><strong>{act.bidder.slice(0, 6)}...</strong> bid <strong>{act.discount} USDC</strong> (Off-chain)</span>}
                            {act.type === 'AUCTION_SETTLED' && <span>Auction settled! Winner: <strong>{act.winner.slice(0, 6)}...</strong></span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecentActivity;
