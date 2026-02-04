import React from 'react';

const IntentPreview = ({ intent, onConfirm, onCancel }) => {
    if (!intent) return null;

    return (
        <div className="intent-preview">
            <h3 className="preview-title">Detected Intent</h3>

            <div className="summary-box">
                <p className="summary-text italic">"{intent.summary}"</p>
            </div>

            <div className="details-grid">
                <div className="detail-item">
                    <span className="detail-label">TYPE</span>
                    <span className="detail-value type">{intent.type}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">CONFIDENCE</span>
                    <span className="detail-value confidence">{(intent.confidence * 100).toFixed(1)}%</span>
                </div>
            </div>

            <div className="action-buttons">
                <button
                    onClick={onConfirm}
                    className="btn btn-primary"
                >
                    Confirm Execution
                </button>
                <button
                    onClick={onCancel}
                    className="btn btn-secondary"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default IntentPreview;
