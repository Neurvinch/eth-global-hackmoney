import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { Mic, ShieldCheck, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import LanguageSelector from '../components/LanguageSelector';
import VoiceRecorder from '../components/VoiceRecorder';
import IntentPreview from '../components/IntentPreview';
import RecentActivity from '../components/RecentActivity';
import ActiveCircles from '../components/ActiveCircles';
import { processVoice } from '../services/api';

const Home = () => {
    const navigate = useNavigate();
    const [language, setLanguage] = useState('en');
    const [intent, setIntent] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleRecordingComplete = async (audioBlob) => {
        setIsProcessing(true);
        setIntent(null);
        const idBatch = toast.loading("Listening to your voice...", {
            style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
        });

        try {
            const result = await processVoice(audioBlob, language);
            setIntent(result);
            toast.success("I understood your intent!", { id: idBatch });
        } catch (error) {
            toast.error("I couldn't hear you clearly. Please try again.", { id: idBatch });
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleConfirm = async () => {
        const idBatch = toast.loading("Broadcasting to Blockchain...", {
            style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
        });

        try {
            setIsProcessing(true);
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await fetch(`${API_URL}/api/execute-intent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ intent })
            });

            if (!response.ok) throw new Error('Execution failed');

            const result = await response.json();

            toast.success(
                <div className="flex flex-col gap-1">
                    <span className="font-black text-xs uppercase tracking-widest text-success flex items-center gap-2">
                        <CheckCircle2 size={14} /> Transaction Confirmed
                    </span>
                    <span className="text-[10px] opacity-70">Redirecting to your new circle...</span>
                </div>,
                { id: idBatch, duration: 4000 }
            );

            setIntent(null);

            // AUTO-REDIRECT: If it was a group creation, jump straight to the management page
            if (result.groupId) {
                setTimeout(() => {
                    navigate(`/group/${result.groupId}`);
                }, 1500);
            } else {
                // If it was another action (like joining), we might just want to refresh or stay
                window.location.reload(); // Quick way to sync state for non-redirect actions
            }

        } catch (error) {
            toast.error(`Transaction Failed: ${error.message}`, { id: idBatch });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <section className="voice-hub">
                <LanguageSelector selectedLanguage={language} onLanguageChange={setLanguage} />

                <VoiceRecorder
                    onRecordingComplete={handleRecordingComplete}
                    isProcessing={isProcessing}
                />

                <IntentPreview
                    intent={intent}
                    onConfirm={handleConfirm}
                    onCancel={() => setIntent(null)}
                />
            </section>

            <div className="discovery-grid">
                <div className="circles-wrapper">
                    <h3 className="section-label">
                        <span className="glow-dot"></span>
                        Active Savings Circles
                    </h3>
                    <ActiveCircles />
                </div>

                <div className="activity-wrapper">
                    <h3 className="section-label">Live Activity Stream</h3>
                    <RecentActivity />
                </div>
            </div>
        </>
    );
};

export default Home;
