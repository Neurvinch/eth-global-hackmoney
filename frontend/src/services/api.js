const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const processVoice = async (audioBlob, language) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'voice.webm');
  formData.append('language', language);

  const response = await fetch(`${API_URL}/api/process-voice`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to process voice');
  }

  return response.json();
};
