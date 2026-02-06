import { Groq } from "groq-sdk";
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Transcribes audio using Whisper-large-v3
 * @param {string} filePath - Path to the audio file
 * @param {string} language - Hint language code (en, hi, ta, te)
 */
export const transcribeAudio = async (filePath, language) => {
    try {
        console.log("Transcribing file:", filePath);

        // Check file size to avoid processing empty files
        const stats = fs.statSync(filePath);
        if (stats.size < 100) {
            console.warn("[Whisper] Audio file too small, probably silent.");
            return { text: "", language: language };
        }

        const transcription = await groq.audio.transcriptions.create({
            model: 'whisper-large-v3',
            file: fs.createReadStream(filePath),
            response_format: 'verbose_json',
            // Adding a context prompt helps Whisper steer away from generic hallucinations
            prompt: `Bol-DeFi, ROSCA, savings circle, deposit, contribution, bid, auction, payout, dividends. The audio may be in ${language}, Tamil, Hindi, Telugu, or English.`
        });

        let text = transcription.text.trim();
        console.log("Transcription Original:", text);

        // Filter out common Whisper hallucinations for silence/noise
        const hallucinations = [
            "Thank you.", "Thanks for watching", "Please subscribe",
            "Amir", "Mubarak", "Bye.", "God bless"
        ];

        if (hallucinations.some(h => text.includes(h)) && text.length < 20) {
            console.warn("[Whisper] Detected potential silence hallucination:", text);
            text = "";
        }

        console.log("Transcription Final:", text);
        console.log("Detected Language:", transcription.language);

        return { text, language: transcription.language };

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
export const extractIntent = async (transcript, language) => {
    try {
        const prompt = `
            You are the Bol-DeFi AI intent extractor. 
            Analyze the following transcript in ${language} and extract the financial intent for a ROSCA (Chit Fund) system.
            
            Transcript: "${transcript}"
            
            Return ONLY a JSON object with this format:
            {
              "type": "CREATE_GROUP | JOIN_GROUP | CONTRIBUTE | BID | FINALIZE",
              "params": {
                "contributionAmount": number (required for CREATE_GROUP),
                "groupName": "string" (if any),
                "maxMembers": number (default 10),
                "cycleDuration": number (in seconds),
                "auctionDuration": number (in seconds),
                "groupId": number (required for JOIN/CONTRIBUTE/BID/FINALIZE),
                "discountAmount": number (required for BID)
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