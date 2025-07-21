import { useEffect, useRef } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export type ProcessingState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'enhancing'
  | 'pasting'
  | 'complete'
  | 'error'
  | 'selecting'
  | 'editing';


interface ProcessingEventHandlers {
  onRecordingStarted: () => void;
  onRecordingStopped: () => void;
  onAudioChunk: (audioData: number[]) => void;
  onTranscriptionResponse: (response: { is_final: boolean; text?: string }) => void;
  onTextPasted: () => void;
  onRecordingError: (error: string) => void;
  onAudioError: (error: string) => void;
  onEditingStarted?: () => void;
  onEditingComplete?: (data: { originalText: string; editedText: string }) => void;
  onEditingError?: (error: string) => void;
}

export function useProcessingEvents(handlers: ProcessingEventHandlers) {
  const unlistenersRef = useRef<UnlistenFn[]>([]);

  useEffect(() => {
    const setupListeners = async () => {
      const unlisteners = await Promise.all([
        listen('recording_started', () => handlers.onRecordingStarted()),
        listen('recording_stopped', () => handlers.onRecordingStopped()),
        listen<number[]>('audio_chunk', (event) => {
          if (event.payload) {
            handlers.onAudioChunk(event.payload);
          }
        }),
        listen<{ is_final: boolean; text?: string }>('transcription_response', (event) => {
          if (event.payload) {
            handlers.onTranscriptionResponse(event.payload);
          }
        }),
        listen('text_pasted', () => handlers.onTextPasted()),
        listen<string>('recording_error', (event) => {
          handlers.onRecordingError(event.payload || 'Recording error');
        }),
        listen<string>('audio_error', (event) => {
          handlers.onAudioError(event.payload || 'Audio error');
        }),
        ...(handlers.onEditingStarted ? [
          listen('editing_started', () => handlers.onEditingStarted!())
        ] : []),
        ...(handlers.onEditingComplete ? [
          listen<{ originalText: string; editedText: string }>('editing_complete', (event) => {
            if (event.payload) {
              handlers.onEditingComplete!(event.payload);
            }
          })
        ] : []),
        ...(handlers.onEditingError ? [
          listen<string>('editing_error', (event) => {
            handlers.onEditingError!(event.payload || 'Editing error');
          })
        ] : []),
      ]);

      unlistenersRef.current = unlisteners;
    };

    setupListeners();

    return () => {
      unlistenersRef.current.forEach((unlisten) => unlisten());
      unlistenersRef.current = [];
    };
  }, [handlers]);
}

export function useAutoHide(delay: number = 3000) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHide = (callback: () => void, customDelay?: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback();
      timeoutRef.current = null;
    }, customDelay ?? delay);
  };

  const cancelHide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { scheduleHide, cancelHide };
}