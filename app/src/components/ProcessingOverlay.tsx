import { useCallback, useState } from 'react';
import { useProcessingEvents, useAutoHide, ProcessingState } from '../hooks/useProcessingEvents';
export function ProcessingOverlay() {
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isVisible, setIsVisible] = useState(false);

  const { scheduleHide, cancelHide } = useAutoHide();

  const hideOverlay = useCallback(() => {
    setIsVisible(false);
    setProcessingState('idle');
  }, []);

  const showOverlay = useCallback(() => {
    setIsVisible(true);
    cancelHide();
  }, [cancelHide]);

  const eventHandlers = {
    onRecordingStarted: () => {
      setProcessingState('recording');
      setErrorMessage('');
      showOverlay();
    },
    onRecordingStopped: () => {
      setProcessingState('transcribing');
    },
    onAudioChunk: (audioData: number[]) => {
      // Calculate audio level from chunk data (simplified)
      const level = Math.min(audioData.length / 1000, 1);
      setAudioLevel(level);
    },
    onTranscriptionResponse: (response: { is_final: boolean; text?: string }) => {
      if (response.is_final) {
        setProcessingState('enhancing');
      }
    },
    onTextPasted: () => {
      setProcessingState('complete');
      scheduleHide(hideOverlay, 1500);
    },
    onRecordingError: (error: string) => {
      setProcessingState('error');
      setErrorMessage(error);
      scheduleHide(hideOverlay, 4000);
    },
    onAudioError: (error: string) => {
      setProcessingState('error');
      setErrorMessage(error);
      scheduleHide(hideOverlay, 4000);
    },
  };

  useProcessingEvents(eventHandlers);


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
