import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

/**
 * @title Arc Treasury Service
 * @dev Manages USDC treasury operations for Bol-DeFi ROSCA platform.
 */
class TreasuryService {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.usdcContract = null;
        this.treasuryVault = null;
        this.initialized = false;

        // USDC Contract Addresses
        this.USDC_ADDRESSES = {
            arc_testnet: '0x3600000000000000000000000000000000000000', // Native USDC on Arc
            sepolia: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
        };

        this.RPC_URLS = {
            arc_testnet: 'https://rpc.testnet.arc.network',
            sepolia: process.env.ALCHEMY_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo'
        };
    }

    /**
     * Initialize treasury connections
     */
    async initialize() {
        if (this.initialized) return;

        console.log('[Treasury] Initializing Arc treasury service...');

        // Setup provider and wallet
        const networkKey = process.env.NETWORK || 'arc_testnet';
        this.provider = new ethers.JsonRpcProvider(this.RPC_URLS[networkKey]);
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);

        // Initialize USDC contract
        const USDC_ABI = [
            "function balanceOf(address owner) view returns (uint256)",
            "function transfer(address to, uint256 amount) returns (bool)",
            "function approve(address spender, uint256 amount) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)",
            "function transferFrom(address from, address to, uint256 amount) returns (bool)",
            "function decimals() view returns (uint8)"
        ];

        const usdcAddress = this.USDC_ADDRESSES[networkKey];

        this.usdcContract = new ethers.Contract(usdcAddress, USDC_ABI, this.wallet);

        // Treasury vault address (could be a multi-sig in production)
        this.treasuryVault = process.env.TREASURY_VAULT_ADDRESS || this.wallet.address;

        this.initialized = true;
        console.log('[Treasury] Initialized with USDC:', usdcAddress);
        console.log('[Treasury] Vault address:', this.treasuryVault);
    }

    /**
     * Deposit USDC into the treasury vault
     */
    async depositUSDC(userAddress, amount) {
        if (!this.initialized) await this.initialize();

        console.log(`[Treasury] Processing deposit: ${amount} USDC from ${userAddress}`);

        const amountInWei = ethers.parseUnits(amount.toString(), 6); // USDC has 6 decimals

        try {
            // Check allowance
            const allowance = await this.usdcContract.allowance(userAddress, this.treasuryVault);

            if (allowance < amountInWei) {
                throw new Error(`Insufficient allowance. Please approve ${amount} USDC first.`);
            }

            // Transfer from user to treasury
            const tx = await this.usdcContract.transferFrom(
                userAddress,
                this.treasuryVault,
                amountInWei
            );

            const receipt = await tx.wait();

            console.log(`[Treasury] Deposit successful: ${receipt.hash}`);

            return {
                success: true,
                txHash: receipt.hash,
                amount: amount,
                from: userAddress,
                to: this.treasuryVault
            };

        } catch (error) {
            console.error('[Treasury] Deposit failed:', error.message);
            throw error;
        }
    }

    /**
     * Distribute USDC from treasury to a recipient
     */
    async distributeUSDC(recipientAddress, amount, reason = 'payout') {
        if (!this.initialized) await this.initialize();

        console.log(`[Treasury] Distributing ${amount} USDC to ${recipientAddress} (${reason})`);

        const amountInWei = ethers.parseUnits(amount.toString(), 6);

        try {
            // Check treasury balance
            const balance = await this.usdcContract.balanceOf(this.treasuryVault);

            if (balance < amountInWei) {
                throw new Error(`Insufficient treasury balance. Available: ${ethers.formatUnits(balance, 6)} USDC`);
            }

            // Transfer from treasury to recipient
            const tx = await this.usdcContract.transfer(recipientAddress, amountInWei);
            const receipt = await tx.wait();

            console.log(`[Treasury] Distribution successful: ${receipt.hash}`);

            return {
                success: true,
                txHash: receipt.hash,
                amount: amount,
                recipient: recipientAddress,
                reason: reason
            };

        } catch (error) {
            console.error('[Treasury] Distribution failed:', error.message);
            throw error;
        }
    }

    /**
     * Batch distribute USDC to multiple recipients
     */
    async batchDistribute(recipients) {
        if (!this.initialized) await this.initialize();

        console.log(`[Treasury] Batch distributing to ${recipients.length} recipients`);

        const results = [];

        for (const recipient of recipients) {
            try {
                const result = await this.distributeUSDC(
                    recipient.address,
                    recipient.amount,
                    recipient.reason || 'dividend'
                );
                results.push({ ...result, status: 'success' });
            } catch (error) {
                results.push({
                    address: recipient.address,
                    amount: recipient.amount,
                    status: 'failed',
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Get treasury vault balance
     */
    async getTreasuryBalance() {
        if (!this.initialized) await this.initialize();

        const balance = await this.usdcContract.balanceOf(this.treasuryVault);
        const formattedBalance = ethers.formatUnits(balance, 6);

        console.log(`[Treasury] Current balance: ${formattedBalance} USDC`);

        return {
            raw: balance.toString(),
            formatted: formattedBalance,
            currency: 'USDC'
        };
    }

    /**
     * Get user USDC balance
     */
    async getUserBalance(userAddress) {
        if (!this.initialized) await this.initialize();

        const balance = await this.usdcContract.balanceOf(userAddress);
        const formattedBalance = ethers.formatUnits(balance, 6);

        return {
            address: userAddress,
            raw: balance.toString(),
            formatted: formattedBalance,
            currency: 'USDC'
        };
    }

    /**
     * Approve ROSCA contract to spend USDC on behalf of treasury
     */
    async approveROSCAContract(roscaAddress, amount) {
        if (!this.initialized) await this.initialize();

        console.log(`[Treasury] Approving ROSCA contract ${roscaAddress} for ${amount} USDC`);

        const amountInWei = ethers.parseUnits(amount.toString(), 6);

        const tx = await this.usdcContract.approve(roscaAddress, amountInWei);
        const receipt = await tx.wait();

        console.log(`[Treasury] Approval successful: ${receipt.hash}`);

        return {
            success: true,
            txHash: receipt.hash,
            spender: roscaAddress,
            amount: amount
        };
    }
}

const treasuryService = new TreasuryService();
export default treasuryService;
