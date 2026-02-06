import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import { transcribeAudio, extractIntent } from './services/nlpServices.js';
import orchestrator from './services/orchestrator.js';
import yellowService from './services/yellowService.js';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
if (!fs.existsSync('uploads/')) {
    fs.mkdirSync('uploads/');
    console.log('[Server] Created uploads directory');
}

// Setup Multer for audio uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const ext = file.originalname.split('.').pop();
        cb(null, `${Date.now()}-${file.fieldname}.${ext}`);
    }
});
const upload = multer({ storage: storage });

/**
 * Main Endpoint: Process Voice
 * Orchestrates transcription, intent extraction, and execution.
 */
app.post('/api/process-voice', upload.single('audio'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
    }

    const audioPath = req.file.path;
    const fileSize = req.file.size;
    const requestedLanguage = req.body.language || 'en';

    try {
        console.log(`--- Processing Voice Stream (${requestedLanguage}) ---`);
        console.log(`[Multer] Received: ${req.file.originalname}, Size: ${fileSize} bytes`);

        // 1. Transcription (Whisper)
        const { text, language: detectedLanguage } = await transcribeAudio(audioPath, requestedLanguage);

        // 2. Intent Extraction (Llama-3)
        let intent;
        if (!text || text.trim().length === 0) {
            intent = {
                type: 'CREATE_GROUP',
                params: {
                    groupName: "New Savings Circle",
                    contributionAmount: 50,
                    maxMembers: 10
                },
                summary: "I couldn't hear you clearly, but I've prepared a default 'Create Group' intent for you. Would you like to start a 50 USDC circle?",
                confidence: 0.5,
                isFallback: true
            };
        } else {
            intent = await extractIntent(text, detectedLanguage || requestedLanguage);

            // If AI is confused, give it a helpful push
            if (intent.type === 'NONE' || intent.confidence < 0.3) {
                intent = {
                    type: 'CREATE_GROUP',
                    params: {
                        groupName: "Native Savings Circle",
                        contributionAmount: 25,
                        maxMembers: 5
                    },
                    summary: `I heard "${text}", which sounds like you might want to start a circle. How about creating one for 25 USDC?`,
                    confidence: 0.6,
                    isFallback: true
                };
            }
        }

        console.log('Intent Result (Final):', intent);

        res.json(intent);

    } catch (error) {
        console.error('Pipeline Error:', error.message);
        res.status(500).json({ error: error.message });
    } finally {
        // Cleanup: Remove audio file regardless of success/fail
        if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
        }
    }
});

/**
 * Execute Intent Endpoint
 * Called after user confirms the intent in the UI
 */
app.post('/api/execute-intent', async (req, res) => {
    try {
        const { intent } = req.body;

        if (!intent || !intent.type) {
            return res.status(400).json({ error: 'Invalid intent provided' });
        }

        console.log(`--- Executing Intent: ${intent.type} ---`);

        const result = await orchestrator.executeIntent(intent);

        res.json({
            success: true,
            ...result, // Spread result to root for easier frontend access
            message: `Successfully executed ${intent.type}`
        });

    } catch (error) {
        console.error('Execution Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Direct UI Action Hub
 * Used for explicit button clicks (Join, Bid, etc)
 */
app.post('/api/execute-single-action', async (req, res) => {
    try {
        const { action } = req.body;
        // Map UI "action" to orchestrator "intent"
        const result = await orchestrator.executeIntent(action);
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('[API] Action failed:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Protocol Status Endpoint
 */
app.get('/api/protocol-status', async (req, res) => {
    try {
        console.log('[API] Fetching protocol status...');

        let treasury = { balance: '0.00' };
        try {
            const intent = { type: 'CHECK_TREASURY' };
            treasury = await orchestrator.executeIntent(intent);
        } catch (e) {
            console.error('[API] Treasury check failed:', e.message);
        }

        let dividends = '0.00';
        try {
            const status = await orchestrator.getMemberStatus(orchestrator.wallet.address);
            dividends = status.dividends;
        } catch (e) {
            console.error('[API] Member status check failed:', e.message);
        }

        res.json({
            roscaAddress: process.env.ROSCA_CONTRACT_ADDRESS || '0x...',
            arcBalance: treasury.balance || '0.00',
            dividends: dividends,
            yellowStatus: yellowService.isAuthenticated ? 'Online (Sandbox)' : 'Offline/Connecting',
            ensIdentity: 'bol-defi.eth',
            network: process.env.NETWORK || 'Sepolia'
        });
    } catch (error) {
        console.error('[API] Critical failure in protocol-status:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

/**
 * Activity & Data Discovery
 */
app.get('/api/activity', async (req, res) => {
    const activity = await orchestrator.getRecentActivity();
    res.json(activity);
});

app.get('/api/circles', async (req, res) => {
    const { address } = req.query;
    const circles = await orchestrator.getActiveCircles(address);
    res.json(circles);
});

app.get('/api/circles/:id', async (req, res) => {
    const { id } = req.params;
    const { address } = req.query;
    const group = await orchestrator.getGroupInfo(id, address);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json(group);
});

app.listen(port, () => {
    console.log(`🚀 Bol-DeFi Server Orchestrator running on port ${port}`);

    // Start the auction monitor
    orchestrator.startAuctionMonitor();
});
