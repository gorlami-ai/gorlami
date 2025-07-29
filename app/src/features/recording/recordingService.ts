import { invoke } from '@tauri-apps/api/core';
import { emit, listen } from '@tauri-apps/api/event';
import { backendService } from '../../services/backend';
import { createLogger } from '../../utils/logger';
import { handleError, withErrorHandling } from '../../shared/utils/errorHandler';
import { pasteAtCursor } from '../../shared/utils/clipboard';

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

  constructor() {
    this.setupEventListener();
  }

  private async setupEventListener() {
    // Listen for recording stopped event and process the recording
    await listen('recording_stopped', async () => {
      await this.processRecording();
    });
  }

  async processRecording(): Promise<TranscriptionResult | null> {
    if (this.isProcessing) {
      logger.warn('Already processing a recording');
      return null;
    }

    this.isProcessing = true;

    try {
      // Get the Opus encoded audio data
      const opusData = await invoke<number[]>('get_audio_opus');

      // Convert number array to Uint8Array and then to ArrayBuffer
      const audioBuffer = new Uint8Array(opusData);
      const arrayBuffer = audioBuffer.buffer.slice(
        audioBuffer.byteOffset,
        audioBuffer.byteOffset + audioBuffer.byteLength
      );


      // Send to backend for transcription (Phase 1: Quick transcription)
      const response = await backendService.transcribeAudio(arrayBuffer, {
        enhance: true,
        language: 'en-US',
      });

      // Phase 2: Background upload (fire and forget)
      backendService.uploadActivityAudio(response.activityId, arrayBuffer)
        .then(() => logger.info('Audio uploaded successfully', { activityId: response.activityId }))
        .catch((error) => logger.warn('Audio upload failed (transcription still successful)', error));


      const transcriptionText = response.enhanced || response.transcription;
      
      if (!transcriptionText || transcriptionText.trim() === '') {
        logger.warn('Empty transcription received', { 
          activityId: response.activityId,
          rawResponse: response 
        });
        throw new Error('No transcription text received from backend');
      }
      
      const result: TranscriptionResult = {
        text: transcriptionText,
        activityId: response.activityId,
        enhanced: !!response.enhanced,
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

      // Paste at cursor
      await pasteAtCursor(transcriptionText);

      return result;
    } catch (error) {
      const errorMessage = await handleError(error, {
        context: 'Recording',
        showToast: false,
      });

      if (this.handlers.onError) {
        this.handlers.onError(errorMessage);
      }

      await emit('recording_error', errorMessage);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  setHandlers(handlers: RecordingHandlers) {
    this.handlers = handlers;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  async getActivities(page = 1, limit = 50) {
    return withErrorHandling(() => backendService.getActivities(page, limit), {
      context: 'RecordingService',
      fallbackMessage: 'Failed to fetch activities',
    });
  }

  async deleteActivity(id: string): Promise<boolean> {
    try {
      await backendService.deleteActivity(id);
      return true;
    } catch (error) {
      logger.error('Failed to delete activity', { id, error });
      return false;
    }
  }
}

export const recordingService = new RecordingService();
