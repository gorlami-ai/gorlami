import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { createLogger } from '../utils/logger';

interface ShortcutConfig {
  transcription: string;
  edit: string;
  transcription_enabled: boolean;
  edit_enabled: boolean;
}

const logger = createLogger('Home');

function formatShortcut(shortcut: string): JSX.Element {
  const parts = shortcut.split('+').map(part => part.trim());
  
  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && <span className="mx-1 text-gray-500">+</span>}
          <kbd className="inline-flex items-center px-2 py-1 text-sm font-mono bg-white border border-gray-200 rounded text-gray-700">
            {part.replace('CommandOrControl', '⌘')}
          </kbd>
        </span>
      ))}
    </>
  );
}

export function Home() {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig>({
    transcription: 'Loading...',
    edit: 'Loading...',
    transcription_enabled: true,
    edit_enabled: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShortcuts();
  }, []);

  const loadShortcuts = async () => {
    try {
      const appSettings = await invoke<any>('get_app_settings');
      setShortcuts(appSettings.shortcuts);
    } catch (error) {
      logger.error('Failed to load shortcuts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 min-h-screen bg-white">
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Home</h1>
          <p className="text-gray-600 mt-1">Your voice-driven AI assistant for macOS</p>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-gray-900 font-semibold mb-2">Transcribe</h3>
                <div className="mb-3">
                  {loading ? (
                    <span className="text-sm text-gray-500">Loading...</span>
                  ) : shortcuts.transcription_enabled ? (
                    formatShortcut(shortcuts.transcription)
                  ) : (
                    <span className="text-sm text-gray-500 italic">Disabled</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Hold these keys to record your voice. Release to stop and automatically transcribe your speech.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-gray-900 font-semibold mb-2">Edit</h3>
                <div className="mb-3">
                  {loading ? (
                    <span className="text-sm text-gray-500">Loading...</span>
                  ) : shortcuts.edit_enabled ? (
                    formatShortcut(shortcuts.edit)
                  ) : (
                    <span className="text-sm text-gray-500 italic">Disabled</span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Quickly edit your last recording. Perfect for making corrections or adding context to your transcriptions.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Pro tip:</span> You can customize these shortcuts in Settings → Shortcuts
          </p>
        </div>
      </div>
    </div>
  );
}
