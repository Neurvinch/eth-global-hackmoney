import { NitroliteClient, WalletStateSigner, createECDSAMessageSigner, createAuthRequestMessage, createCreateChannelMessage, createResizeChannelMessage, createCloseChannelMessage } from '@erc7824/nitrolite';
import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import WebSocket from 'ws';
import dotenv from 'dotenv';
dotenv.config();

/**
 * @title Yellow Network Integration Service
 * @dev Production-ready Yellow Network Nitrolite SDK integration for Bol-DeFi.
 * Uses state channels for instant, zero-gas bidding and contributions.
 */
class YellowNetworkService {
    constructor() {
        this.client = null;
        this.ws = null;
        this.sessionSigner = null;
        this.account = null;
        this.isAuthenticated = false;
        this.activeChannels = new Map(); // groupId -> channelId

        // Yellow Network Sandbox Addresses (Sepolia)
        this.CUSTODY_ADDRESS = '0x019B65A265EB3363822f2752141b3dF16131b262';
        this.ADJUDICATOR_ADDRESS = '0x7c7ccbc98469190849BCC6c926307794fDfB11F2';
        this.YTEST_USD_TOKEN = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
        this.SANDBOX_WS = 'wss://clearnet-sandbox.yellow.com/ws';
        this.messagePromises = new Map();
    }

