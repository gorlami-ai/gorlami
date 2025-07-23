import { invoke } from '@tauri-apps/api/core';
import { createLogger } from '../../utils/logger';
import { handleError } from '../../shared/utils/errorHandler';

const logger = createLogger('TauriSettings');

export interface AppSettings {
  apiKey?: string;
  apiEndpoint?: string;
  recordingShortcut?: string;
  primaryAction?: string;
  enableAuth?: boolean;
  llmModel?: string;
  systemPrompt?: string;
  outputLanguage?: string;
  writingStyle?: string;
  autoUpdate?: boolean;
  showDockIcon?: boolean;
  launchAtLogin?: boolean;
  [key: string]: any;
}

class SettingsManager {
  private cache: AppSettings | null = null;
  private cacheTimeout: NodeJS.Timeout | null = null;
  private readonly CACHE_DURATION = 5000; // 5 seconds

  private clearCache() {
    this.cache = null;
    if (this.cacheTimeout) {
      clearTimeout(this.cacheTimeout);
      this.cacheTimeout = null;
    }
  }

  private setCache(settings: AppSettings) {
    this.cache = settings;
    this.clearCache();
    this.cacheTimeout = setTimeout(() => this.clearCache(), this.CACHE_DURATION);
  }

  async get(): Promise<AppSettings> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const settings = await invoke<AppSettings>('get_app_settings');
      this.setCache(settings);
      logger.debug('Settings loaded', { keys: Object.keys(settings) });
      return settings;
    } catch (error) {
      await handleError(error, {
        context: 'Settings',
        fallbackMessage: 'Failed to load settings'
      });
      return {};
    }
  }

  async save(settings: AppSettings): Promise<boolean> {
    try {
      await invoke('save_app_settings', { settings });
      this.setCache(settings);
      logger.debug('Settings saved', { keys: Object.keys(settings) });
      return true;
    } catch (error) {
      await handleError(error, {
        context: 'Settings',
        fallbackMessage: 'Failed to save settings'
      });
      return false;
    }
  }

  async update(updates: Partial<AppSettings>): Promise<boolean> {
    const currentSettings = await this.get();
    const newSettings = { ...currentSettings, ...updates };
    return this.save(newSettings);
  }

  async getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K] | undefined> {
    const settings = await this.get();
    return settings[key];
  }

  async setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<boolean> {
    return this.update({ [key]: value });
  }

  async reset(): Promise<boolean> {
    try {
      await invoke('reset_app_settings');
      this.clearCache();
      logger.debug('Settings reset to defaults');
      return true;
    } catch (error) {
      await handleError(error, {
        context: 'Settings',
        fallbackMessage: 'Failed to reset settings'
      });
      return false;
    }
  }

  invalidateCache() {
    this.clearCache();
  }
}

export const settingsManager = new SettingsManager();

export default settingsManager;