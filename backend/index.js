require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const { transcribeAudio, extractIntent } = require('./services/nlpServices');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Setup Multer for audio uploads
const upload = multer({ dest: 'uploads/' });

/**
 * Main Endpoint: Process Voice
 * Orchestrates transcription and intent extraction.
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

        console.log('Final Result:', intent);
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

app.listen(port, () => {
    console.log(`🚀 Bol-DeFi Server Orchestrator running on port ${port}`);
});
