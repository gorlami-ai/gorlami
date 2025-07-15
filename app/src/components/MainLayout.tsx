import { useState } from 'react';
import { Dashboard } from './Dashboard';
import './MainLayout.css';
import { SettingsWindow } from './SettingsWindow';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  const [activeTab, setActiveTab] = useState('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Dashboard />;
      case 'settings':
        return <SettingsWindow />;
      case 'dictionary':
        return (
          <div className="placeholder-content">
            <h2>Custom Dictionary</h2>
            <p>Personal vocabulary and command phrases will appear here.</p>
            <div className="coming-soon">🚧 Coming Soon</div>
          </div>
        );
      case 'transcripts':
        return (
          <div className="placeholder-content">
            <h2>Transcripts History</h2>
            <p>View and manage your past transcription sessions.</p>
            <div className="coming-soon">🚧 Coming Soon</div>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="main-layout">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="main-content">{renderContent()}</main>
    </div>
  );
}
