import { invoke } from '@tauri-apps/api/core';
import { createLogger } from '../../utils/logger';
import { handleError, withErrorHandling } from '../../shared/utils/errorHandler';
import { settingsManager } from '../../lib/tauri/settings';

const logger = createLogger('SettingsService');

export interface ShortcutConfig {
  transcription: string;
  edit: string;
  transcription_enabled: boolean;
  edit_enabled: boolean;
}

export interface AudioDevice {
  name: string;
  is_default: boolean;
}

export interface AppSettingsData {
  shortcuts: ShortcutConfig;
  selected_microphone?: string;
  apiKey?: string;
  apiEndpoint?: string;
  primaryAction?: string;
  enableAuth?: boolean;
  llmModel?: string;
  systemPrompt?: string;
  outputLanguage?: string;
  writingStyle?: string;
  autoUpdate?: boolean;
  showDockIcon?: boolean;
  launchAtLogin?: boolean;
}

class SettingsService {
  async loadSettings(): Promise<AppSettingsData | null> {
    return withErrorHandling(
      async () => {
        const settings = await settingsManager.get();
        
        // Ensure shortcuts have default values
        if (!settings.shortcuts) {
          settings.shortcuts = {
            transcription: 'fn',
            edit: 'fn+Shift',
            transcription_enabled: true,
            edit_enabled: true,
          };
        }
        
        return settings as AppSettingsData;
      },
      {
        context: 'SettingsService',
        fallbackMessage: 'Failed to load settings'
      }
    );
  }

  async getAudioDevices(): Promise<AudioDevice[]> {
    try {
      return await invoke<AudioDevice[]>('get_audio_devices');
    } catch (error) {
      await handleError(error, {
        context: 'SettingsService',
        fallbackMessage: 'Failed to get audio devices'
      });
      return [];
    }
  }

  async validateShortcut(shortcut: string): Promise<boolean> {
    if (!shortcut.trim()) return false;
    
    try {
      await invoke('validate_shortcut', { shortcut });
      logger.debug(`Valid shortcut: ${shortcut}`);
      return true;
    } catch (error) {
      logger.warn(`Invalid shortcut format: ${shortcut}`, error);
      return false;
    }
  }

  async updateShortcuts(shortcuts: ShortcutConfig): Promise<boolean> {
    try {
      // Update shortcuts configuration in Tauri
      await invoke('update_shortcut_config', { config: shortcuts });
      
      // Save to persistent settings
      const success = await settingsManager.update({ shortcuts });
      
      if (success) {
        logger.info('Shortcuts updated successfully');
      }
      
      return success;
    } catch (error) {
      await handleError(error, {
        context: 'SettingsService',
        fallbackMessage: 'Failed to update shortcuts'
      });
      return false;
    }
  }

  async updateShortcut(
    type: keyof ShortcutConfig,
    value: string | boolean
  ): Promise<boolean> {
    const settings = await this.loadSettings();
    if (!settings) return false;

    const newShortcuts = { ...settings.shortcuts, [type]: value };
    
    // If it's a shortcut string, validate it first
    if (typeof value === 'string' && (type === 'transcription' || type === 'edit')) {
      const isValid = await this.validateShortcut(value);
      if (!isValid) return false;
    }

    return this.updateShortcuts(newShortcuts);
  }

  async selectAudioDevice(deviceName: string): Promise<boolean> {
    try {
      await invoke('select_audio_device', { deviceName });
      
      const success = await settingsManager.setSetting('selected_microphone', deviceName);
      
      if (success) {
        logger.info('Audio device selected', { deviceName });
      }
      
      return success;
    } catch (error) {
      await handleError(error, {
        context: 'SettingsService',
        fallbackMessage: 'Failed to select audio device'
      });
      return false;
    }
  }

  async updateGeneralSetting<K extends keyof AppSettingsData>(
    key: K,
    value: AppSettingsData[K]
  ): Promise<boolean> {
    return settingsManager.setSetting(key, value);
  }

  async resetSettings(): Promise<boolean> {
    return settingsManager.reset();
  }
}

export const settingsService = new SettingsService();