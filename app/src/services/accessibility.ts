import { invoke } from '@tauri-apps/api/core';
import { createLogger } from '../utils/logger';
import { handleError } from '../shared/utils/errorHandler';

const logger = createLogger('Accessibility');

export interface AccessibilityStatus {
  hasPermission: boolean;
  permissionRequested: boolean;
}

class AccessibilityService {
  private hasPermission: boolean | null = null;
  private checkingPermission = false;

  /**
   * Check if the app has accessibility permissions
   */
  async checkPermission(): Promise<boolean> {
    if (this.checkingPermission) {
      logger.debug('Permission check already in progress');
      return this.hasPermission ?? false;
    }

    try {
      this.checkingPermission = true;
      this.hasPermission = await invoke<boolean>('check_accessibility_permission');
      logger.debug('Accessibility permission status:', { hasPermission: this.hasPermission });
      return this.hasPermission;
    } catch (error) {
      await handleError(error, {
        context: 'Accessibility',
        fallbackMessage: 'Failed to check accessibility permission'
      });
      return false;
    } finally {
      this.checkingPermission = false;
    }
  }

  /**
   * Request accessibility permissions with system prompt
   */
  async requestPermission(): Promise<boolean> {
    try {
      logger.info('Requesting accessibility permission');
      const granted = await invoke<boolean>('request_accessibility_permission');
      this.hasPermission = granted;
      
      if (!granted) {
        logger.info('Permission not granted, opening system preferences');
        // If not granted immediately, open system preferences
        await this.openSystemPreferences();
      }
      
      return granted;
    } catch (error) {
      await handleError(error, {
        context: 'Accessibility',
        fallbackMessage: 'Failed to request accessibility permission'
      });
      return false;
    }
  }

  /**
   * Open System Preferences to the Accessibility pane
   */
  async openSystemPreferences(): Promise<void> {
    try {
      await invoke('open_accessibility_preferences');
      logger.info('Opened accessibility preferences');
    } catch (error) {
      await handleError(error, {
        context: 'Accessibility',
        fallbackMessage: 'Failed to open system preferences'
      });
    }
  }

  /**
   * Get the current permission status
   */
  async getStatus(): Promise<AccessibilityStatus> {
    const hasPermission = await this.checkPermission();
    return {
      hasPermission,
      permissionRequested: this.hasPermission !== null
    };
  }

  /**
   * Ensure accessibility permission is granted before performing an action
   */
  async ensurePermission(): Promise<boolean> {
    const hasPermission = await this.checkPermission();
    
    if (!hasPermission) {
      logger.info('Accessibility permission not granted, requesting...');
      return await this.requestPermission();
    }
    
    return true;
  }

  /**
   * Clear cached permission status
   */
  clearCache(): void {
    this.hasPermission = null;
    logger.debug('Cleared permission cache');
  }
}

export const accessibilityService = new AccessibilityService();