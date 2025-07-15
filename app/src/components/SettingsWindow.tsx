import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';
import './SettingsWindow.css';

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

export function SettingsWindow() {
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
      <div className="settings-window">
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-window">
      <div className="settings-header">
        <h1>Gorlami Settings</h1>
        <p>Configure your voice assistant settings</p>
        <div className="connection-status">
          <span
            className={`status-badge ${
              websocketStatus === 'Connected' ? 'connected' : 'disconnected'
            }`}
          >
            {websocketStatus === 'Connected' ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>
      </div>

      <div className="settings-content">
        {/* Shortcuts Section */}
        <section className="settings-section">
          <h2>Keyboard Shortcuts</h2>
          <div className="setting-item">
            <label htmlFor="transcription-shortcut">Transcription Toggle:</label>
            <input
              id="transcription-shortcut"
              type="text"
              value={shortcuts.transcription}
              onChange={(e) => handleShortcutChange('transcription', e.target.value)}
              placeholder="CommandOrControl+Ctrl+Space"
            />
          </div>
          <div className="setting-item">
            <label htmlFor="edit-shortcut">Edit Shortcut:</label>
            <input
              id="edit-shortcut"
              type="text"
              value={shortcuts.edit}
              onChange={(e) => handleShortcutChange('edit', e.target.value)}
              placeholder="CommandOrControl+Ctrl+E"
            />
          </div>
          <button onClick={saveShortcuts} className="save-button">
            Save Shortcuts
          </button>
        </section>

        {/* Audio Section */}
        <section className="settings-section">
          <h2>Audio Settings</h2>
          <div className="setting-item">
            <label htmlFor="audio-device">Microphone Device:</label>
            <select
              id="audio-device"
              value={selectedDevice}
              onChange={(e) => selectAudioDevice(e.target.value)}
            >
              {audioDevices.map((device) => (
                <option key={device.name} value={device.name}>
                  {device.name} {device.is_default ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="setting-item">
            <label>Recording Status:</label>
            <div className="recording-controls">
              <span className={`status-indicator ${isRecording ? 'recording' : 'idle'}`}>
                {isRecording ? 'Recording' : 'Idle'}
              </span>
              <button onClick={toggleRecording} className="toggle-button">
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
            </div>
          </div>
        </section>

        {/* Backend Configuration */}
        <section className="settings-section">
          <h2>Backend Configuration</h2>
          <div className="setting-item">
            <label htmlFor="websocket-url">WebSocket URL:</label>
            <input
              id="websocket-url"
              type="text"
              value={websocketConfig.url}
              onChange={(e) => handleWebSocketConfigChange('url', e.target.value)}
              placeholder="ws://localhost:8000/ws/transcribe"
            />
          </div>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={websocketConfig.auto_reconnect}
                onChange={(e) => handleWebSocketConfigChange('auto_reconnect', e.target.checked)}
              />
              Auto-reconnect to backend
            </label>
          </div>
          <div className="setting-item">
            <label htmlFor="reconnect-interval">Reconnect Interval (seconds):</label>
            <input
              id="reconnect-interval"
              type="number"
              value={websocketConfig.reconnect_interval}
              onChange={(e) =>
                handleWebSocketConfigChange('reconnect_interval', parseInt(e.target.value))
              }
              min="1"
              max="60"
            />
          </div>
          <div className="setting-item">
            <label>Connection Status:</label>
            <div className="recording-controls">
              <span
                className={`status-indicator ${
                  websocketStatus === 'Connected' ? 'recording' : 'idle'
                }`}
              >
                {websocketStatus}
              </span>
              <button onClick={saveWebSocketConfig} className="save-button">
                Save Config
              </button>
              <button
                onClick={websocketStatus === 'Connected' ? disconnectWebSocket : connectWebSocket}
                className="toggle-button"
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
