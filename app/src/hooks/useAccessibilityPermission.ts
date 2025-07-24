import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { accessibilityService } from '../services/accessibility';
import { createLogger } from '../utils/logger';

const logger = createLogger('useAccessibilityPermission');

interface UseAccessibilityPermissionReturn {
  hasPermission: boolean;
  isChecking: boolean;
  showPermissionDialog: boolean;
  checkPermission: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  closePermissionDialog: () => void;
}

export function useAccessibilityPermission(): UseAccessibilityPermissionReturn {
  const [hasPermission, setHasPermission] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  const checkPermission = async (): Promise<void> => {
    setIsChecking(true);
    try {
      const permission = await accessibilityService.checkPermission();
      setHasPermission(permission);
    } finally {
      setIsChecking(false);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    const granted = await accessibilityService.requestPermission();
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

    // Listen for events that require accessibility permission
    const unlisteners: Array<() => void> = [];

    const setupListeners = async () => {
      // Listen when accessibility permission is needed
      unlisteners.push(
        await listen<string>('accessibility_permission_needed', async (event) => {
          const action = event.payload; // 'paste' or 'selection'
          logger.info(`Accessibility permission needed for: ${action}`);
          setShowPermissionDialog(true);
          // Re-check permission status
          await checkPermission();
        })
      );

      // Listen for editing errors that might be permission-related
      unlisteners.push(
        await listen('editing_error', async (event) => {
          const error = event.payload as string;
          logger.debug('Editing error received:', error);
          
          // Check if it's a permission error
          if (error.toLowerCase().includes('permission') || 
              error.toLowerCase().includes('accessibility')) {
            logger.info('Permission error detected in edit mode, showing dialog');
            setShowPermissionDialog(true);
            await checkPermission();
          }
        })
      );

      // Listen for when transcription completes - may need paste permission
      unlisteners.push(
        await listen('transcription_response', async () => {
          // Quick permission check when we might need to paste
          const permission = await accessibilityService.checkPermission();
          if (!permission) {
            logger.info('No accessibility permission for paste, will show dialog if paste fails');
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