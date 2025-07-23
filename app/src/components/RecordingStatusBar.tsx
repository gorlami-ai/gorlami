import { useRecordingStatus } from '../hooks/useRecordingStatus';

export function RecordingStatusBar() {
  const { state, message } = useRecordingStatus();

  if (state === 'idle') return null;

  const getStatusDisplay = () => {
    switch (state) {
      case 'recording':
        return {
          text: message || 'Recording...',
          className: 'bg-red-500 text-white animate-pulse',
        };
      case 'processing':
        return {
          text: message || 'Processing...',
          className: 'bg-blue-500 text-white',
        };
      case 'success':
        return {
          text: message || 'Success!',
          className: 'bg-green-500 text-white',
        };
      case 'error':
        return {
          text: message || 'Error occurred',
          className: 'bg-red-600 text-white',
        };
      default:
        return null;
    }
  };

  const status = getStatusDisplay();
  if (!status) return null;

  return (
    <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg ${status.className}`}>
      <span className="text-sm font-medium">{status.text}</span>
    </div>
  );
}