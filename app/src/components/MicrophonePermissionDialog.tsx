import React, { useEffect, useState } from 'react';
import { audioPermissionService, MicrophonePermissionStatus } from '../services/audioPermission';

interface MicrophonePermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: () => void;
}

export const MicrophonePermissionDialog: React.FC<MicrophonePermissionDialogProps> = ({
  isOpen,
  onClose,
  onPermissionGranted
}) => {
  const [checking, setChecking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<MicrophonePermissionStatus>('NotDetermined');

  useEffect(() => {
    if (isOpen) {
      checkPermission();
    }
  }, [isOpen]);

  const checkPermission = async () => {
    setChecking(true);
    try {
      const status = await audioPermissionService.checkPermission();
      setPermissionStatus(status.status);
      
      if (status.hasPermission && onPermissionGranted) {
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
      const granted = await audioPermissionService.requestPermission();
      if (granted) {
        setPermissionStatus('Authorized');
        if (onPermissionGranted) {
          onPermissionGranted();
        }
        onClose();
      } else {
        // Re-check status to update UI
        await checkPermission();
      }
    } finally {
      setChecking(false);
    }
  };

  const handleOpenPreferences = async () => {
    await audioPermissionService.openSystemPreferences();
  };

  if (!isOpen) return null;

  const isAuthorized = permissionStatus === 'Authorized';
  const canRequest = permissionStatus === 'NotDetermined';
  const isDenied = permissionStatus === 'Denied';
  const isRestricted = permissionStatus === 'Restricted';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Microphone Permission Required
        </h2>
        
        <div className="mb-6 space-y-3">
          <p className="text-gray-700 dark:text-gray-300">
            Gorlami needs microphone permission to:
          </p>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
            <li>Record your voice for transcription</li>
            <li>Convert speech to text in real-time</li>
            <li>Provide voice-driven AI assistance</li>
          </ul>
          
          {isDenied && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">
                Microphone access was denied. You'll need to enable it in System Preferences.
              </p>
            </div>
          )}
          
          {isRestricted && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Microphone access is restricted by parental controls or device management.
              </p>
            </div>
          )}
          
          {canRequest && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Click "Grant Permission" and then click "OK" in the system dialog that appears.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          {!isAuthorized && (
            <>
              {canRequest ? (
                <button
                  onClick={handleRequestPermission}
                  disabled={checking}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {checking ? 'Checking...' : 'Grant Permission'}
                </button>
              ) : (
                <button
                  onClick={handleOpenPreferences}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  Open System Preferences
                </button>
              )}
            </>
          )}
          
          {isAuthorized && (
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
            {isAuthorized ? 'Close' : 'Cancel'}
          </button>
        </div>

        {isAuthorized && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✓ Microphone permission granted! You can now use voice recording.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};