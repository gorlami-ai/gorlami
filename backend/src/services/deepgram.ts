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
  ): Promise<{
    transcript: string;
    duration?: number;
    confidence?: number;
  }> {
    try {
      // Setup options for Deepgram
      const options = {
        model,
        language,
        punctuate: true,
        smart_format: true,
        mimetype,
      };

      const startTime = Date.now();

      const response = await this.client.listen.prerecorded.transcribeFile(audioBuffer, options);

      const apiTime = Date.now() - startTime;
      logger.info(
        {
          apiResponseTime: apiTime,
          audioSize: audioBuffer.length,
          audioDuration: response.result?.metadata?.duration,
        },
        'Deepgram API response time'
      );

      if (!response.result?.results?.channels[0]?.alternatives[0]) {
        throw new Error('No transcription result from Deepgram');
      }

      const alternative = response.result.results.channels[0].alternatives[0];
      const transcript = alternative.transcript || '';
      const confidence = alternative.confidence;
      const duration = response.result.metadata?.duration;

      return {
        transcript,
        duration,
        confidence,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error: errorMessage }, 'Deepgram transcription error');
      throw new Error(`Deepgram transcription failed: ${errorMessage}`);
    }
  }
}

export const deepgramService = new DeepgramService();
