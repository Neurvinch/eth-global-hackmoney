import React, { useState, useEffect } from 'react';

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

    if (circles.length === 0) return null;

    return (
        <div className="active-circles">
            <h3 className="section-title"><span className="live-dot" style={{ backgroundColor: '#4ade80', boxShadow: '0 0 8px #4ade80' }}></span>Established Savings Circles</h3>
            <div className="circles-grid">
                {circles.map((circle) => (
                    <div key={circle.id} className="circle-card">
                        <div className="circle-main">
                            <div className="circle-name">{circle.name}</div>
                            <div className="circle-escrow">🔒 {circle.escrow} USDC</div>
                        </div>
                        <div className="circle-stats">
                            <div className="stat">💰 {circle.contribution}</div>
                            <div className="stat">👥 {circle.members}</div>
                            <div className="stat">🔄 Cycle {circle.cycle}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActiveCircles;
