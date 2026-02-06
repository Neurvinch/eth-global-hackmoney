require('dotenv').config();
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import { transcribeAudio, extractIntent } from './services/nlpServices';
import orchestrator from './services/orchestrator';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
    const requestedLanguage = req.body.language || 'en';

    try {
        console.log(`--- Processing Voice Stream (${requestedLanguage}) ---`);

        // 1. Transcription (Whisper)
        const { text, language: detectedLanguage } = await transcribeAudio(audioPath, requestedLanguage);

        // 2. Intent Extraction (Llama-3)
        const intent = await extractIntent(text, detectedLanguage || requestedLanguage);

        console.log('Intent Detected:', intent);

        // 3. Execute Intent via Orchestrator (optional - can be manual confirmation)
        // For demo purposes, we return the intent for frontend confirmation
        // In production, executeIntent would be called after user confirms in UI

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
            result,
            message: `Successfully executed ${intent.type}`
        });

    } catch (error) {
        console.error('Execution Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Protocol Status Endpoint
 */
app.get('/api/protocol-status', async (req, res) => {
    try {
        const intent = { type: 'CHECK_TREASURY' };
        const treasury = await orchestrator.executeIntent(intent);

        res.json({
            roscaAddress: process.env.ROSCA_CONTRACT_ADDRESS,
            arcBalance: treasury.balance,
            yellowStatus: yellowService.isAuthenticated ? 'Online (Sandbox)' : 'Offline/Connecting',
            ensIdentity: 'bol-defi.eth', // Root project identity
            network: process.env.NETWORK || 'Sepolia'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
    const circles = await orchestrator.getActiveCircles();
    res.json(circles);
});

app.listen(port, () => {
    console.log(`🚀 Bol-DeFi Server Orchestrator running on port ${port}`);

    // Start the auction monitor
    orchestrator.startAuctionMonitor();
});
