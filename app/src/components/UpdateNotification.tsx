import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
  download_size?: number;
}

interface UpdateNotificationProps {
  updateInfo: UpdateInfo;
  onUpdate: () => void;
  onLater: () => void;
}

export function UpdateNotification({ updateInfo, onUpdate, onLater }: UpdateNotificationProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    let unlistenProgress: (() => void) | undefined;
    let unlistenFinished: (() => void) | undefined;

    const setupListeners = async () => {
      // Listen for download progress
      unlistenProgress = await listen<number>('update-download-progress', (event) => {
        setDownloadProgress(event.payload);
      });

      // Listen for download finished
      unlistenFinished = await listen('update-download-finished', () => {
        setIsDownloading(false);
      });
    };

    setupListeners();

    return () => {
      unlistenProgress?.();
      unlistenFinished?.();
    };
  }, []);

  const handleUpdate = () => {
    setIsDownloading(true);
    onUpdate();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Update Available
          </h2>
          
          <p className="text-gray-600 mb-4">
            Version {updateInfo.version} is ready to install.
          </p>

          {updateInfo.body && (
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-1">What's New:</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{updateInfo.body}</p>
            </div>
          )}

          {isDownloading && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Downloading update...</span>
                <span>{downloadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={onLater}
              disabled={isDownloading}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Later
            </button>
            <button
              onClick={handleUpdate}
              disabled={isDownloading}
              className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? 'Downloading...' : 'Update Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}