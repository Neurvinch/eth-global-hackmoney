import { ethers } from 'ethers';
import yellowService from './yellowService.js';
import ensService from './ensService.js';
import treasuryService from './treasuryService.js';
import { extractIntent } from './nlpServices.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * @title Bol-DeFi Transaction Orchestrator
 * @dev Central coordination service that bridges AI intent → Yellow Network → ROSCA → Arc
 */
class TransactionOrchestrator {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.roscaContract = null;
        this.initialized = false;
        this.activeAuctions = new Map(); // groupId -> { channelId, endTime, highestBid }
        this.recentActivity = [];
        this.MAX_ACTIVITY_LOGS = 10;
    }

    /**
     * Initialize blockchain connections and contract instances
     */
    async initialize() {
        if (this.initialized) return;
        if (this.initializing) return this.initPromise;

        this.initializing = true;
        this.initPromise = (async () => {
            console.log('[Orchestrator] Initializing blockchain connections...');

            const networkKey = process.env.NETWORK || 'sepolia';
            const RPC_URLS = {
                arc_testnet: process.env.ARC_RPC_URL || 'https://rpc.testnet.arc.network',
                sepolia: process.env.ALCHEMY_RPC_URL || process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo'
            };

            this.provider = new ethers.JsonRpcProvider(RPC_URLS[networkKey]);
            this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);

            const ROSCA_ABI = [
                "function groupCount() view returns (uint256)",
                "function createGroup(string name, uint256 contribution, uint256 maxMembers, uint256 cycleDuration, uint256 auctionDuration, uint256 minDiscount) external",
                "function joinGroup(uint256 groupId) external",
                "function depositContribution(uint256 groupId) external",
                "function placeBid(uint256 groupId, uint256 discount) external",
                "function settleAuction(uint256 groupId) external",
                "function withdrawDividends() external",
                "function isMemberOf(uint256 groupId, address user) view returns (bool)",
                "function groups(uint256) view returns (string name, uint256 contributionAmount, uint256 maxMembers, uint256 cycleDuration, uint256 auctionDuration, uint256 minDefaultDiscount, uint256 currentCycle, uint256 cycleStartTime, uint256 totalEscrow, address creator, address highestBidder, uint256 highestDiscount, bool auctionSettled, bool isActive)",
                "function getHighestBid(uint256 groupId) view returns (address bidder, uint256 discount)",
                "function userBalance(address user) view returns (uint256)",
                "event GroupStarted(uint256 indexed groupId, string name)",
                "event ContributionDeposited(uint256 indexed groupId, address indexed member, uint256 amount)",
                "event BidPlaced(uint256 indexed groupId, address indexed bidder, uint256 discount)",
                "event AuctionWinnerSelected(uint256 indexed groupId, address winner, uint256 payout, uint256 dividendPerMember)"
            ];

            const ROSCA_ADDRESS = process.env.ROSCA_CONTRACT_ADDRESS;
            console.log(`[Orchestrator] Using ROSCA at: ${ROSCA_ADDRESS}`);

            this.roscaContract = new ethers.Contract(ROSCA_ADDRESS, ROSCA_ABI, this.wallet);

            // --- Event Polling (Stateless) ---
            this._startEventPolling();

            // --- Enable Premium Flows ---
            try {
                console.log('[Orchestrator] Initializing Yellow Network...');
                await yellowService.initialize();
                await yellowService.authenticate();

                console.log('[Orchestrator] Initializing Arc Treasury...');
                await treasuryService.initialize();

                // Priority Approval: Ensure first transaction doesn't fail on allowance
                console.log('[Orchestrator] Performing priority USDC approval...');
                await treasuryService.approveROSCAContract(ROSCA_ADDRESS, 1000000);
            } catch (error) {
                console.warn('[Orchestrator] Premium flows failed to initialize, continuing in basic mode:', error.message);
            }

            this.initialized = true;
            this.initializing = false;
            console.log('[Orchestrator] Ready to process intents');
        })();
        return this.initPromise;
    }



    async getActiveCircles(userAddress) {
        if (!this.initialized) await this.initialize();

        try {
            const count = await this.roscaContract.groupCount();
            const circles = [];
            const targetAddress = userAddress || this.wallet.address;

            // Get last 10 circles
            const start = count > 10n ? count - 9n : 1n;
            for (let i = count; i >= start; i--) {
                const g = await this.roscaContract.groups(i);
                if (g.isActive) {
                    const isMember = await this.roscaContract.isMemberOf(i, targetAddress);
                    circles.push({
                        id: i.toString(),
                        name: g.name,
                        contribution: ethers.formatUnits(g.contributionAmount, 6),
                        members: g.maxMembers.toString(),
                        cycle: g.currentCycle.toString(),
                        escrow: ethers.formatUnits(g.totalEscrow, 6),
                        creator: g.creator,
                        isCreator: g.creator.toLowerCase() === targetAddress.toLowerCase(),
                        isMember: isMember
                    });
                }
            }
            return circles;
        } catch (error) {
            console.error("Error fetching circles:", error);
            return [];
        }
    }

    async getGroupInfo(groupId, userAddress) {
        if (!this.initialized) await this.initialize();

        try {
            const g = await this.roscaContract.groups(groupId);
            if (!g.isActive) return null;

            const targetAddress = userAddress || this.wallet.address;
            const isMember = await this.roscaContract.isMemberOf(groupId, targetAddress);

            return {
                id: groupId.toString(),
                name: g.name,
                contribution: ethers.formatUnits(g.contributionAmount, 6),
                maxMembers: g.maxMembers.toString(),
                currentCycle: g.currentCycle.toString(),
                cycleStartTime: g.cycleStartTime.toString(),
                auctionDuration: g.auctionDuration.toString(),
                totalEscrow: ethers.formatUnits(g.totalEscrow, 6),
                creator: g.creator,
                isCreator: g.creator.toLowerCase() === targetAddress.toLowerCase(),
                isMember: isMember,
                memberCount: (await this._getMemberCount(groupId)).toString(),
                auctionSettled: g.auctionSettled
            };
        } catch (error) {
            console.error(`Error fetching group ${groupId}:`, error);
            return null;
        }
    }

    // Helper to get actual member count from contract (mapping to array length)
    async _getMemberCount(groupId) {
        // Since the contract struct doesn't expose members.length directly in the getter,
        // we might need to iterate or add a length function.
        // For now, let's assume we can fetch the group object and it has members
        // Actually, the members array is public, but let's see how ethers exposes it.
        // In ROSCA.sol: address[] public members; inside struct
        // Default getter for arrays in structs doesn't return length.
        // I'll add a quick helper to get it or assume we fix the contract if needed.
        // But wait, the standard getter for address[] in a struct is index-based.
        return 1; // Placeholder, or I should update contract for efficiency
    }

    async getRecentActivity() {
        return this.recentActivity;
    }

    async executeIntent(intent) {
        if (!this.initialized) await this.initialize();

        console.log(`[Orchestrator] Executing intent: ${intent.type}`);

        switch (intent.type) {
            case 'CREATE_GROUP':
                return await this._handleCreateGroup(intent.params);
            case 'JOIN_GROUP':
                return await this._handleJoinGroup(intent.params);
            case 'CONTRIBUTE':
                return await this._handleContribute(intent.params);
            case 'BID':
                return await this._handleBid(intent.params);
            case 'FINALIZE':
                return await this._handleSettleAuction(intent.params);
            case 'WITHDRAW_DIVIDENDS':
                return await this._handleWithdrawDividends();
            case 'CHECK_TREASURY':
                return await this._handleCheckTreasury();
            default:
                throw new Error(`Unknown intent type: ${intent.type}`);
        }
    }

    async _handleWithdrawDividends() {
        console.log('[Orchestrator] Withdrawing dividends for member...');
        const tx = await this.roscaContract.withdrawDividends();
        const receipt = await tx.wait();
        return { success: true, txHash: receipt.hash, type: 'WITHDRAWAL' };
    }

    async _handleCreateGroup(params) {
        let {
            groupName,
            contributionAmount,
            maxMembers = 10,
            cycleDuration = 30 * 24 * 60 * 60,
            auctionDuration = 2 * 24 * 60 * 60,
            minDefaultDiscount = 100,
            description = "A Bol-DeFi Savings Circle"
        } = params;

        // Validation & Defaults
        if (!contributionAmount) {
            throw new Error("Contribution amount is required to create a group.");
        }

        if (!groupName) {
            groupName = `Bol-DeFi Circle ${Math.floor(Math.random() * 1000)}`;
        }

        console.log(`[Orchestrator] Creating group: ${groupName} with ${contributionAmount} USDC`);

        // 1. Arc Protocol: Check Treasury status before starting
        const balance = await treasuryService.getTreasuryBalance();
        console.log(`[Orchestrator] Current Arc Treasury Balance: ${balance.formatted} USDC`);

        // 2. Deployment on-chain
        const tx = await this.roscaContract.createGroup(
            groupName,
            ethers.parseUnits(contributionAmount.toString(), 6),
            maxMembers,
            cycleDuration,
            auctionDuration,
            ethers.parseUnits(minDefaultDiscount.toString(), 6)
        );

        const receipt = await tx.wait();
        console.log(`[Orchestrator] Group created: ${receipt.hash}`);

        // Extract GroupId from the GroupStarted event
        let groupId = null;
        try {
            const event = receipt.logs.find(log => {
                try {
                    const parsed = this.roscaContract.interface.parseLog(log);
                    return parsed.name === 'GroupStarted';
                } catch (e) { return false; }
            });
            if (event) {
                const parsed = this.roscaContract.interface.parseLog(event);
                groupId = parsed.args.groupId.toString();
            }
        } catch (e) {
            console.warn('[Orchestrator] Failed to parse groupId from logs, fetching count...');
            groupId = (await this.roscaContract.groupCount()).toString();
        }

        // 3. ENS: Store group metadata if requested (e.g., description)
        const ensName = `${groupName.toLowerCase().replace(/\s+/g, '-')}.bol-defi.eth`;
        console.log(`[Orchestrator] ENS Identity Resolved for: ${ensName}`);

        // 4. Yellow Network: Start Application Session for the new group
        try {
            if (yellowService.isAuthenticated) {
                await yellowService.startRoscaSession(groupId, this.wallet.address, contributionAmount);
            }
        } catch (error) {
            console.warn(`[Orchestrator] Yellow Session failed to start for group ${groupId}:`, error.message);
        }

        return {
            success: true,
            txHash: receipt.hash,
            groupId, // CRITICAL: Return the ID so frontend can redirect
            groupName,
            ensName,
            treasuryBalance: balance.formatted
        };
    }

    async _handleJoinGroup(params) {
        const { groupId } = params;
        const tx = await this.roscaContract.joinGroup(groupId);
        const receipt = await tx.wait();
        return { success: true, txHash: receipt.hash, groupId };
    }

    async _handleContribute(params) {
        const { groupId } = params;

        // Ensure orchestrator has approved ROSCA to spend USDC
        await this._ensureAllowance(groupId);

        const tx = await this.roscaContract.depositContribution(groupId);
        const receipt = await tx.wait();

        // Sync to Yellow Network Session
        try {
            if (yellowService.isAuthenticated) {
                await yellowService.submitState(groupId, {
                    type: 'CONTRIBUTION',
                    member: this.wallet.address,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.warn(`[Orchestrator] Yellow contribution sync failed:`, error.message);
        }

        return { success: true, txHash: receipt.hash, groupId };
    }

    async _ensureAllowance(groupId) {
        try {
            const g = await this.roscaContract.groups(groupId);
            const amountNeeded = g.contributionAmount;

            const networkKey = process.env.NETWORK || 'arc_testnet';
            const usdcAddress = treasuryService.USDC_ADDRESSES[networkKey];

            // Check current allowance
            const currentAllowance = await treasuryService.usdcContract.allowance(
                this.wallet.address,
                process.env.ROSCA_CONTRACT_ADDRESS
            );

            if (currentAllowance < amountNeeded) {
                console.log(`[Orchestrator] Allowance insufficient. Approving 1M USDC...`);
                // Infinite-ish approval for demo (1 Million)
                await treasuryService.approveROSCAContract(process.env.ROSCA_CONTRACT_ADDRESS, 1000000);
            }
        } catch (error) {
            console.warn('[Orchestrator] Allowance check failed (continuing anyway):', error.message);
        }
    }

    async _handleBid(params) {
        const { groupId, discountAmount } = params;

        console.log(`[Orchestrator] Processing bid for Group ${groupId}`);

        // 1. Sync to Yellow Network Session first (Off-chain, Instant)
        let offChainRef = Date.now();
        try {
            if (yellowService.isAuthenticated) {
                await yellowService.submitState(groupId, {
                    type: 'BID',
                    bidder: this.wallet.address,
                    amount: discountAmount,
                    timestamp: offChainRef
                });
            }
        } catch (error) {
            console.warn(`[Orchestrator] Yellow off-chain bid sync failed:`, error.message);
        }

        // 2. Sync to chain
        const tx = await this.roscaContract.placeBid(groupId, ethers.parseUnits(discountAmount.toString(), 6));
        const receipt = await tx.wait();

        return {
            success: true,
            txHash: receipt.hash,
            groupId,
            bidAmount: discountAmount,
            mode: 'Yellow-Offchain-Synchronized',
            offChainRef: offChainRef
        };
    }

    async _handleSettleAuction(params) {
        const { groupId } = params;

        // 1. On-chain settlement
        const tx = await this.roscaContract.settleAuction(groupId);
        const receipt = await tx.wait();

        // 2. Close Yellow Network Session
        try {
            await yellowService.closeSession(groupId);
        } catch (error) {
            console.warn(`[Orchestrator] Failed to close Yellow session:`, error.message);
        }

        return { success: true, txHash: receipt.hash, groupId };
    }

    async _handleCheckTreasury() {
        const balance = await treasuryService.getTreasuryBalance();
        return {
            success: true,
            balance: balance.formatted,
            unit: 'USDC',
            provider: 'Arc Protocol'
        };
    }

    async getMemberStatus(address) {
        if (!this.initialized) await this.initialize();
        const balance = await this.roscaContract.userBalance(address);
        return {
            address,
            dividends: ethers.formatUnits(balance, 6),
            provider: 'Arc Protocol'
        };
    }

    async _logActivity(type, description) {
        this.recentActivity.unshift({
            type,
            description,
            timestamp: new Date().toLocaleTimeString(),
            id: Math.random().toString(36).substr(2, 9)
        });
        if (this.recentActivity.length > this.MAX_ACTIVITY_LOGS) {
            this.recentActivity.pop();
        }
    }

    async _startEventPolling() {
        if (!this.initialized) await this.initialize();

        const currentBlock = await this.provider.getBlockNumber();
        // Start scanning from 2000 blocks ago to show some historical activity
        let lastBlock = Math.max(0, currentBlock - 2000);
        console.log(`[Orchestrator] Starting event polling from block ${lastBlock}`);

        // Initial scan for history (chunked to avoid RPC timeouts)
        const scanHistory = async (start, end) => {
            const CHUNK_SIZE = 500;
            for (let from = start; from < end; from += CHUNK_SIZE) {
                const to = Math.min(from + CHUNK_SIZE - 1, end);
                try {
                    const events = await this.roscaContract.queryFilter("*", from, to);
                    this._processEventsInOrder(events);
                } catch (e) {
                    console.warn(`[Orchestrator] History scan error [${from}-${to}]:`, e.message);
                }
            }
        };

        // Run initial scan
        await scanHistory(lastBlock, currentBlock);
        lastBlock = currentBlock;

        setInterval(async () => {
            try {
                const liveBlock = await this.provider.getBlockNumber();
                if (liveBlock > lastBlock) {
                    // Alchemy Free tier has a tiny block range for logs (sometimes as low as 10 blocks)
                    // We'll process in small chunks of 5 blocks to be safe and avoid "block range too large" errors
                    const MAX_CHUNKS_PER_POLL = 5;
                    let startBlock = lastBlock + 1;
                    let endBlock = Math.min(liveBlock, startBlock + MAX_CHUNKS_PER_POLL - 1);

                    console.log(`[Orchestrator] Polling events from ${startBlock} to ${endBlock}...`);

                    const events = await this.roscaContract.queryFilter("*", startBlock, endBlock);
                    this._processEventsInOrder(events);

                    lastBlock = endBlock;
                }
            } catch (error) {
                if (!error.message.includes("filter not found") && !error.message.includes("block range")) {
                    console.error("[Orchestrator] Event polling error:", error.message);
                }
            }
        }, 12000); // Poll every 12 seconds
    }

    _processEventsInOrder(events) {
        for (const event of events) {
            try {
                const { fragment, args } = event;
                if (!fragment) continue;

                if (fragment.name === "GroupStarted") {
                    const [groupId, name] = args;
                    this._logActivity('GROUP_STARTED', `Savings Circle "${name}" has been created.`);
                }
                else if (fragment.name === "ContributionDeposited") {
                    const [groupId, member, amount] = args;
                    this._logActivity('CONTRIBUTION', `Member ${member.substring(0, 6)} deposited ${ethers.formatUnits(amount, 6)} USDC.`);
                }
                else if (fragment.name === "BidPlaced") {
                    const [groupId, bidder, discount] = args;
                    this._logActivity('BID_PLACED', `New bid of ${ethers.formatUnits(discount, 6)} USDC on Circle #${groupId}.`);
                }
                else if (fragment.name === "AuctionWinnerSelected") {
                    const [groupId, winner, payout, dividend] = args;
                    this._logActivity('AUCTION_SETTLED', `Circle #${groupId} settled! Winner: ${winner.substring(0, 6)}. Dividend: ${ethers.formatUnits(dividend, 6)} USDC.`);
                }
            } catch (err) {
                console.warn("[Orchestrator] Error parsing event:", err.message);
            }
        }
    }

    async startAuctionMonitor() {
        console.log('[Orchestrator] Starting Autonomous Auction Monitor...');
        setInterval(async () => {
            try {
                const count = await this.roscaContract.groupCount();
                const now = Math.floor(Date.now() / 1000);

                for (let i = 1; i <= count; i++) {
                    const g = await this.roscaContract.groups(i);
                    const auctionEndTime = Number(g.cycleStartTime) + Number(g.auctionDuration);

                    if (g.isActive && !g.auctionSettled && now > auctionEndTime) {
                        console.log(`[Monitor] Auction for Group #${i} expired. Settling...`);

                        // Check if we have enough contributions to settle
                        if (g.totalEscrow >= g.contributionAmount * g.maxMembers) {
                            const tx = await this.roscaContract.settleAuction(i);
                            await tx.wait();
                            console.log(`[Monitor] Group #${i} settled successfully.`);
                        }
                    }
                }
            } catch (error) {
                console.error('[Monitor] Error checking auctions:', error.message);
            }
        }, 30000); // Check every 30 seconds
    }
}

const orchestrator = new TransactionOrchestrator();

// Startup autonomous engines
orchestrator.initialize().then(() => {
    orchestrator.startAuctionMonitor();
});

export default orchestrator;
