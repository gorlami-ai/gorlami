import { invoke } from '@tauri-apps/api/core';
import { listen, emit } from '@tauri-apps/api/event';
import { backendService } from './backend';
import { logger } from '../utils/logger';

interface RecordingHandlers {
  onTranscriptionComplete?: (transcription: string, activityId: string) => void;
  onError?: (error: string) => void;
}

class RecordingService {
  private handlers: RecordingHandlers = {};
  private isProcessing = false;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for recording stopped event
    listen('recording_stopped', async () => {
      if (this.isProcessing) {
        logger.warn('Already processing a recording');
        return;
      }

      try {
        this.isProcessing = true;
        logger.info('Recording stopped, starting transcription process');

        // Get the optimized PCM audio data
        const [pcmData, sampleRate] = await invoke<[number[], number]>('get_audio_pcm');
        
        // Convert number array to Uint8Array
        const audioBuffer = new Uint8Array(pcmData);
        
        logger.info(`Got PCM data: ${audioBuffer.length} bytes at ${sampleRate} Hz`);

        // Send to backend for transcription
        const response = await backendService.transcribeAudio(
          audioBuffer.buffer,
          sampleRate,
          {
            enhance: true, // Always enhance for better quality
            language: 'en-US',
          }
        );

        logger.info('Transcription complete', { activityId: response.activityId });

        // Emit transcription response event for UI
        const transcriptionText = response.enhanced || response.transcription;
        
        // The processing overlay listens for this event
        await emit('transcription_response', {
          is_final: true,
          text: transcriptionText,
        });

        // Call the handler if provided
        if (this.handlers.onTranscriptionComplete) {
          this.handlers.onTranscriptionComplete(transcriptionText, response.activityId);
        }

        // Copy to clipboard and paste
        await invoke('copy_to_clipboard', { text: transcriptionText });
        
        // Small delay to ensure clipboard is ready
        setTimeout(async () => {
          await invoke('paste_at_cursor');
          await emit('text_pasted', {});
        }, 100);

      } catch (error) {
        logger.error('Error processing recording', error);
        
        if (this.handlers.onError) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.handlers.onError(errorMessage);
        }

        // Emit error event for UI
        await emit('recording_error', error instanceof Error ? error.message : 'Failed to process recording');
      } finally {
        this.isProcessing = false;
      }
    });
  }

  setHandlers(handlers: RecordingHandlers) {
    this.handlers = handlers;
  }

  isCurrentlyProcessing() {
    return this.isProcessing;
  }
}

export const recordingService = new RecordingService();