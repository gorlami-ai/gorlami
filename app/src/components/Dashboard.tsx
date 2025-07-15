import './Dashboard.css';

export function Dashboard() {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>
            Hold <kbd>⌘</kbd>+<kbd>Ctrl</kbd>+<kbd>Space</kbd> to start recording!
          </h1>
          <p className="subtitle">
            Voice-driven AI assistant that captures, transcribes, and enhances your speech in
            real-time
          </p>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="features-section">
          <h2>✅ Currently Working</h2>
          <div className="feature-grid">
            <div className="feature-card available">
              <div className="feature-icon">🎙️</div>
              <div className="feature-info">
                <h3>Audio Recording</h3>
                <p>Start/stop recording with global shortcut</p>
              </div>
            </div>
            <div className="feature-card available">
              <div className="feature-icon">⚙️</div>
              <div className="feature-info">
                <h3>Settings Window</h3>
                <p>Configure shortcuts, microphone, and backend connection</p>
              </div>
            </div>
            <div className="feature-card available">
              <div className="feature-icon">🔗</div>
              <div className="feature-info">
                <h3>WebSocket Connection</h3>
                <p>Real-time communication with backend server</p>
              </div>
            </div>
            <div className="feature-card available">
              <div className="feature-icon">🖥️</div>
              <div className="feature-info">
                <h3>System Tray</h3>
                <p>Menu bar integration with microphone selection</p>
              </div>
            </div>
            <div className="feature-card available">
              <div className="feature-icon">📱</div>
              <div className="feature-info">
                <h3>Processing Overlay</h3>
                <p>Visual feedback during recording sessions</p>
              </div>
            </div>
            <div className="feature-card available">
              <div className="feature-icon">🔤</div>
              <div className="feature-info">
                <h3>Backend Services</h3>
                <p>Deepgram transcription + Azure OpenAI enhancement</p>
              </div>
            </div>
          </div>
        </div>

        <div className="development-section">
          <h2>🚧 In Development</h2>
          <div className="feature-grid">
            <div className="feature-card development">
              <div className="feature-icon">📝</div>
              <div className="feature-info">
                <h3>Live Transcription UI</h3>
                <p>Real-time display of transcribed text</p>
              </div>
            </div>
            <div className="feature-card development">
              <div className="feature-icon">✨</div>
              <div className="feature-info">
                <h3>AI Text Enhancement</h3>
                <p>Display enhanced text from Azure OpenAI</p>
              </div>
            </div>
            <div className="feature-card development">
              <div className="feature-icon">📋</div>
              <div className="feature-info">
                <h3>Text Pasting</h3>
                <p>Automatically paste enhanced text at cursor</p>
              </div>
            </div>
            <div className="feature-card development">
              <div className="feature-icon">📚</div>
              <div className="feature-info">
                <h3>Custom Dictionary</h3>
                <p>Personal vocabulary and command phrases</p>
              </div>
            </div>
            <div className="feature-card development">
              <div className="feature-icon">📄</div>
              <div className="feature-info">
                <h3>Transcripts History</h3>
                <p>View and manage past transcription sessions</p>
              </div>
            </div>
            <div className="feature-card development">
              <div className="feature-icon">💾</div>
              <div className="feature-info">
                <h3>Persistent Settings</h3>
                <p>Save and restore all configuration settings</p>
              </div>
            </div>
          </div>
        </div>

        <div className="quick-start-section">
          <h2>🚀 Quick Start</h2>
          <div className="quick-start-steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Configure Backend</h3>
                <p>Set up Deepgram API key and Azure OpenAI credentials in backend/.env</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Start Services</h3>
                <p>
                  Run <code>poetry run start</code> in backend/ and <code>pnpm tauri dev</code> in
                  app/
                </p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Test Recording</h3>
                <p>
                  Press <kbd>⌘</kbd>+<kbd>Ctrl</kbd>+<kbd>Space</kbd> to start recording and test
                  the audio pipeline
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="shortcuts-section">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <div className="shortcuts-grid">
            <div className="shortcut-item">
              <div className="shortcut-keys">
                <kbd>⌘</kbd>+<kbd>Ctrl</kbd>+<kbd>Space</kbd>
              </div>
              <div className="shortcut-description">Start/Stop Recording</div>
            </div>
            <div className="shortcut-item">
              <div className="shortcut-keys">
                <kbd>⌘</kbd>+<kbd>Ctrl</kbd>+<kbd>E</kbd>
              </div>
              <div className="shortcut-description">Edit Mode (Coming Soon)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
