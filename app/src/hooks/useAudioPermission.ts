import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { audioPermissionService } from '../services/audioPermission';
import { createLogger } from '../utils/logger';

const logger = createLogger('useAudioPermission');

interface UseAudioPermissionReturn {
  hasPermission: boolean;
  isChecking: boolean;
  showPermissionDialog: boolean;
  checkPermission: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  closePermissionDialog: () => void;
}

export function useAudioPermission(): UseAudioPermissionReturn {
  const [hasPermission, setHasPermission] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  const checkPermission = async (): Promise<void> => {
    setIsChecking(true);
    try {
      const status = await audioPermissionService.checkPermission();
      setHasPermission(status.hasPermission);
    } finally {
      setIsChecking(false);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    const granted = await audioPermissionService.requestPermission();
    setHasPermission(granted);
    if (granted) {
      setShowPermissionDialog(false);
    }
    return granted;
  };

  const closePermissionDialog = () => {
    setShowPermissionDialog(false);
  };

  useEffect(() => {
    // Check permission on mount
    checkPermission();

    // Listen for recording errors that might be permission-related
    const unlisteners: Array<() => void> = [];

    const setupListeners = async () => {
      unlisteners.push(
        await listen('recording_error', async (event) => {
          const error = event.payload as string;
          logger.debug('Recording error received:', error);
          
          // Check if it's a permission error
          if (error.toLowerCase().includes('permission') || 
              error.toLowerCase().includes('microphone access')) {
            logger.info('Permission error detected, showing dialog');
            setShowPermissionDialog(true);
            // Re-check permission status
            await checkPermission();
          }
        })
      );

      // Listen for when recording is about to start
      unlisteners.push(
        await listen('shortcut_triggered', async (event) => {
          if (event.payload === 'transcription') {
            // Quick permission check when recording is triggered
            const status = await audioPermissionService.checkPermission();
            if (!status.hasPermission) {
              logger.info('No microphone permission, showing dialog');
              setShowPermissionDialog(true);
            }
          }
        })
      );
    };

    setupListeners();

    return () => {
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, []);

  return {
    hasPermission,
    isChecking,
    showPermissionDialog,
    checkPermission,
    requestPermission,
    closePermissionDialog
  };
}