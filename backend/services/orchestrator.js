const { ethers } = require('ethers');
const yellowService = require('./yellowService');
const ensService = require('./ensService');
const treasuryService = require('./treasuryService');
const { extractIntent } = require('./nlpServices');
require('dotenv').config();

/**
 * @title Bol-DeFi Transaction Orchestrator
 * @dev Central coordination service that bridges AI intent → Yellow Network → ROSCA → Arc
 * This is the "brain" that executes user intents end-to-end.
 */
class TransactionOrchestrator {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.roscaContract = null;
        this.initialized = false;

        // Track active Yellow channels per group
        this.activeAuctions = new Map(); // groupId -> { channelId, endTime, highestBid }
    }

    /**
     * Initialize blockchain connections and contract instances
     */
    async initialize() {
        if (this.initialized) return;

        console.log('[Orchestrator] Initializing blockchain connections...');

        // Setup provider and wallet
        const networkKey = process.env.NETWORK || 'arc_testnet';
        const RPC_URLS = {
            arc_testnet: 'https://rpc.testnet.arc.network',
            sepolia: process.env.ALCHEMY_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo'
        };

        this.provider = new ethers.JsonRpcProvider(RPC_URLS[networkKey]);
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);

        // Load ROSCA contract (you'll need to deploy and set this address)
        const ROSCA_ABI = [
            "function createGroup(string name, uint256 contribution, uint256 maxMembers, uint256 cycleDuration, uint256 auctionDuration, uint256 minDiscount) external",
            "function joinGroup(uint256 groupId) external",
            "function depositContribution(uint256 groupId) external",
            "function placeBid(uint256 groupId, uint256 discount) external",
            "function settleAuction(uint256 groupId) external",
            "function withdrawDividends() external",
            "function groups(uint256) view returns (string name, uint256 contribution, uint256 maxMembers, uint256 cycleDuration, uint256 auctionDuration, uint256 minDiscount, uint256 currentCycle, uint256 cycleStartTime, uint256 totalEscrow)",
            "function getHighestBid(uint256 groupId) view returns (address bidder, uint256 discount)",
            "event BidPlaced(uint256 indexed groupId, address indexed bidder, uint256 discount)"
        ];

        const ROSCA_ADDRESS = process.env.ROSCA_CONTRACT_ADDRESS;
        this.roscaContract = new ethers.Contract(ROSCA_ADDRESS, ROSCA_ABI, this.wallet);

        // Initialize Yellow Network service
        await yellowService.initialize();
        await yellowService.authenticate();

        this.initialized = true;
        console.log('[Orchestrator] Ready to process intents');
    }

    /**
     * Main entry point: Process a user intent and execute the appropriate action
     * @param {Object} intent - The AI-extracted intent from voice
     */
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

            default:
                throw new Error(`Unknown intent type: ${intent.type}`);
        }
    }

    /**
     * CREATE_GROUP: Deploy a new ROSCA savings circle
     */
    async _handleCreateGroup(params) {
        const {
            groupName,
            contributionAmount,
            maxMembers = 10,
            cycleDuration = 30 * 24 * 60 * 60, // 30 days default
            auctionDuration = 2 * 24 * 60 * 60,  // 2 days default
            minDefaultDiscount = ethers.parseUnits("100", 6) // 100 USDC default
        } = params;

        console.log(`[Orchestrator] Creating group: ${groupName}`);

        // Optional: Store group metadata in ENS
        // await ensService.setText(`${groupName}.bol-defi.eth`, "description", params.description);

        const tx = await this.roscaContract.createGroup(
            groupName,
            ethers.parseUnits(contributionAmount.toString(), 6), // USDC has 6 decimals
            maxMembers,
            cycleDuration,
            auctionDuration,
            minDefaultDiscount
        );

        const receipt = await tx.wait();
        console.log(`[Orchestrator] Group created: ${receipt.hash}`);

        return {
            success: true,
            txHash: receipt.hash,
            groupName
        };
    }

    /**
     * JOIN_GROUP: Add user to an existing savings circle
     */
    async _handleJoinGroup(params) {
        const { groupId } = params;

        console.log(`[Orchestrator] Joining group ${groupId}`);

        const tx = await this.roscaContract.joinGroup(groupId);
        const receipt = await tx.wait();

        return {
            success: true,
            txHash: receipt.hash,
            groupId
        };
    }

    /**
     * CONTRIBUTE: Deposit monthly contribution to ROSCA escrow
     */
    async _handleContribute(params) {
        const { groupId } = params;

        console.log(`[Orchestrator] Depositing contribution for group ${groupId}`);

        // Note: User must approve USDC spending first
        // This would be handled in the frontend with wallet.approve()

        const tx = await this.roscaContract.depositContribution(groupId);
        const receipt = await tx.wait();

        return {
            success: true,
            txHash: receipt.hash,
            groupId
        };
    }

    /**
     * BID: Handle auction bidding via Yellow Network (instant, zero-gas)
     * Periodically syncs highest bid to ROSCA contract
     */
    async _handleBid(params) {
        const { groupId, discountAmount } = params;

        console.log(`[Orchestrator] Processing bid: ${discountAmount} for group ${groupId}`);

        // 1. Check if Yellow channel exists for this group
        let auctionState = this.activeAuctions.get(groupId);

        if (!auctionState) {
            // Create new Yellow channel for this auction
            const channelId = await yellowService.createChannel(groupId);

            // Get auction end time from contract
            const groupData = await this.roscaContract.groups(groupId);
            const endTime = Number(groupData.cycleStartTime) + Number(groupData.auctionDuration);

            auctionState = {
                channelId,
                endTime,
                highestBid: 0,
                highestBidder: null
            };

            this.activeAuctions.set(groupId, auctionState);
        }

        // 2. Record bid in Yellow Network (instant, off-chain)
        await yellowService.recordBid(groupId, this.wallet.address, discountAmount);

        // 3. Update local tracking
        if (discountAmount > auctionState.highestBid) {
            auctionState.highestBid = discountAmount;
            auctionState.highestBidder = this.wallet.address;

            // 4. Sync to ROSCA contract (can be batched or only done for significant increases)
            const currentOnChainBid = await this.roscaContract.getHighestBid(groupId);

            if (discountAmount > Number(currentOnChainBid.discount)) {
                console.log(`[Orchestrator] New high bid! Syncing to contract...`);
                const tx = await this.roscaContract.placeBid(groupId, ethers.parseUnits(discountAmount.toString(), 6));
                await tx.wait();
            }
        }

        return {
            success: true,
            offChain: true,
            groupId,
            bidAmount: discountAmount,
            isHighest: discountAmount === auctionState.highestBid
        };
    }

    /**
     * FINALIZE: Close auction and settle on ROSCA contract
     */
    async _handleSettleAuction(params) {
        const { groupId } = params;

        console.log(`[Orchestrator] Settling auction for group ${groupId}`);

        // 1. Check if auction period has ended
        const groupData = await this.roscaContract.groups(groupId);
        const currentTime = Math.floor(Date.now() / 1000);
        const auctionEndTime = Number(groupData.cycleStartTime) + Number(groupData.auctionDuration);

        if (currentTime < auctionEndTime) {
            throw new Error(`Auction still ongoing. Ends at ${new Date(auctionEndTime * 1000).toISOString()}`);
        }

        // 2. Close Yellow channel if it exists
        const auctionState = this.activeAuctions.get(groupId);
        if (auctionState) {
            await yellowService.closeChannel(groupId);
            this.activeAuctions.delete(groupId);
        }

        // 3. Settle on ROSCA contract
        const tx = await this.roscaContract.settleAuction(groupId);
        const receipt = await tx.wait();

        console.log(`[Orchestrator] Auction settled: ${receipt.hash}`);

        // 4. Parse events to get winner and payout details
        const logs = receipt.logs;

        return {
            success: true,
            txHash: receipt.hash,
            groupId,
            settled: true
        };
    }

    /**
     * Helper: Monitor auction timers and auto-settle when ready
     */
    async startAuctionMonitor() {
        setInterval(async () => {
            for (const [groupId, auctionState] of this.activeAuctions.entries()) {
                const currentTime = Math.floor(Date.now() / 1000);

                if (currentTime >= auctionState.endTime) {
                    console.log(`[Orchestrator] Auto-settling auction for group ${groupId}`);
                    try {
                        await this._handleSettleAuction({ groupId });
                    } catch (error) {
                        console.error(`Failed to auto-settle group ${groupId}:`, error);
                    }
                }
            }
        }, 60000); // Check every minute
    }
}

module.exports = new TransactionOrchestrator();
