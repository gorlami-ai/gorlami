import { useCallback, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useProcessingEvents, useAutoHide, ProcessingState } from '../hooks/useProcessingEvents';
import { WaveIndicator } from './WaveIndicator';
import { calculateRMS, AudioLevelSmoother } from '../utils/audioLevel';
export function ProcessingOverlay() {
  const [processingState, setProcessingState] = useState<ProcessingState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isVisible, setIsVisible] = useState(false);
  const audioSmootherRef = useRef(new AudioLevelSmoother());

  const { scheduleHide, cancelHide } = useAutoHide();

  const hideOverlay = useCallback(async () => {
    setIsVisible(false);
    setProcessingState('idle');
    // Hide the actual window
    try {
      await invoke('hide_processing_overlay');
    } catch (error) {
      console.error('Failed to hide overlay window:', error);
    }
  }, []);

  const showOverlay = useCallback(() => {
    console.log('Showing overlay');
    setIsVisible(true);
    cancelHide();
  }, [cancelHide]);

  const eventHandlers = {
    onRecordingStarted: () => {
      console.log('Recording started event received');
      setProcessingState('recording');
      setErrorMessage('');
      audioSmootherRef.current.reset();
      setAudioLevel(0);
      showOverlay();
    },
    onRecordingStopped: () => {
      console.log('Recording stopped event received');
      setProcessingState('transcribing');
    },
    onAudioChunk: (audioData: number[]) => {
      // Calculate RMS level from audio data
      const rmsLevel = calculateRMS(audioData);
      // Apply smoothing for better visual effect
      const smoothedLevel = audioSmootherRef.current.addLevel(rmsLevel);
      setAudioLevel(smoothedLevel);
    },
    onTranscriptionResponse: (response: { is_final: boolean; text?: string }) => {
      console.log('Transcription response received', response);
      if (response.is_final) {
        setProcessingState('enhancing');
      }
    },
    onTextPasted: () => {
      console.log('Text pasted event received');
      setProcessingState('complete');
      scheduleHide(hideOverlay, 1500);
    },
    onRecordingError: (error: string) => {
      console.error('Recording error event received:', error);
      setProcessingState('error');
      setErrorMessage(error);
      scheduleHide(hideOverlay, 4000);
    },
    onAudioError: (error: string) => {
      setProcessingState('error');
      setErrorMessage(error);
      scheduleHide(hideOverlay, 4000);
    },
    onEditingStarted: () => {
      setProcessingState('selecting');
      setErrorMessage('');
      showOverlay();
      // Change to editing state after a short delay
      setTimeout(() => setProcessingState('editing'), 500);
    },
    onEditingComplete: () => {
      setProcessingState('complete');
      scheduleHide(hideOverlay, 1500);
    },
    onEditingError: (error: string) => {
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
          icon: <WaveIndicator audioLevel={audioLevel} isActive={true} />,
          text: 'Listening...',
          className: 'flex items-center gap-3 text-white',
          useWaveIndicator: true,
        };
      case 'transcribing':
        return {
          icon: (
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 rounded-full border-2 border-white/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-400 border-r-purple-400 animate-spin" />
            </div>
          ),
          text: 'Transcribing...',
          className: 'flex items-center gap-3 text-white',
        };
      case 'enhancing':
        return {
          icon: (
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 rounded-full border-2 border-white/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400 border-r-blue-400 animate-spin" />
            </div>
          ),
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
          icon: (
            <div className="relative">
              <div className="w-5 h-5 flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-full animate-fade-in">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />
            </div>
          ),
          text: 'Complete!',
          className: 'flex items-center gap-3 text-emerald-400 font-semibold',
        };
      case 'error':
        return {
          icon: (
            <div className="w-5 h-5 flex items-center justify-center bg-gradient-to-br from-rose-400 to-rose-600 text-white rounded-full">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ),
          text: errorMessage || 'Error occurred',
          className: 'flex items-center gap-3 text-rose-400 font-medium text-sm min-w-[220px]',
        };
      case 'selecting':
        return {
          icon: <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>,
          text: 'Getting selection...',
          className: 'flex items-center gap-3 text-white',
        };
      case 'editing':
        return {
          icon: <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>,
          text: 'Editing text...',
          className: 'flex items-center gap-3 text-white',
        };
      default:
        return {
          icon: <div className="w-4 h-4 flex items-center justify-center text-base">🎤</div>,
          text: 'Ready',
          className: 'flex items-center gap-3 text-white',
        };
    }
  };

  // Always render the component but control visibility with CSS
  // This ensures the window stays active

  const stateDisplay = getStateDisplay();

  return (
    <div className="fixed inset-0 bg-transparent">
      <div className={`w-full h-full flex items-center justify-center transition-all duration-300 ease-in-out ${
        isVisible && processingState !== 'idle' ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`}>
      <div className={`bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 animate-slide-in pointer-events-auto transition-all duration-300 ease-in-out ${
        stateDisplay.useWaveIndicator ? 'px-6 py-4' : 'px-5 py-3'
      }`}>
        {stateDisplay.useWaveIndicator ? (
          <div className="flex flex-col items-center gap-2">
            {stateDisplay.icon}
            <span className="text-sm font-medium tracking-wide text-white/90">{stateDisplay.text}</span>
          </div>
        ) : (
          <div className={stateDisplay.className}>
            {stateDisplay.icon}
            <span className="text-sm font-medium tracking-wide">{stateDisplay.text}</span>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
