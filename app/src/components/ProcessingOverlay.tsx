import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';
import './ProcessingOverlay.css';

type ProcessingState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'enhancing'
  | 'pasting'
  | 'complete'
  | 'error';
type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export function ProcessingOverlay() {
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isVisible, setIsVisible] = useState(false);
  const [autoHideTimeout, setAutoHideTimeout] = useState<number | null>(null);

  // Auto-hide overlay after delay
  const scheduleAutoHide = (delay: number = 3000) => {
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout);
    }
    const timeout = setTimeout(() => {
      setIsVisible(false);
      setProcessingState('idle');
    }, delay);
    setAutoHideTimeout(timeout);
  };

  const showOverlay = () => {
    setIsVisible(true);
    if (autoHideTimeout) {
      clearTimeout(autoHideTimeout);
      setAutoHideTimeout(null);
    }
  };

  useEffect(() => {
    // Listen for recording events
    const unlistenStart = listen('recording_started', () => {
      setProcessingState('recording');
      setErrorMessage('');
      showOverlay();
    });

    const unlistenStop = listen('recording_stopped', () => {
      setProcessingState('transcribing');
    });

    // Listen for audio chunks (for audio level visualization)
    const unlistenAudioChunk = listen('audio_chunk', (event: any) => {
      if (event.payload) {
        // Calculate audio level from chunk data (simplified)
        const audioData = event.payload as number[];
        const level = Math.min(audioData.length / 1000, 1); // Simplified audio level
        setAudioLevel(level);
      }
    });

    // Listen for transcription responses
    const unlistenTranscription = listen('transcription_response', (event: any) => {
      if (event.payload?.is_final) {
        setProcessingState('enhancing');
      }
    });

    // Listen for text pasting
    const unlistenTextPasted = listen('text_pasted', () => {
      setProcessingState('complete');
      scheduleAutoHide(1500); // Hide after 1.5 seconds
    });

    // Listen for WebSocket status changes
    const unlistenWebSocketStatus = listen('websocket_status', (event: any) => {
      if (event.payload === 'Connected') {
        setConnectionStatus('connected');
      } else if (event.payload === 'Connecting') {
        setConnectionStatus('connecting');
      } else {
        setConnectionStatus('disconnected');
      }
    });

    // Listen for errors
    const unlistenRecordingError = listen('recording_error', (event: any) => {
      setProcessingState('error');
      setErrorMessage(event.payload || 'Recording error');
      scheduleAutoHide(4000); // Hide after 4 seconds for errors
    });

    const unlistenAudioError = listen('audio_error', (event: any) => {
      setProcessingState('error');
      setErrorMessage(event.payload || 'Audio error');
      scheduleAutoHide(4000);
    });

    return () => {
      unlistenStart.then((fn) => fn());
      unlistenStop.then((fn) => fn());
      unlistenAudioChunk.then((fn) => fn());
      unlistenTranscription.then((fn) => fn());
      unlistenTextPasted.then((fn) => fn());
      unlistenWebSocketStatus.then((fn) => fn());
      unlistenRecordingError.then((fn) => fn());
      unlistenAudioError.then((fn) => fn());

      if (autoHideTimeout) {
        clearTimeout(autoHideTimeout);
      }
    };
  }, [autoHideTimeout]);

  const hideOverlay = async () => {
    try {
      await invoke('hide_processing_overlay');
    } catch (error) {
      console.error('Failed to hide processing overlay:', error);
    }
  };

  const getStateDisplay = () => {
    switch (processingState) {
      case 'recording':
        return {
          icon: <div className="pulse-circle"></div>,
          text: 'Listening...',
          className: 'recording-state',
        };
      case 'transcribing':
        return {
          icon: <div className="processing-spinner"></div>,
          text: 'Transcribing...',
          className: 'processing-state',
        };
      case 'enhancing':
        return {
          icon: <div className="processing-spinner"></div>,
          text: 'Enhancing...',
          className: 'processing-state',
        };
      case 'pasting':
        return {
          icon: <div className="processing-spinner"></div>,
          text: 'Pasting...',
          className: 'processing-state',
        };
      case 'complete':
        return {
          icon: <div className="success-icon">✓</div>,
          text: 'Complete!',
          className: 'success-state',
        };
      case 'error':
        return {
          icon: <div className="error-icon">⚠</div>,
          text: errorMessage || 'Error occurred',
          className: 'error-state',
        };
      default:
        return {
          icon: <div className="microphone-icon">🎤</div>,
          text: 'Ready',
          className: 'idle-state',
        };
    }
  };

  // Only show overlay if visible and not in idle state
  if (!isVisible && processingState === 'idle') {
    return null;
  }

  const stateDisplay = getStateDisplay();

  return (
    <div className={`processing-overlay ${isVisible ? 'visible' : ''}`}>
      <div className="processing-content">
        <div className="status-indicator">
          <div className={`connection-dot ${connectionStatus}`}></div>
        </div>

        <div className={stateDisplay.className}>
          {stateDisplay.icon}
          <span>{stateDisplay.text}</span>

          {/* Audio level visualization when recording */}
          {processingState === 'recording' && (
            <div className="audio-level-container">
              <div className="audio-level-bar" style={{ width: `${audioLevel * 100}%` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
