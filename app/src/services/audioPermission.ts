import { invoke } from '@tauri-apps/api/core';
import { createLogger } from '../utils/logger';
import { handleError } from '../shared/utils/errorHandler';

const logger = createLogger('AudioPermission');

export type MicrophonePermissionStatus = 
  | 'NotDetermined'
  | 'Restricted' 
  | 'Denied'
  | 'Authorized';

export interface AudioPermissionStatus {
  status: MicrophonePermissionStatus;
  hasPermission: boolean;
  canRequestPermission: boolean;
}

class AudioPermissionService {
  private cachedStatus: MicrophonePermissionStatus | null = null;
  private checkingPermission = false;

  /**
   * Check the current microphone permission status
   */
  async checkPermission(): Promise<AudioPermissionStatus> {
    if (this.checkingPermission) {
      logger.debug('Permission check already in progress');
      return this.getPermissionStatus(this.cachedStatus || 'NotDetermined');
    }

    try {
      this.checkingPermission = true;
      const statusString = await invoke<string>('check_microphone_permission');
      
      // Parse the status from the Rust debug string format
      const status = this.parseStatus(statusString);
      this.cachedStatus = status;
      
      logger.debug('Microphone permission status:', { status });
      return this.getPermissionStatus(status);
    } catch (error) {
      await handleError(error, {
        context: 'AudioPermission',
        fallbackMessage: 'Failed to check microphone permission'
      });
      return this.getPermissionStatus('NotDetermined');
    } finally {
      this.checkingPermission = false;
    }
  }

  /**
   * Request microphone permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      logger.info('Requesting microphone permission');
      
      // First check current status
      const currentStatus = await this.checkPermission();
      
      if (currentStatus.hasPermission) {
        logger.info('Microphone permission already granted');
        return true;
      }
      
      if (!currentStatus.canRequestPermission) {
        logger.info('Cannot request permission - opening system preferences');
        await this.openSystemPreferences();
        return false;
      }
      
      const granted = await invoke<boolean>('request_microphone_permission');
      this.cachedStatus = granted ? 'Authorized' : 'Denied';
      
      if (!granted) {
        logger.info('Permission not granted, user may need to enable in System Preferences');
      }
      
      return granted;
    } catch (error) {
      await handleError(error, {
        context: 'AudioPermission',
        fallbackMessage: 'Failed to request microphone permission'
      });
      return false;
    }
  }

  /**
   * Open System Preferences to the microphone privacy pane
   */
  async openSystemPreferences(): Promise<void> {
    try {
      await invoke('open_microphone_preferences');
      logger.info('Opened microphone preferences');
    } catch (error) {
      await handleError(error, {
        context: 'AudioPermission',
        fallbackMessage: 'Failed to open system preferences'
      });
    }
  }

  /**
   * Ensure microphone permission is granted before performing an action
   */
  async ensurePermission(): Promise<boolean> {
    const status = await this.checkPermission();
    
    if (status.hasPermission) {
      return true;
    }
    
    if (status.canRequestPermission) {
      logger.info('Microphone permission not granted, requesting...');
      return await this.requestPermission();
    }
    
    // Permission denied or restricted - guide user to settings
    logger.info('Microphone permission denied or restricted');
    return false;
  }

  /**
   * Clear cached permission status
   */
  clearCache(): void {
    this.cachedStatus = null;
    logger.debug('Cleared permission cache');
  }

  /**
   * Parse status string from Rust
   */
  private parseStatus(statusString: string): MicrophonePermissionStatus {
    if (statusString.includes('NotDetermined')) return 'NotDetermined';
    if (statusString.includes('Restricted')) return 'Restricted';
    if (statusString.includes('Denied')) return 'Denied';
    if (statusString.includes('Authorized')) return 'Authorized';
    return 'NotDetermined';
  }

  /**
   * Get permission status object
   */
  private getPermissionStatus(status: MicrophonePermissionStatus): AudioPermissionStatus {
    return {
      status,
      hasPermission: status === 'Authorized',
      canRequestPermission: status === 'NotDetermined'
    };
  }
}

export const audioPermissionService = new AudioPermissionService();