import { invoke } from '@tauri-apps/api/core';

interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
  download_size?: number;
}

interface UpdateBannerProps {
  updateInfo: UpdateInfo;
  onDismiss: () => void;
}

export function UpdateBanner({ updateInfo, onDismiss }: UpdateBannerProps) {
  const handleInstall = async () => {
    try {
      await invoke('check_and_prompt_for_update');
    } catch (error) {
      console.error('Failed to prompt for update:', error);
    }
  };

  return (
    <div className="fixed top-4 right-4 max-w-sm bg-blue-600 text-white rounded-lg shadow-lg p-4 flex items-center gap-3 z-50">
      <div className="flex-1">
        <p className="font-medium">Update Available</p>
        <p className="text-sm opacity-90">Version {updateInfo.version} is ready to install</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleInstall}
          className="px-3 py-1 bg-white text-blue-600 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
        >
          Install
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1 bg-blue-700 rounded text-sm hover:bg-blue-800 transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}