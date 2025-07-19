import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useState, useRef } from 'react';
import { ShortcutField } from '../components/ShortcutField';

interface ShortcutConfig {
  transcription: string;
  edit: string;
  transcription_enabled: boolean;
  edit_enabled: boolean;
}

interface AudioDevice {
  name: string;
  is_default: boolean;
}

interface WebSocketConfig {
  url: string;
  auto_reconnect: boolean;
  reconnect_interval: number;
}

export function Settings() {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig>({
    transcription: 'fn',
    edit: 'fn+Shift',
    transcription_enabled: true,
    edit_enabled: true,
  });
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [websocketConfig, setWebsocketConfig] = useState<WebSocketConfig>({
    url: 'ws://localhost:8000/ws/transcribe',
    auto_reconnect: true,
    reconnect_interval: 5,
  });
  const [websocketStatus, setWebsocketStatus] = useState<string>('Disconnected');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSettings();

    // Listen for WebSocket status changes
    const unlistenWebSocketStatus = listen('websocket_status', (event: any) => {
      if (typeof event.payload === 'string') {
        setWebsocketStatus(event.payload);
      } else if (event.payload.Error) {
        setWebsocketStatus(`Error: ${event.payload.Error}`);
      } else {
        setWebsocketStatus('Connected');
      }
    });

    // Listen for shortcut feedback
    const unlistenShortcutUpdated = listen('shortcuts_updated', (event: any) => {
      console.log('Shortcuts updated successfully:', event.payload);
    });

    const unlistenShortcutError = listen('shortcuts_error', (event: any) => {
      console.error('Shortcut error:', event.payload);
    });

    return () => {
      unlistenWebSocketStatus.then((fn) => fn());
      unlistenShortcutUpdated.then((fn) => fn());
      unlistenShortcutError.then((fn) => fn());
    };
  }, []);

  const loadSettings = async () => {
    try {
      // Load all settings from persistent storage
      const appSettings = await invoke<any>('get_app_settings');

      // Apply shortcuts settings
      setShortcuts(appSettings.shortcuts);

      // Load audio devices
      const devices = await invoke<AudioDevice[]>('get_audio_devices');
      setAudioDevices(devices);

      // Set selected device from settings or default
      if (appSettings.selected_microphone) {
        setSelectedDevice(appSettings.selected_microphone);
      } else {
        const defaultDevice = devices.find((d) => d.is_default);
        if (defaultDevice) {
          setSelectedDevice(defaultDevice.name);
        }
      }

      // Apply WebSocket configuration
      setWebsocketConfig(appSettings.websocket);

      // Get WebSocket status
      const wsStatus = await invoke<any>('get_websocket_status');
      if (typeof wsStatus === 'string') {
        setWebsocketStatus(wsStatus);
      } else if (wsStatus.Error) {
        setWebsocketStatus(`Error: ${wsStatus.Error}`);
      } else {
        setWebsocketStatus('Connected');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShortcut = async (key: 'transcription_enabled' | 'edit_enabled', value: boolean) => {
    const newShortcuts = { ...shortcuts, [key]: value };
    setShortcuts(newShortcuts);
    
    try {
      // Update shortcuts configuration
      await invoke('update_shortcut_config', { config: newShortcuts });
      
      // Save to persistent settings
      const currentSettings = await invoke<any>('get_app_settings');
      await invoke('save_app_settings', {
        settings: {
          ...currentSettings,
          shortcuts: newShortcuts,
        },
      });
    } catch (error) {
      console.error('Failed to toggle shortcut:', error);
    }
  };

  const handleShortcutChange = async (type: keyof ShortcutConfig, value: string) => {
    setShortcuts((prev) => ({ ...prev, [type]: value }));

    // Validate and auto-save
    if (value.trim()) {
      try {
        await invoke('validate_shortcut', { shortcut: value });
        console.log(`Valid shortcut: ${value}`);
        
        // Auto-save shortcuts
        await invoke('update_shortcut_config', { 
          config: { ...shortcuts, [type]: value } 
        });
        
        // Save to persistent settings
        const currentSettings = await invoke<any>('get_app_settings');
        await invoke('save_app_settings', {
          settings: {
            ...currentSettings,
            shortcuts: { ...shortcuts, [type]: value },
          },
        });
      } catch (error) {
        console.warn(`Invalid shortcut format: ${value} - ${error}`);
      }
    }
  };

  const selectAudioDevice = async (deviceName: string) => {
    try {
      await invoke('select_audio_device', { deviceName });
      setSelectedDevice(deviceName);

      // Save to persistent settings
      const currentSettings = await invoke<any>('get_app_settings');
      await invoke('save_app_settings', {
        settings: {
          ...currentSettings,
          selected_microphone: deviceName,
        },
      });

      console.log('Audio device saved');
    } catch (error) {
      console.error('Failed to select audio device:', error);
    }
  };

  const handleWebSocketConfigChange = (
    key: keyof WebSocketConfig,
    value: string | boolean | number
  ) => {
    setWebsocketConfig((prev) => ({ ...prev, [key]: value }));
  };

  const saveWebSocketConfig = async () => {
    try {
      await invoke('update_websocket_config', { config: websocketConfig });

      // Save to persistent settings
      const currentSettings = await invoke<any>('get_app_settings');
      await invoke('save_app_settings', {
        settings: {
          ...currentSettings,
          websocket: websocketConfig,
        },
      });

      console.log('WebSocket configuration saved');
    } catch (error) {
      console.error('Failed to save WebSocket configuration:', error);
    }
  };

  const connectWebSocket = async () => {
    try {
      await invoke('connect_websocket');
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  };

  const disconnectWebSocket = async () => {
    try {
      await invoke('disconnect_websocket');
    } catch (error) {
      console.error('Failed to disconnect WebSocket:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-10 min-h-screen bg-white">
        <div className="text-center py-16 text-gray-500 text-lg">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-white">
      <div className="mb-4">
        <h1 className="text-gray-900 text-2xl font-semibold">Settings</h1>
      </div>

      <div className="max-w-2xl">
        {/* Keyboard Shortcuts Section */}
        <section className="mb-6">
          <h2 className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">Keyboard Shortcuts</h2>
          
          <div className="space-y-0">
            <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="transcription-enabled"
                  checked={shortcuts.transcription_enabled}
                  onChange={(e) => handleToggleShortcut('transcription_enabled', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="transcription-enabled" className="text-gray-900 text-sm font-medium">Transcribe</label>
              </div>
              <ShortcutField
                value={shortcuts.transcription}
                onChange={(value) => handleShortcutChange('transcription', value)}
                placeholder="Click to set shortcut"
              />
            </div>
            
            <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="edit-enabled"
                  checked={shortcuts.edit_enabled}
                  onChange={(e) => handleToggleShortcut('edit_enabled', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="edit-enabled" className="text-gray-900 text-sm font-medium">Edit</label>
              </div>
              <ShortcutField
                value={shortcuts.edit}
                onChange={(value) => handleShortcutChange('edit', value)}
                placeholder="Click to set shortcut"
              />
            </div>
          </div>
        </section>

        {/* Audio Section */}
        <section className="mb-6">
          <h2 className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">Audio</h2>
          
          <div className="space-y-0">
            <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
              <label className="text-gray-900 text-sm font-medium">Microphone</label>
              <select
                value={selectedDevice}
                onChange={(e) => selectAudioDevice(e.target.value)}
                className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 min-w-[200px]"
              >
                {audioDevices.map((device) => (
                  <option key={device.name} value={device.name}>
                    {device.name} {device.is_default ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Backend Section */}
        <section className="mb-6">
          <h2 className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">Backend</h2>
          
          <div className="space-y-0">
            <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
              <label className="text-gray-900 text-sm font-medium">Server URL</label>
              <input
                type="text"
                value={websocketConfig.url}
                onChange={(e) => {
                  handleWebSocketConfigChange('url', e.target.value);
                  // Auto-save after a delay with debouncing
                  if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                  }
                  saveTimeoutRef.current = setTimeout(() => {
                    saveWebSocketConfig();
                  }, 1000);
                }}
                placeholder="ws://localhost:8000/ws/transcribe"
                className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 min-w-[250px]"
              />
            </div>
            
            <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
              <label className="text-gray-900 text-sm font-medium">Connection</label>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    websocketStatus === 'Connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {websocketStatus}
                </span>
                <button
                  onClick={websocketStatus === 'Connected' ? disconnectWebSocket : connectWebSocket}
                  className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1 hover:bg-gray-100 transition-colors"
                >
                  {websocketStatus === 'Connected' ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}