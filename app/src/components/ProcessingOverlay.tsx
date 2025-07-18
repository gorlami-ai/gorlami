import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

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
  const [autoHideTimeout, setAutoHideTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

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


  const getStateDisplay = () => {
    switch (processingState) {
      case 'recording':
        return {
          icon: <div className="w-4 h-4 rounded-full bg-rose-500 animate-pulse-ring shadow-lg shadow-rose-500/30"></div>,
          text: 'Listening...',
          className: 'flex items-center gap-3 text-white',
        };
      case 'transcribing':
        return {
          icon: <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>,
          text: 'Transcribing...',
          className: 'flex items-center gap-3 text-white',
        };
      case 'enhancing':
        return {
          icon: <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>,
          text: 'Enhancing...',
          className: 'flex items-center gap-3 text-white',
        };
      case 'pasting':
        return {
          icon: <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>,
          text: 'Pasting...',
          className: 'flex items-center gap-3 text-white',
        };
      case 'complete':
        return {
          icon: <div className="w-4 h-4 flex items-center justify-center bg-emerald-500 text-white rounded-full text-xs font-bold animate-fade-in">✓</div>,
          text: 'Complete!',
          className: 'flex items-center gap-3 text-emerald-500 font-semibold',
        };
      case 'error':
        return {
          icon: <div className="w-4 h-4 flex items-center justify-center bg-rose-500 text-white rounded-full text-xs font-bold">⚠</div>,
          text: errorMessage || 'Error occurred',
          className: 'flex items-center gap-3 text-rose-500 font-medium text-sm min-w-[220px]',
        };
      default:
        return {
          icon: <div className="w-4 h-4 flex items-center justify-center text-base">🎤</div>,
          text: 'Ready',
          className: 'flex items-center gap-3 text-white',
        };
    }
  };

  // Only show overlay if visible and not in idle state
  if (!isVisible && processingState === 'idle') {
    return null;
  }

  const stateDisplay = getStateDisplay();

  return (
    <div className={`fixed top-0 left-0 w-screen h-screen flex items-start justify-end pt-2 pr-4 pointer-events-none z-[1000] transition-all duration-300 ease-in-out ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'
    }`}>
      <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl px-5 py-3 flex items-center gap-3 min-w-[200px] max-w-[300px] shadow-2xl border border-white/10 animate-slide-in pointer-events-auto transition-all duration-300 ease-in-out">
        <div className="absolute top-2 right-2">
          <div className={`w-2 h-2 rounded-full transition-colors duration-200 ${
            connectionStatus === 'connected' ? 'bg-emerald-500' :
            connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' :
            'bg-rose-500'
          }`}></div>
        </div>

        <div className={stateDisplay.className}>
          {stateDisplay.icon}
          <span className="text-sm font-medium tracking-wide">{stateDisplay.text}</span>

          {/* Audio level visualization when recording */}
          {processingState === 'recording' && (
            <div className="relative w-16 h-1 bg-white/20 rounded-full overflow-hidden ml-2">
              <div 
                className={`h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 rounded-full transition-all duration-100 ease-out origin-left ${
                  audioLevel <= 0.1 ? 'scale-x-[0.1]' :
                  audioLevel <= 0.2 ? 'scale-x-[0.2]' :
                  audioLevel <= 0.3 ? 'scale-x-[0.3]' :
                  audioLevel <= 0.4 ? 'scale-x-[0.4]' :
                  audioLevel <= 0.5 ? 'scale-x-[0.5]' :
                  audioLevel <= 0.6 ? 'scale-x-[0.6]' :
                  audioLevel <= 0.7 ? 'scale-x-[0.7]' :
                  audioLevel <= 0.8 ? 'scale-x-[0.8]' :
                  audioLevel <= 0.9 ? 'scale-x-[0.9]' :
                  'scale-x-100'
                }`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
