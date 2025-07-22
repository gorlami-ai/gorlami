import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { backendService } from '../../services/backend';
import { createLogger } from '../../utils/logger';
import { handleError, withErrorHandling } from '../../shared/utils/errorHandler';
import { copyAndPaste } from '../../shared/utils/clipboard';

const logger = createLogger('RecordingService');

export interface RecordingHandlers {
  onTranscriptionComplete?: (transcription: string, activityId: string) => void;
  onError?: (error: string) => void;
}

export interface TranscriptionResult {
  text: string;
  activityId: string;
  enhanced: boolean;
}

class RecordingService {
  private handlers: RecordingHandlers = {};
  private isProcessing = false;

  async processRecording(): Promise<TranscriptionResult | null> {
    if (this.isProcessing) {
      logger.warn('Already processing a recording');
      return null;
    }

    this.isProcessing = true;
    logger.info('Starting transcription process');

    try {
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
          enhance: true,
          language: 'en-US',
        }
      );

      logger.info('Transcription complete', { activityId: response.activityId });

      const transcriptionText = response.enhanced || response.transcription;
      const result: TranscriptionResult = {
        text: transcriptionText,
        activityId: response.activityId,
        enhanced: !!response.enhanced
      };

      // Emit transcription response event for UI
      await emit('transcription_response', {
        is_final: true,
        text: transcriptionText,
      });

      // Call the handler if provided
      if (this.handlers.onTranscriptionComplete) {
        this.handlers.onTranscriptionComplete(transcriptionText, response.activityId);
      }

      // Copy to clipboard and paste
      await copyAndPaste(transcriptionText, { emitEvent: true });

      return result;
    } catch (error) {
      const errorMessage = await handleError(error, {
        context: 'Recording',
        showToast: false
      });

      if (this.handlers.onError) {
        this.handlers.onError(errorMessage);
      }

      await emit('recording_error', errorMessage);
      return null;
    } finally {
      this.isProcessing = false;
      logger.info('Recording processing completed');
    }
  }

  setHandlers(handlers: RecordingHandlers) {
    this.handlers = handlers;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  async getActivities(page = 1, limit = 50) {
    return withErrorHandling(
      () => backendService.getActivities(page, limit),
      {
        context: 'RecordingService',
        fallbackMessage: 'Failed to fetch activities'
      }
    );
  }

  async deleteActivity(id: string): Promise<boolean> {
    // TODO: Implement when backend endpoint is available
    logger.warn(`Delete activity ${id} - backend endpoint not yet implemented`);
    return true;
  }
}

export const recordingService = new RecordingService();