import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';
import './ErrorDisplay.css';

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
        return 'error-audio';
      case 'WebSocket':
        return 'error-websocket';
      case 'Settings':
        return 'error-settings';
      case 'Clipboard':
        return 'error-clipboard';
      case 'Shortcuts':
        return 'error-shortcuts';
      case 'System':
        return 'error-system';
      default:
        return 'error-default';
    }
  };

  if (!isVisible || errors.length === 0) {
    return null;
  }

  return (
    <div className="error-display">
      <div className="error-header">
        <span className="error-title">Application Errors</span>
        <div className="error-actions">
          <button onClick={dismissAll} className="dismiss-all-btn">
            Dismiss All
          </button>
        </div>
      </div>

      <div className="error-list">
        {errors.map((error) => (
          <div
            key={error.timestamp}
            className={`error-item ${getErrorColor(error.error_type)} ${
              !error.recoverable ? 'critical' : ''
            }`}
          >
            <div className="error-icon">{getErrorIcon(error.error_type)}</div>

            <div className="error-content">
              <div className="error-item-header">
                <span className="error-item-title">{error.title}</span>
                <span className="error-type">{error.error_type}</span>
              </div>

              <div className="error-message">{error.message}</div>

              {error.details && (
                <details className="error-details">
                  <summary>Show Details</summary>
                  <div className="error-details-content">{error.details}</div>
                </details>
              )}

              <div className="error-meta">
                <span className="error-timestamp">
                  {new Date(error.timestamp * 1000).toLocaleTimeString()}
                </span>
                {!error.recoverable && <span className="error-critical-badge">Critical</span>}
              </div>
            </div>

            <button
              onClick={() => dismissError(error.timestamp)}
              className="dismiss-btn"
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
