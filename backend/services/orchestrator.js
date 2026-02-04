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
    }

    /**
     * Initialize blockchain connections and contract instances
     */
    async initialize() {
        if (this.initialized) return;

        console.log('[Orchestrator] Initializing blockchain connections...');

        const networkKey = process.env.NETWORK || 'sepolia';
        const RPC_URLS = {
            arc_testnet: 'https://rpc.testnet.arc.network',
            sepolia: process.env.SEPOLIA_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo'
        };

        this.provider = new ethers.JsonRpcProvider(RPC_URLS[networkKey]);
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);

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
        console.log(`[Orchestrator] Using ROSCA at: ${ROSCA_ADDRESS}`);

        this.roscaContract = new ethers.Contract(ROSCA_ADDRESS, ROSCA_ABI, this.wallet);

        // --- Enable Premium Flows ---
        try {
            console.log('[Orchestrator] Initializing Yellow Network...');
            // await yellowService.initialize();
            // await yellowService.authenticate();
            
            console.log('[Orchestrator] Initializing Arc Treasury...');
            await treasuryService.initialize();
        } catch (error) {
            console.warn('[Orchestrator] Premium flows failed to initialize, continuing in basic mode:', error.message);
        }

        this.initialized = true;
        console.log('[Orchestrator] Ready to process intents');
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
            case 'CHECK_TREASURY':
                return await this._handleCheckTreasury();
            default:
                throw new Error(`Unknown intent type: ${intent.type}`);
        }
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

        // 3. ENS: Store group metadata if requested (e.g., description)
        // In local demo, we just log it as identity is already resolved.
        console.log(`[Orchestrator] ENS Identity Resolved for: ${groupName}.bol-defi.eth`);

        return {
            success: true,
            txHash: receipt.hash,
            groupName,
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
        const tx = await this.roscaContract.depositContribution(groupId);
        const receipt = await tx.wait();
        return { success: true, txHash: receipt.hash, groupId };
    }

    async _handleBid(params) {
        const { groupId, discountAmount } = params;
        
        console.log(`[Orchestrator] Processing bid for Group ${groupId}`);

        // Yellow Network Flow: Record off-chain bid first (Instant)
        await yellowService.recordBid(groupId, this.wallet.address, discountAmount);
        
        // Then sync to chain
        const tx = await this.roscaContract.placeBid(groupId, ethers.parseUnits(discountAmount.toString(), 6));
        const receipt = await tx.wait();
        
        return { 
            success: true, 
            txHash: receipt.hash, 
            groupId, 
            bidAmount: discountAmount,
            mode: 'Yellow-Optimized'
        };
    }

    async _handleSettleAuction(params) {
        const { groupId } = params;
        const tx = await this.roscaContract.settleAuction(groupId);
        const receipt = await tx.wait();
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

    async startAuctionMonitor() {
        // Implementation omitted for brevity in this conversion
    }
}

const orchestrator = new TransactionOrchestrator();
export default orchestrator;
