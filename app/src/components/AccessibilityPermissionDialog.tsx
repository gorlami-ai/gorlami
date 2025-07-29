import React, { useEffect, useState } from 'react';
import { accessibilityService } from '../services/accessibility';
import { createLogger } from '../utils/logger';

const logger = createLogger('AccessibilityPermissionDialog');

interface AccessibilityPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export const AccessibilityPermissionDialog: React.FC<AccessibilityPermissionDialogProps> = ({
  isOpen,
  onClose,
  onPermissionGranted
}) => {
  const [checking, setChecking] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkPermission();
    }
  }, [isOpen]);

  const checkPermission = async () => {
    setChecking(true);
    try {
      const permission = await accessibilityService.checkPermission();
      setHasPermission(permission);
      
      if (permission && onPermissionGranted) {
        onPermissionGranted();
        onClose();
      }
    } finally {
      setChecking(false);
    }
  };

  const handleRequestPermission = async () => {
    setChecking(true);
    try {
      const granted = await accessibilityService.requestPermission();
      if (granted) {
        setHasPermission(true);
        if (onPermissionGranted) {
          onPermissionGranted();
        }
        onClose();
      } else {
        // Permission not granted immediately, user needs to grant it in System Preferences
        logger.info('User needs to grant permission in System Preferences');
      }
    } finally {
      setChecking(false);
    }
  };

  const handleOpenPreferences = async () => {
    await accessibilityService.openSystemPreferences();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Accessibility Permission Required
        </h2>
        
        <div className="mb-6 space-y-3">
          <p className="text-gray-700 dark:text-gray-300">
            Gorlami needs accessibility permission to:
          </p>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
            <li>Insert transcribed text at your cursor position</li>
            <li>Read selected text for editing</li>
            <li>Work seamlessly across all applications</li>
          </ul>
          
          {!hasPermission && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                After clicking "Grant Permission", you'll need to:
              </p>
              <ol className="list-decimal list-inside text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                <li>Find Gorlami in the list of apps</li>
                <li>Check the checkbox next to Gorlami</li>
                <li>You may need to unlock the settings first</li>
              </ol>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {!hasPermission ? (
            <>
              <button
                onClick={handleRequestPermission}
                disabled={checking}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {checking ? 'Checking...' : 'Grant Permission'}
              </button>
              <button
                onClick={handleOpenPreferences}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Open Settings
              </button>
            </>
          ) : (
            <button
              onClick={checkPermission}
              disabled={checking}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {checking ? 'Checking...' : 'Check Again'}
            </button>
          )}
          
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {hasPermission ? 'Close' : 'Cancel'}
          </button>
        </div>

        {hasPermission && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✓ Permission granted! Gorlami can now insert text and read selections.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};