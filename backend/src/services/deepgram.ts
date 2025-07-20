import { createClient, DeepgramClient } from '@deepgram/sdk';
import { env } from '../config/env.js';

export class DeepgramService {
  private client: DeepgramClient;

  constructor() {
    this.client = createClient(env.DEEPGRAM_API_KEY);
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    mimetype: string,
    language: string = env.DEEPGRAM_LANGUAGE,
    model: string = env.DEEPGRAM_MODEL
  ): Promise<string> {
    const response = await this.client.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model,
        language,
        punctuate: true,
        smart_format: true,
        mimetype,
      }
    );

    const transcript = response.result?.results?.channels[0]?.alternatives[0]?.transcript || '';
    
    return transcript;
  }
}

export const deepgramService = new DeepgramService();