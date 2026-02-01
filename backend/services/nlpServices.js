require('dotenv/config');

const {Groq} = require("groq-sdk")
const fs = require('fs');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});


const transcribeAudio = async () => {
    try { 
        const transcription = await groq.audio.transcriptions.create({
            model:'whisper-large-v3',
            file:fs.createReadStream(filePath),
            response_format:'verbose_json',
            prompt: "The audio may be in Tamil , hindi  telugu, english or any other language. Please transcribe and detect the language accurately. Provide the transcript in the native script."
        });

        console.log("Transcription Result:", transcription);
        console.log("Detected Language:", transcription.language);

        
        
    } catch (error) {
        
    }
}