    /**
     * Step 1: Initialize the Nitrolite client and connect to Yellow Network
     */
    async initialize() {
        if (this.client) {
            console.log('[Yellow] Already initialized');
            return;
        }

        console.log('[Yellow] Initializing Nitrolite Client...');

        // Setup Viem clients
        this.account = privateKeyToAccount(process.env.PRIVATE_KEY);

        const publicClient = createPublicClient({
            chain: sepolia,
            transport: http(process.env.ALCHEMY_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/demo')
        });

        const walletClient = createWalletClient({
            chain: sepolia,
            transport: http(),
            account: this.account
        });

        // Initialize Nitrolite Client
        this.client = new NitroliteClient({
            publicClient,
            walletClient,
            stateSigner: new WalletStateSigner(walletClient),
            addresses: {
                custody: this.CUSTODY_ADDRESS,
                adjudicator: this.ADJUDICATOR_ADDRESS,
            },
            chainId: sepolia.id,
            challengeDuration: 3600n, // 1 hour
        });

        // Connect to sandbox WebSocket
        this.ws = new WebSocket(this.SANDBOX_WS);

        await new Promise((resolve, reject) => {
            this.ws.on('open', () => {
                console.log('[Yellow] Connected to sandbox node');
                resolve();
            });
            this.ws.on('error', reject);
        });

        // Setup message handlers
        this._setupMessageHandlers();

        console.log('[Yellow] Initialization complete');
    }

    /**
     * Step 2: Authenticate with the Yellow Network
     */
    async authenticate() {
        if (this.isAuthenticated) {
            console.log('[Yellow] Already authenticated');
            return;
        }

        console.log('[Yellow] Starting authentication flow...');

        // Generate temporary session key
        const sessionPrivateKey = generatePrivateKey();
        this.sessionSigner = createECDSAMessageSigner(sessionPrivateKey);
        const sessionAccount = privateKeyToAccount(sessionPrivateKey);

        const authRequestMsg = await createAuthRequestMessage({
            address: this.account.address,
            application: 'Bol-DeFi ROSCA Platform',
            session_key: sessionAccount.address,
            allowances: [{
                asset: 'ytest.usd',
                amount: '1000000000' // Large allowance for bidding
            }],
            expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour
            scope: 'bol-defi.rosca',
        });

        this.ws.send(authRequestMsg);

        // Wait for authentication to complete
        await this._waitForAuth();

        this.isAuthenticated = true;
        console.log('[Yellow] Authentication successful');
    }

    /**
     * Step 3: Create a state channel for a ROSCA group
     */
    async createChannel(groupId) {
        if (!this.isAuthenticated) {
            throw new Error('Must authenticate before creating channel');
        }

        console.log(`[Yellow] Creating channel for group ${groupId}...`);

        const createChannelMsg = await createCreateChannelMessage(
            this.sessionSigner,
            {
                chain_id: 11155111, // Sepolia
                token: this.YTEST_USD_TOKEN,
            }
        );

        this.ws.send(createChannelMsg);

        // Wait for response and submit to chain
        const { channel, unsignedInitialState, serverSignature } = await this._waitForChannelCreation();

        const createResult = await this.client.createChannel({
            channel,
            unsignedInitialState,
            serverSignature,
        });

        const channelId = channel.id;
        this.activeChannels.set(groupId, channelId);

        console.log(`[Yellow] Channel created: ${channelId}`);
        return channelId;
    }

    /**
     * Step 4: Fund the channel from Unified Balance
     */
    async fundChannel(groupId, amount) {
        const channelId = this.activeChannels.get(groupId);
        if (!channelId) {
            throw new Error('No active channel for this group');
        }

        console.log(`[Yellow] Funding channel ${channelId} with ${amount}...`);

        const resizeMsg = await createResizeChannelMessage(
            this.sessionSigner,
            {
                channel_id: channelId,
                allocate_amount: BigInt(amount), // Moves from Unified Balance -> Channel
                funds_destination: this.account.address,
            }
        );

        this.ws.send(resizeMsg);

        const { resizeState, proofStates } = await this._waitForResize();

        await this.client.resizeChannel({ resizeState, proofStates });

        console.log(`[Yellow] Channel funded successfully`);
    }

    /**
     * Step 5: Record off-chain bid
     */
    async recordBid(groupId, bidder, discountAmount) {
        console.log(`[Yellow] Recording off-chain bid: ${bidder} -> ${discountAmount}`);

        return {
            groupId,
            bidder,
            discountAmount,
            timestamp: Date.now(),
            offChain: true
        };
    }

    /**
     * Step 6: Close channel and settle on-chain
     */
    async closeChannel(groupId) {
        const channelId = this.activeChannels.get(groupId);
        if (!channelId) {
            throw new Error('No active channel for this group');
        }

        console.log(`[Yellow] Closing channel ${channelId}...`);

        const closeMsg = await createCloseChannelMessage(
            this.sessionSigner,
            channelId,
            this.account.address
        );

        this.ws.send(closeMsg);

        const { finalState, stateData } = await this._waitForClose();

        await this.client.closeChannel({ finalState, stateData });

        this.activeChannels.delete(groupId);

        console.log(`[Yellow] Channel closed and settled`);
    }

    /**
     * Step 7: Withdraw funds from custody contract to wallet
     */
    async withdrawFunds() {
        console.log('[Yellow] Withdrawing funds from custody contract...');

        const withdrawableBalance = await this.client.getWithdrawableBalance(
            this.YTEST_USD_TOKEN,
            this.account.address
        );

        if (withdrawableBalance === 0n) {
            console.log('[Yellow] No funds to withdraw');
            return null;
        }

        const withdrawalTx = await this.client.withdrawal(
            this.YTEST_USD_TOKEN,
            withdrawableBalance
        );

        console.log(`[Yellow] Funds withdrawn: ${withdrawalTx}`);
        return withdrawalTx;
    }

    // --- Internal Helper Methods ---

    _setupMessageHandlers() {
        this.ws.on('message', (data) => {
            const response = JSON.parse(data.toString());
            const type = response.res?.[0];

            // Resolve any waiting promises
            if (this.messagePromises.has(type)) {
                this.messagePromises.get(type)(response);
                this.messagePromises.delete(type);
            }
        });
    }

    async _withTimeout(promise, ms, operationName) {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(`Yellow Network operation "${operationName}" timed out after ${ms}ms`));
            }, ms);
        });

        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async _waitForAuth() {
        const promise = new Promise((resolve) => {
            this.messagePromises.set('auth_success', resolve);
        });
        return this._withTimeout(promise, 10000, 'Authentication');
    }

    async _waitForChannelCreation() {
        const promise = new Promise((resolve) => {
            this.messagePromises.set('create_channel', (response) => {
                resolve(response.res[2]);
            });
        });
        return this._withTimeout(promise, 15000, 'Channel Creation');
    }

    async _waitForResize() {
        const promise = new Promise((resolve) => {
            this.messagePromises.set('resize_channel', (response) => {
                resolve(response.res[2]);
            });
        });
        return this._withTimeout(promise, 15000, 'Resize Channel');
    }

    async _waitForClose() {
        const promise = new Promise((resolve) => {
            this.messagePromises.set('close_channel', (response) => {
                resolve(response.res[2]);
            });
        });
        return this._withTimeout(promise, 15000, 'Close Channel');
    }
}

const yellowService = new YellowNetworkService();
export default yellowService;
