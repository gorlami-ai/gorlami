import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

type RecordingState = 'idle' | 'recording' | 'processing' | 'error' | 'success';

export function useRecordingStatus() {
  const [state, setState] = useState<RecordingState>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    // console.log('Setting up recording status listeners...');
    const unlisteners: Array<() => void> = [];

    const setupListeners = async () => {
      unlisteners.push(
        await listen('recording_started', () => {
          console.log('[UI] Recording started event received');
          setState('recording');
          setMessage('Recording...');
        })
      );

      unlisteners.push(
        await listen('recording_stopped', () => {
          console.log('[UI] Recording stopped event received');
          setState('processing');
          setMessage('Processing...');
        })
      );

      unlisteners.push(
        await listen('recording_success', (event: any) => {
          console.log('[UI] Recording success event received', event.payload);
          setState('success');
          setMessage(event.payload?.message || 'Success!');
          // Auto-hide after 3 seconds
          setTimeout(() => setState('idle'), 3000);
        })
      );

      unlisteners.push(
        await listen('recording_error', (event) => {
          console.error('[UI] Recording error event received', event.payload);
          setState('error');
          setMessage((event.payload as string) || 'Error occurred');
          // Auto-hide after 5 seconds
          setTimeout(() => setState('idle'), 5000);
        })
      );

      unlisteners.push(
        await listen('audio_level', () => {
          // Audio level events are available for visual feedback
        })
      );
    };

    setupListeners();

    return () => {
      // console.log('Cleaning up recording status listeners');
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, []);

  return { state, message };
}
