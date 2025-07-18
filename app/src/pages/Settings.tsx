import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

interface ShortcutConfig {
  transcription: string;
  edit: string;
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
    transcription: 'CommandOrControl+Ctrl+Space',
    edit: 'CommandOrControl+Ctrl+E',
  });
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const [websocketConfig, setWebsocketConfig] = useState<WebSocketConfig>({
    url: 'ws://localhost:8000/ws/transcribe',
    auto_reconnect: true,
    reconnect_interval: 5,
  });
  const [websocketStatus, setWebsocketStatus] = useState<string>('Disconnected');

  useEffect(() => {
    loadSettings();

    // Listen for recording state changes
    const unlistenStart = listen('recording_started', () => {
      setIsRecording(true);
    });

    const unlistenStop = listen('recording_stopped', () => {
      setIsRecording(false);
    });

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

    const unlistenRecordingError = listen('recording_error', (event: any) => {
      console.error('Recording error:', event.payload);
    });

    return () => {
      unlistenStart.then((fn) => fn());
      unlistenStop.then((fn) => fn());
      unlistenWebSocketStatus.then((fn) => fn());
      unlistenShortcutUpdated.then((fn) => fn());
      unlistenShortcutError.then((fn) => fn());
      unlistenRecordingError.then((fn) => fn());
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

      // Get recording status
      const recordingStatus = await invoke<boolean>('is_recording');
      setIsRecording(recordingStatus);

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

  const handleShortcutChange = async (type: keyof ShortcutConfig, value: string) => {
    setShortcuts((prev) => ({ ...prev, [type]: value }));

    // Validate shortcut format
    if (value.trim()) {
      try {
        await invoke('validate_shortcut', { shortcut: value });
        console.log(`Valid shortcut: ${value}`);
      } catch (error) {
        console.warn(`Invalid shortcut format: ${value} - ${error}`);
      }
    }
  };

  const saveShortcuts = async () => {
    try {
      await invoke('update_shortcut_config', { config: shortcuts });

      // Also save to persistent settings
      const currentSettings = await invoke<any>('get_app_settings');
      await invoke('save_app_settings', {
        settings: {
          ...currentSettings,
          shortcuts: shortcuts,
        },
      });

      console.log('Shortcuts saved');
    } catch (error) {
      console.error('Failed to save shortcuts:', error);
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

  const toggleRecording = async () => {
    try {
      if (isRecording) {
        await invoke('stop_recording');
      } else {
        await invoke('start_recording');
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
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
      <div className="p-10 bg-white min-h-screen">
        <div className="text-center py-16 text-gray-500 text-lg">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen scrollbar-thin">
      <div className="mb-8">
        <h1 className="text-gray-900 text-xl font-semibold">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure your voice assistant settings</p>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Shortcuts Section */}
        <section className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
          <h2 className="text-gray-900 mb-6 text-lg font-semibold">Keyboard Shortcuts</h2>
          <div className="mb-6">
            <label htmlFor="transcription-shortcut" className="block mb-2 font-medium text-gray-700 text-sm">Transcription Toggle</label>
            <input
              id="transcription-shortcut"
              type="text"
              value={shortcuts.transcription}
              onChange={(e) => handleShortcutChange('transcription', e.target.value)}
              placeholder="CommandOrControl+Ctrl+Space"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm transition-colors bg-white text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="edit-shortcut" className="block mb-2 font-medium text-gray-700 text-sm">Edit Shortcut</label>
            <input
              id="edit-shortcut"
              type="text"
              value={shortcuts.edit}
              onChange={(e) => handleShortcutChange('edit', e.target.value)}
              placeholder="CommandOrControl+Ctrl+E"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm transition-colors bg-white text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button onClick={saveShortcuts} className="bg-blue-500 text-white border-0 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors hover:bg-blue-600">
            Save Shortcuts
          </button>
        </section>

        {/* Audio Section */}
        <section className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
          <h2 className="text-gray-900 mb-6 text-lg font-semibold">Audio Settings</h2>
          <div className="mb-6">
            <label htmlFor="audio-device" className="block mb-2 font-medium text-gray-700 text-sm">Microphone Device</label>
            <select
              id="audio-device"
              value={selectedDevice}
              onChange={(e) => selectAudioDevice(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm transition-colors bg-white text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              {audioDevices.map((device) => (
                <option key={device.name} value={device.name}>
                  {device.name} {device.is_default ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-6">
            <label className="block mb-2 font-medium text-gray-700 text-sm">Recording Status</label>
            <div className="flex items-center gap-3 mt-3">
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                isRecording ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {isRecording ? 'Recording' : 'Idle'}
              </span>
              <button onClick={toggleRecording} className="bg-blue-500 text-white border-0 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors hover:bg-blue-600">
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
            </div>
          </div>
        </section>

        {/* Backend Configuration */}
        <section className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
          <h2 className="text-gray-900 mb-6 text-lg font-semibold">Backend Configuration</h2>
          <div className="mb-6">
            <label htmlFor="websocket-url" className="block mb-2 font-medium text-gray-700 text-sm">WebSocket URL</label>
            <input
              id="websocket-url"
              type="text"
              value={websocketConfig.url}
              onChange={(e) => handleWebSocketConfigChange('url', e.target.value)}
              placeholder="ws://localhost:8000/ws/transcribe"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm transition-colors bg-white text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="mb-6">
            <label className="flex items-center gap-3 text-gray-700 font-medium text-sm">
              <input
                type="checkbox"
                checked={websocketConfig.auto_reconnect}
                onChange={(e) => handleWebSocketConfigChange('auto_reconnect', e.target.checked)}
                className="w-4 h-4 text-blue-500 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              Auto-reconnect to backend
            </label>
          </div>
          <div className="mb-6">
            <label htmlFor="reconnect-interval" className="block mb-2 font-medium text-gray-700 text-sm">Reconnect Interval (seconds)</label>
            <input
              id="reconnect-interval"
              type="number"
              value={websocketConfig.reconnect_interval}
              onChange={(e) =>
                handleWebSocketConfigChange('reconnect_interval', parseInt(e.target.value))
              }
              min="1"
              max="60"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm transition-colors bg-white text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="mb-6">
            <label className="block mb-2 font-medium text-gray-700 text-sm">Connection Status</label>
            <div className="flex items-center gap-3 mt-3">
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  websocketStatus === 'Connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {websocketStatus}
              </span>
              <button onClick={saveWebSocketConfig} className="bg-blue-500 text-white border-0 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors hover:bg-blue-600">
                Save Config
              </button>
              <button
                onClick={websocketStatus === 'Connected' ? disconnectWebSocket : connectWebSocket}
                className="bg-gray-200 text-gray-700 border-0 px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors hover:bg-gray-300"
              >
                {websocketStatus === 'Connected' ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}