import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
  download_size?: number;
}

interface UpdateCheckResult {
  available: boolean;
  update_info?: UpdateInfo;
}

const CHECK_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours

export function useAutoUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check for updates
  const checkForUpdates = async (isManual = false) => {
    try {
      setIsChecking(true);
      setLastCheck(new Date());
      
      if (isManual) {
        // For manual checks, use the native dialog
        await invoke<boolean>('check_and_prompt_for_update');
        // If user clicks "Install", the app will handle everything including restart
      } else {
        // For automatic checks, just check silently
        const result = await invoke<UpdateCheckResult>('check_for_updates');
        
        if (result.available && result.update_info) {
          setUpdateAvailable(true);
          setUpdateInfo(result.update_info);
          // We'll show a subtle notification in the UI instead of a modal
          setShowNotification(true);
        }
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Download and install update
  const downloadAndInstall = async () => {
    try {
      await invoke('download_and_install_update');
      
      // After successful download and install, restart the app
      await relaunch();
    } catch (error) {
      console.error('Failed to download/install update:', error);
      // Could show an error notification here
    }
  };

  // Handle "Later" button
  const handleLater = () => {
    setShowNotification(false);
  };

  // Set up automatic checking
  useEffect(() => {
    // Check on startup
    checkForUpdates();

    // Set up periodic checks
    checkIntervalRef.current = setInterval(() => {
      checkForUpdates();
    }, CHECK_INTERVAL);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  return {
    updateAvailable,
    updateInfo,
    showNotification,
    isChecking,
    lastCheck,
    checkForUpdates,
    downloadAndInstall,
    handleLater,
  };
}