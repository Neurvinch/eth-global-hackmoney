import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import {
    Users,
    Share2,
    Plus,
    ArrowLeft,
    Shield,
    TrendingUp,
    Clock,
    CreditCard,
    ChevronRight,
    Zap,
    X,
    Gavel
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const GroupDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { address } = useAccount();
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isBidOpen, setIsBidOpen] = useState(false);
    const [bidAmount, setBidAmount] = useState(10); // Default 10% discount

    const fetchGroup = async () => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const url = address
                ? `${API_URL}/api/circles/${id}?address=${address}`
                : `${API_URL}/api/circles/${id}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error('Group not found');
            const data = await response.json();
            setGroup(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch group:', error);
            toast.error("Circle details unavailable");
            navigate('/');
        }
    };

    useEffect(() => {
        fetchGroup();
        const interval = setInterval(fetchGroup, 10000);
        return () => clearInterval(interval);
    }, [id, address]);

    const handleAction = async (type, params = {}) => {
        const idBatch = toast.loading(`Preparing ${type}...`, {
            style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' }
        });

        try {
            setIsProcessing(true);
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            // Using the new direct execution route for UI-triggered actions
            const response = await fetch(`${API_URL}/api/execute-single-action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: {
                        type,
                        params: { groupId: id, ...params }
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Action failed');
            }

            toast.success("Transaction Confirmed!", { id: idBatch });
            setIsBidOpen(false);
            fetchGroup();
        } catch (error) {
            toast.error(error.message, { id: idBatch });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCopyInvite = () => {
        const inviteLink = window.location.href;
        navigator.clipboard.writeText(inviteLink);
        toast.success('Invite link copied!', {
            icon: '🔗',
            style: { background: '#1f2937', color: '#fff' }
        });
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            <p className="text-dim font-bold animate-pulse">Synchronizing with Arc Testnet...</p>
        </div>
    );

    const potSize = parseFloat(group.contribution) * parseInt(group.maxMembers);
    const progress = Math.min((parseFloat(group.totalEscrow) / potSize) * 100, 100);
    const projectedDividend = (potSize * (bidAmount / 100)) / parseInt(group.maxMembers);

    return (
        <div className="group-detail-page relative overflow-hidden">
            <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-dim hover:text-white transition-colors mb-8 font-bold text-sm group"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Back to Dashboard
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card !p-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-3xl font-black text-white">{group.name}</h1>
                                    {group.isCreator && (
                                        <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-1 rounded font-black uppercase tracking-tighter border border-indigo-500/30">Admin / Creator</span>
                                    )}
                                </div>
                                <p className="text-dim text-sm font-medium flex items-center gap-2">
                                    <Shield size={14} className="text-indigo-400" />
                                    Secured by Arc Protocol • ID: {group.id}
                                </p>
                            </div>
                            <button
                                onClick={handleCopyInvite}
                                className="bg-white/5 hover:bg-white/10 p-3 rounded-xl transition-all border border-white/5 flex items-center gap-2 text-xs font-bold"
                            >
                                <Share2 size={16} />
                                Invite Link
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                <span className="text-[10px] text-dim block uppercase font-black mb-1 tracking-widest">Monthly Pot</span>
                                <span className="text-xl font-black text-white">{group.contribution} <span className="text-xs text-dim">USDC</span></span>
                            </div>
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                <span className="text-[10px] text-dim block uppercase font-black mb-1 tracking-widest">Cycle Status</span>
                                <span className="text-xl font-black text-indigo-400">Cycle #{group.currentCycle}</span>
                            </div>
                            <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                <span className="text-[10px] text-dim block uppercase font-black mb-1 tracking-widest">Total Pooled</span>
                                <span className="text-xl font-black text-success">{group.totalEscrow} <span className="text-xs text-dim">USDC</span></span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-sm font-bold text-white flex items-center gap-2">
                                    <Users size={18} className="text-dim" />
                                    Group Fulfillment
                                </span>
                                <span className="text-xs font-black text-dim italic">{group.memberCount} / {group.maxMembers} Members Ready</span>
                            </div>
                            <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    className="h-full bg-gradient-to-r from-indigo-600 via-violet-500 to-fuchsia-500 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                                ></motion.div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="glass-card">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
                                <Clock size={16} className="text-indigo-400" />
                                Auction Status
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs py-2 border-b border-white/5">
                                    <span className="text-dim">Duration</span>
                                    <span className="text-white font-bold">{parseInt(group.auctionDuration) / 3600} Hours</span>
                                </div>
                                <div className="flex justify-between text-xs py-2">
                                    <span className="text-dim">Status</span>
                                    <span className={`font-black uppercase ${group.auctionSettled ? 'text-dim' : 'text-success animate-pulse'}`}>
                                        {group.auctionSettled ? 'Settled' : 'Live Bidding'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="glass-card">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
                                <TrendingUp size={16} className="text-success" />
                                Yield Forecast
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs py-2 border-b border-white/5">
                                    <span className="text-dim">Est. Dividend</span>
                                    <span className="text-white font-bold">~2.5 USDC / month</span>
                                </div>
                                <div className="flex justify-between text-xs py-2">
                                    <span className="text-dim">Protocol Fee</span>
                                    <span className="text-white font-bold">1.0% (Arc)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Sidebar */}
                <div className="space-y-6">
                    <div className="glass-card bg-indigo-600/10 border-indigo-500/20">
                        <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                            <CreditCard size={20} className="text-indigo-400" />
                            Your Interaction
                        </h2>

                        {!group.isMember ? (
                            <div className="space-y-4">
                                <p className="text-xs text-dim leading-relaxed">
                                    Join this savings circle to participate in monthly rotations and earn yield from auction discounts.
                                </p>
                                <button
                                    onClick={() => handleAction('JOIN_GROUP')}
                                    disabled={isProcessing}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 p-4 rounded-2xl text-sm font-black text-white transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    Join This Circle <Plus size={18} />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-success/10 border border-success/20 p-3 rounded-xl flex items-center gap-3 mb-4">
                                    <Shield size={16} className="text-success" />
                                    <span className="text-[10px] font-black text-success uppercase">You are a member</span>
                                </div>

                                <button
                                    onClick={() => handleAction('CONTRIBUTE')}
                                    disabled={isProcessing}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 p-4 rounded-2xl text-sm font-black text-white transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    Deposit Contribution <Zap size={18} />
                                </button>

                                <button
                                    onClick={() => setIsBidOpen(true)}
                                    className="w-full bg-white/5 hover:bg-white/10 p-4 rounded-2xl text-sm font-black text-white transition-all border border-white/10 flex items-center justify-center gap-2"
                                >
                                    Place an Auction Bid <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="glass-card">
                        <h3 className="text-xs font-black uppercase tracking-widest text-dim mb-4">Quick Invite</h3>
                        <div className="bg-black/40 p-3 rounded-xl border border-white/5 mb-3">
                            <code className="text-[10px] text-indigo-300 break-all">{window.location.href}</code>
                        </div>
                        <p className="text-[10px] text-dim italic">Share this link with friends to help them find this specific circle instantly.</p>
                    </div>
                </div>
            </div>
            {/* Slide-out Bidding Panel */}
            <AnimatePresence>
                {isBidOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsBidOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0f172a] shadow-2xl z-50 p-8 border-l border-white/10"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                    <Gavel className="text-indigo-400" />
                                    Place Your Bid
                                </h2>
                                <button
                                    onClick={() => setIsBidOpen(false)}
                                    className="p-2 hover:bg-white/10 rounded-full text-dim transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-8">
                                <div className="bg-indigo-600/10 border border-indigo-500/20 p-6 rounded-3xl">
                                    <span className="text-xs font-black uppercase text-indigo-300 mb-4 block tracking-widest">Auction Discount (%)</span>
                                    <div className="flex justify-between items-end mb-6">
                                        <span className="text-5xl font-black text-white">{bidAmount}%</span>
                                        <span className="text-xs text-dim italic font-medium">Lower bid = Higher chance</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="30"
                                        value={bidAmount}
                                        onChange={(e) => setBidAmount(parseInt(e.target.value))}
                                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                    <div className="flex justify-between mt-2 text-[10px] font-black text-dim uppercase">
                                        <span>Min (1%)</span>
                                        <span>Safe Range</span>
                                        <span>Max (30%)</span>
                                    </div>
                                </div>

                                <div className="glass-card !bg-black/40 border-white/5 space-y-4">
                                    <h3 className="text-sm font-bold text-white mb-2">Bid Impact Analysis</h3>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-dim">Current Pot Size</span>
                                        <span className="text-xs font-bold text-white">{potSize} USDC</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t border-white/5 pt-4">
                                        <span className="text-xs text-dim">Your Projected Dividend</span>
                                        <span className="text-sm font-black text-success">+{projectedDividend.toFixed(2)} USDC</span>
                                    </div>
                                    <p className="text-[10px] text-dim italic leading-relaxed">
                                        *If you win this auction, members will receive this dividend immediately from the discount you provided.
                                    </p>
                                </div>

                                <button
                                    onClick={() => handleAction('BID', { discountAmount: bidAmount })}
                                    disabled={isProcessing}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 p-5 rounded-2xl text-sm font-black text-white transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {isProcessing ? 'Transacting...' : 'Broadcast Bid to Arc'} <ChevronRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GroupDetail;
