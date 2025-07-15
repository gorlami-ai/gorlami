import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import "./ProcessingOverlay.css";

export function ProcessingOverlay() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Listen for recording events
    const unlistenStart = listen("recording_started", () => {
      setIsVisible(true);
    });

    const unlistenStop = listen("recording_stopped", () => {
      setTimeout(() => setIsVisible(false), 500); // Small delay before hiding
    });

    return () => {
      unlistenStart.then((fn) => fn());
      unlistenStop.then((fn) => fn());
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="processing-overlay">
      <div className="processing-content">
        <div className="processing-spinner"></div>
        <p>Processing...</p>
      </div>
    </div>
  );
}