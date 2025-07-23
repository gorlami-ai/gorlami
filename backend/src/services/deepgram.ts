import { createClient, DeepgramClient } from '@deepgram/sdk';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

export class DeepgramService {
  private client: DeepgramClient;
  private readonly defaultModel = 'nova-2';
  private readonly defaultLanguage = 'en-US';

  constructor() {
    this.client = createClient(env.DEEPGRAM_API_KEY);
  }

  async transcribeAudio(
    audioBuffer: Buffer,
    mimetype: string,
    language: string = this.defaultLanguage,
    model: string = this.defaultModel
  ): Promise<string> {
    try {
      // Parse raw PCM parameters from custom mimetype
      const baseOptions = {
        model,
        language,
        punctuate: true,
        smart_format: true,
      };

      // Check if this is raw PCM audio
      let options: any;
      
      if (mimetype.startsWith('audio/raw')) {
        // Extract sample rate from mimetype like "audio/raw;encoding=signed-integer;bits=16;rate=48000;endian=little"
        const rateMatch = mimetype.match(/rate=(\d+)/);
        const sampleRate = rateMatch ? parseInt(rateMatch[1]) : 16000;
        
        // For raw PCM, we MUST NOT include mimetype property
        options = {
          model,
          language,
          punctuate: true,
          smart_format: true,
          encoding: 'linear16', // 16-bit signed PCM
          sample_rate: sampleRate,
          channels: 1, // Mono
        };
      } else {
        // For other formats, use mimetype
        options = {
          ...baseOptions,
          mimetype,
        };
      }
      
      const response = await this.client.listen.prerecorded.transcribeFile(
        audioBuffer,
        options
      );

      if (!response.result?.results?.channels[0]?.alternatives[0]) {
        throw new Error('No transcription result from Deepgram');
      }

      const transcript = response.result.results.channels[0].alternatives[0].transcript || '';
      
      return transcript;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage }, 'Deepgram transcription error');
      throw new Error(`Deepgram transcription failed: ${errorMessage}`);
    }
  }
}

export const deepgramService = new DeepgramService();