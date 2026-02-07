import {
    NitroliteClient,
    WalletStateSigner,
    createECDSAMessageSigner,
    createAuthRequestMessage,
    createAuthVerifyMessage,
    createEIP712AuthMessageSigner,
    createAppSessionMessage,
    createSubmitAppStateMessage,
    createCloseAppSessionMessage
} from '@erc7824/nitrolite';
import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import WebSocket from 'ws';
import dotenv from 'dotenv';
dotenv.config();

/**
 * @title Yellow Network Integration Service (Refactored)
 * @dev Implements EIP-712 Auth and Application Sessions for off-chain ROSCA logic.
 */
class YellowNetworkService {
    constructor() {
        this.client = null;
        this.ws = null;
        this.sessionSigner = null;
        this.account = null;
        this.walletClient = null;
        this.isAuthenticated = false;
        this.activeSessions = new Map(); // groupId -> appSessionId
        this.messagePromises = new Map();

        // Configuration
        this.CUSTODY_ADDRESS = '0x019B65A265EB3363822f2752141b3dF16131b262';
        this.ADJUDICATOR_ADDRESS = '0x7c7ccbc98469190849BCC6c926307794fDfB11F2';
        this.SANDBOX_WS = 'wss://clearnet-sandbox.yellow.com/ws';
    }

    async initialize() {
        if (this.client) return;

        this.account = privateKeyToAccount(process.env.PRIVATE_KEY);

        const publicClient = createPublicClient({
            chain: sepolia,
            transport: http(process.env.ALCHEMY_RPC_URL)
        });

        this.walletClient = createWalletClient({
            chain: sepolia,
            transport: http(),
            account: this.account
        });

        this.client = new NitroliteClient({
            publicClient,
            walletClient: this.walletClient,
            stateSigner: new WalletStateSigner(this.walletClient),
            addresses: { custody: this.CUSTODY_ADDRESS, adjudicator: this.ADJUDICATOR_ADDRESS },
            chainId: sepolia.id,
        });

        this.ws = new WebSocket(this.SANDBOX_WS);
        this._setupMessageHandlers();

        return new Promise((resolve, reject) => {
            this.ws.on('open', () => {
                console.log('[Yellow] WebSocket Connected');
                resolve();
            });
            this.ws.on('error', reject);
        });
    }

    /**
     * Proper EIP-712 Authentication Flow
     */
    async authenticate() {
        if (this.isAuthenticated) return;

        console.log('[Yellow] Authenticating with EIP-712 challenge...');

        const sessionPrivateKey = generatePrivateKey();
        const sessionAccount = privateKeyToAccount(sessionPrivateKey);
        this.sessionSigner = createECDSAMessageSigner(sessionPrivateKey);

        const authParams = {
            address: this.account.address,
            application: 'Bol-DeFi ROSCA',
            session_key: sessionAccount.address,
            scope: 'bol-defi.rosca',
            expires_at: BigInt(Math.floor(Date.now() / 1000) + 3600),
            allowances: [{ asset: 'usdc', amount: '1000000000' }]
        };

        const authRequestMsg = await createAuthRequestMessage(authParams);
        this.ws.send(authRequestMsg);

        // 1. Wait for Challenge
        const challengeRes = await this._waitForMessage('auth_challenge');
        console.log('[Yellow] Challenge received, signing...');

        // 2. Sign Challenge (EIP-712)
        const eipSigner = createEIP712AuthMessageSigner(
            this.walletClient,
            authParams,
            { name: 'Yellow Network Sandbox' }
        );

        const authVerifyMsg = await createAuthVerifyMessage(eipSigner, challengeRes.res[2]);
        this.ws.send(authVerifyMsg);

        // 3. Wait for Success
        await this._waitForMessage('auth_success');
        this.isAuthenticated = true;
        console.log('[Yellow] EIP-712 Auth Successful');
    }

    /**
     * Start an Application Session for a ROSCA Group
     */
    async startRoscaSession(groupId, creatorAddress, contributionAmount) {
        console.log(`[Yellow] Starting Application Session for Group ${groupId}...`);

        const appDefinition = {
            protocol: 'nitroliterpc',
            participants: [creatorAddress],
            weights: [100],
            quorum: 100,
            challenge: 0,
            nonce: Date.now(),
        };

        const allocations = [{
            participant: creatorAddress,
            asset: 'usdc',
            amount: contributionAmount.toString()
        }];

        const sessionMsg = await createAppSessionMessage(this.sessionSigner, [{
            definition: appDefinition,
            allocations: allocations
        }]);

        this.ws.send(sessionMsg);
        const response = await this._waitForMessage('create_app_session');

        const sessionId = response.res[2].app_session_id;
        this.activeSessions.set(groupId, sessionId);

        console.log(`[Yellow] Rosca Session Active: ${sessionId}`);
        return sessionId;
    }

    /**
     * Submit off-chain state (e.g., a Bid)
     */
    async submitState(groupId, stateData) {
        const sessionId = this.activeSessions.get(groupId);
        if (!sessionId) throw new Error('No active session for group');

        console.log(`[Yellow] Submitting off-chain state to session ${sessionId}`);

        const stateMsg = await createSubmitAppStateMessage(this.sessionSigner, {
            app_session_id: sessionId,
            state: stateData
        });

        this.ws.send(stateMsg);
        await this._waitForMessage('submit_app_state');
        console.log('[Yellow] State submitted successfully');
    }

    /**
     * Close the Application Session
     */
    async closeSession(groupId) {
        const sessionId = this.activeSessions.get(groupId);
        if (!sessionId) return;

        const closeMsg = await createCloseAppSessionMessage(this.sessionSigner, {
            app_session_id: sessionId
        });

        this.ws.send(closeMsg);
        await this._waitForMessage('close_app_session');
        this.activeSessions.delete(groupId);
        console.log(`[Yellow] Session ${sessionId} closed`);
    }

    // --- Helpers ---

    _setupMessageHandlers() {
        this.ws.on('message', (data) => {
            try {
                const response = JSON.parse(data.toString());
                const method = response.res?.[0];
                if (method && this.messagePromises.has(method)) {
                    this.messagePromises.get(method).resolve(response);
                    this.messagePromises.delete(method);
                }
            } catch (e) {
                console.error('[Yellow] WS Message parse error:', e);
            }
        });
    }

    async _waitForMessage(method, timeout = 15000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.messagePromises.delete(method);
                reject(new Error(`Yellow Network timeout waiting for ${method}`));
            }, timeout);

            this.messagePromises.set(method, {
                resolve: (data) => {
                    clearTimeout(timer);
                    resolve(data);
                }
            });
        });
    }
}

const yellowService = new YellowNetworkService();
export default yellowService;
