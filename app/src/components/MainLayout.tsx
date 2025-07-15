import { useEffect, useState } from 'react';
import { Dashboard } from './Dashboard';
import './MainLayout.css';
import { SettingsWindow } from './SettingsWindow';
import { Sidebar } from './Sidebar';

export function MainLayout() {
  // Get initial tab from URL hash, default to 'home'
  const getInitialTab = () => {
    const hash = window.location.hash.slice(1); // Remove the #
    return hash || 'home';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  useEffect(() => {
    // Listen for hash changes
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        setActiveTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Update URL hash when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

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
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <main className="main-content">{renderContent()}</main>
    </div>
  );
}
