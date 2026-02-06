import React, { useState, useRef, useEffect } from 'react';

const VoiceRecorder = ({ onRecordingComplete, isProcessing }) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const canvasRef = useRef(null);
    const animationIdRef = useRef(null);
    const analyzerRef = useRef(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Setup Visualizer
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyzer = audioContext.createAnalyser();
            analyzer.fftSize = 256;
            source.connect(analyzer);
            analyzerRef.current = analyzer;
            drawVisualizer();

            mediaRecorderRef.current = new MediaRecorder(stream);

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const mimeType = mediaRecorderRef.current.mimeType;
                const audioBlob = new Blob(chunksRef.current, { type: mimeType });

                console.log(`[Recorder] Stopped. Size: ${audioBlob.size} bytes, Type: ${mimeType}`);

                onRecordingComplete(audioBlob);
                chunksRef.current = [];
                if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
                audioContext.close();
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Microphone access denied", err);
        }
    };

    const drawVisualizer = () => {
        if (!canvasRef.current || !analyzerRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyzerRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationIdRef.current = requestAnimationFrame(draw);
            analyzerRef.current.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;

                // Premium gradient
                const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                gradient.addColorStop(0, '#60a5fa');
                gradient.addColorStop(1, '#a855f7');

                ctx.fillStyle = gradient;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                x += barWidth + 1;
            }
        };

        draw();
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    return (
        <div className="voice-recorder">
            <div className={`visualizer-container ${isRecording ? 'active' : ''}`}>
                <canvas ref={canvasRef} width="300" height="60" className="visualizer-canvas" />
            </div>

            <button
                disabled={isProcessing}
                onClick={isRecording ? stopRecording : startRecording}
                className={`record-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
            >
                <span className="icon">{isRecording ? '⏹️' : '🎤'}</span>
            </button>
            <p className="recorder-status">
                {isProcessing ? 'AI is thinking...' : isRecording ? 'Recording native speech...' : 'Tap to speak your intent'}
            </p>
        </div>
    );
};

export default VoiceRecorder;
