import { listen } from '@tauri-apps/api/event';
import { recordingService as newRecordingService } from '../features/recording/recordingService';
import { createLogger } from '../utils/logger';

const logger = createLogger('RecordingServiceLegacy');

// Legacy wrapper for the new recording service
// This maintains backward compatibility while using the new service internally
class RecordingServiceLegacy {
  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for recording stopped event and delegate to new service
    listen('recording_stopped', async () => {
      logger.info('Recording stopped event received, delegating to new service');
      await newRecordingService.processRecording();
    });
  }

  setHandlers(handlers: any) {
    newRecordingService.setHandlers(handlers);
  }

  isCurrentlyProcessing() {
    return newRecordingService.isCurrentlyProcessing();
  }
}

// Export legacy wrapper for backward compatibility
export const recordingService = new RecordingServiceLegacy();
