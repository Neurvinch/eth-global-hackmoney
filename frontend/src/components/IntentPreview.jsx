import React from 'react';
import { ShieldCheck, ArrowRight, X, Cpu } from 'lucide-react';

const IntentPreview = ({ intent, onConfirm, onCancel }) => {
    if (!intent) return null;

    return (
        <div className="preview-overlay">
            <div className="intent-card">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Cpu size={12} />
                        AI Analysis Complete
                    </span>
                    <span className="text-[10px] font-bold text-dim bg-white/5 px-2 py-1 rounded">
                        CONFIDENCE: {(intent.confidence * 100).toFixed(0)}%
                    </span>
                </div>

                <p className="summary-headline">
                    "{intent.summary || 'Executing requested vernacular intent...'}"
                </p>

                <div className="params-grid">
                    <div className="param-tile">
                        <span className="param-label">Operation</span>
                        <span className="param-value text-white">{intent.type?.replace('_', ' ')}</span>
                    </div>

                    {intent.params?.contributionAmount && (
                        <div className="param-tile">
                            <span className="param-label">Vault Deposit</span>
                            <span className="param-value highlight">{intent.params.contributionAmount} USDC</span>
                        </div>
                    )}

                    {intent.params?.groupId && (
                        <div className="param-tile">
                            <span className="param-label">Circle Target</span>
                            <span className="param-value text-indigo-300">#{intent.params.groupId}</span>
                        </div>
                    )}

                    {intent.params?.discountAmount && (
                        <div className="param-tile">
                            <span className="param-label">Auction Bid</span>
                            <span className="param-value highlight">{intent.params.discountAmount} USDC</span>
                        </div>
                    )}

                    <div className="param-tile">
                        <span className="param-label">Efficiency</span>
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={14} className="text-yellow-400" />
                            <span className="param-value text-xs text-yellow-400 uppercase">Yellow Optimized</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onConfirm}
                        className="premium-btn btn-confirm group"
                    >
                        <span>Confirm & Broadcast</span>
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button
                        onClick={onCancel}
                        className="premium-btn btn-cancel"
                    >
                        <X size={18} />
                        <span>Dismiss</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IntentPreview;
