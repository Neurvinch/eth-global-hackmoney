const { Groq } = require("groq-sdk");
const fs = require('fs');
require('dotenv').config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Transcribes audio using Whisper-large-v3
 * @param {string} filePath - Path to the audio file
 * @param {string} language - Hint language code (en, hi, ta, te)
 */
const transcribeAudio = async (filePath, language) => {
    try {
        console.log("Transcribing file:", filePath);
        const transcription = await groq.audio.transcriptions.create({
            model: 'whisper-large-v3',
            file: fs.createReadStream(filePath),
            response_format: 'verbose_json',
            prompt: `The audio may be in ${language}, Tamil, Hindi, Telugu, or English. Please transcribe and detect the language accurately.`
        });

        console.log("Transcription Result:", transcription.text);
        console.log("Detected Language:", transcription.language);

        return { text: transcription.text, language: transcription.language };

    } catch (error) {
        console.error("Error during transcription:", error);
        throw new Error("Failed to transcribe audio");
    }
};

/**
 * Extracts financial intent using Llama-3-70b
 * @param {string} transcript - The text to analyze
 * @param {string} language - The detected/provided language
 */
const extractIntent = async (transcript, language) => {
    try {
        const prompt = `
            You are the Bol-DeFi AI intent extractor. 
            Analyze the following transcript in ${language} and extract the financial intent for a ROSCA (Chit Fund) system.
            
            Transcript: "${transcript}"
            
            Return ONLY a JSON object with this format:
            {
              "type": "CREATE_GROUP | JOIN_GROUP | CONTRIBUTE | BID | FINALIZE",
              "params": {
                "amount": number (if any),
                "groupName": "string" (if any),
                "duration": number (if any days/weeks)
              },
              "summary": "A concise, friendly explanation of what the user wants to do in English.",
              "confidence": 0.0 to 1.0
            }
        `;

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' },
        });

        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        console.error("Error during intent extraction:", error);
        throw new Error("Failed to extract intent");
    }
};

module.exports = {
    transcribeAudio,
    extractIntent
};