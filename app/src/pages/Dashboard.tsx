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
    </div>
  );
}