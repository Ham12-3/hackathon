export interface ElevenLabsConfig {
  apiKey: string;
  voiceId?: string;
  model?: string;
}

export class TextToSpeechService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private defaultVoiceId = 'Rachel'; // Default English voice
  private defaultModel = 'eleven_monolingual_v1';

  constructor(config: ElevenLabsConfig) {
    this.apiKey = config.apiKey;
  }

  async speak(text: string, voiceId?: string): Promise<void> {
    try {
      const voice = voiceId || this.defaultVoiceId;
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voice}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: this.defaultModel,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      
      return new Promise((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl);
          reject(error);
        };
        audio.play().catch(reject);
      });
    } catch (error) {
      console.error('Text-to-speech error:', error);
      // Fallback to browser TTS if ElevenLabs fails
      this.fallbackSpeak(text);
    }
  }

  private fallbackSpeak(text: string): void {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  }

  async getVoices(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return data.voices || [];
    } catch (error) {
      console.error('Error fetching voices:', error);
      return [];
    }
  }

  async checkCredits(): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return data.subscription?.character_count || 0;
    } catch (error) {
      console.error('Error checking credits:', error);
      return 0;
    }
  }
}

// Singleton instance
let ttsService: TextToSpeechService | null = null;

export function initTTS(apiKey: string): TextToSpeechService {
  ttsService = new TextToSpeechService({ apiKey });
  return ttsService;
}

export function getTTS(): TextToSpeechService | null {
  return ttsService;
} 