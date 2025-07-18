import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

interface AppError {
  error_type: 'Audio' | 'WebSocket' | 'Settings' | 'Clipboard' | 'Shortcuts' | 'System';
  title: string;
  message: string;
  details?: string;
  timestamp: number;
  recoverable: boolean;
}

export function ErrorDisplay() {
  const [errors, setErrors] = useState<AppError[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Listen for app errors
    const unlistenAppError = listen('app_error', (event: any) => {
      const error = event.payload as AppError;
      setErrors((prev) => [...prev, error]);
      setIsVisible(true);

      // Auto-hide after 5 seconds for recoverable errors
      if (error.recoverable) {
        setTimeout(() => {
          setErrors((prev) => prev.filter((e) => e.timestamp !== error.timestamp));
          if (errors.length <= 1) {
            setIsVisible(false);
          }
        }, 5000);
      }
    });

    // Listen for critical errors
    const unlistenCriticalError = listen('critical_error', (event: any) => {
      const error = event.payload as AppError;
      setErrors((prev) => [...prev, error]);
      setIsVisible(true);
      // Critical errors don't auto-hide
    });

    return () => {
      unlistenAppError.then((fn) => fn());
      unlistenCriticalError.then((fn) => fn());
    };
  }, [errors.length]);

  const dismissError = (timestamp: number) => {
    setErrors((prev) => prev.filter((e) => e.timestamp !== timestamp));
    if (errors.length <= 1) {
      setIsVisible(false);
    }
  };

  const dismissAll = () => {
    setErrors([]);
    setIsVisible(false);
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'Audio':
        return '🎤';
      case 'WebSocket':
        return '🔗';
      case 'Settings':
        return '⚙️';
      case 'Clipboard':
        return '📋';
      case 'Shortcuts':
        return '⌨️';
      case 'System':
        return '⚠️';
      default:
        return '❌';
    }
  };

  const getErrorColor = (type: string) => {
    switch (type) {
      case 'Audio':
        return 'border-l-blue-500';
      case 'WebSocket':
        return 'border-l-emerald-500';
      case 'Settings':
        return 'border-l-violet-500';
      case 'Clipboard':
        return 'border-l-amber-500';
      case 'Shortcuts':
        return 'border-l-pink-500';
      case 'System':
        return 'border-l-rose-500';
      default:
        return 'border-l-slate-500';
    }
  };

  if (!isVisible || errors.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-5 right-5 w-96 max-w-[90vw] max-h-[60vh] z-[9999] bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl overflow-hidden animate-slide-in">
      <div className="flex justify-between items-center px-5 py-4 bg-white/5 border-b border-white/10">
        <span className="text-base font-semibold text-white">Application Errors</span>
        <div className="flex gap-2">
          <button onClick={dismissAll} className="bg-white/10 text-white border-0 px-3 py-1.5 rounded text-xs cursor-pointer transition-colors duration-200 hover:bg-white/20">
            Dismiss All
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto py-2 scrollbar-thin">
        {errors.map((error) => (
          <div
            key={error.timestamp}
            className={`flex items-start p-3 mx-4 my-1 rounded-lg border-l-4 bg-white/5 transition-colors duration-200 hover:bg-white/8 ${
              getErrorColor(error.error_type)
            } ${
              !error.recoverable ? 'bg-rose-500/10' : ''
            }`}
          >
            <div className="text-lg mr-3 mt-0.5 min-w-[20px]">{getErrorIcon(error.error_type)}</div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold text-white">{error.title}</span>
                <span className="text-xs text-slate-400 uppercase tracking-wide font-medium">{error.error_type}</span>
              </div>

              <div className="text-xs text-slate-300 leading-relaxed mb-2">{error.message}</div>

              {error.details && (
                <details className="mb-2">
                  <summary className="text-xs text-slate-400 cursor-pointer select-none hover:text-white">Show Details</summary>
                  <div className="mt-1 p-2 bg-black/30 rounded text-xs text-slate-400 font-mono leading-tight whitespace-pre-wrap break-words">{error.details}</div>
                </details>
              )}

              <div className="flex justify-between items-center gap-2">
                <span className="text-xs text-slate-500">
                  {new Date(error.timestamp * 1000).toLocaleTimeString()}
                </span>
                {!error.recoverable && <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide">Critical</span>}
              </div>
            </div>

            <button
              onClick={() => dismissError(error.timestamp)}
              className="bg-transparent border-0 text-slate-400 text-xl cursor-pointer p-1 ml-2 rounded transition-colors duration-200 min-w-[28px] h-7 flex items-center justify-center hover:text-white hover:bg-white/10"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
