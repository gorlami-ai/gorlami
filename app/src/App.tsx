import { useEffect, useState } from 'react';
import './App.css';
import { MainLayout } from './components/MainLayout';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { SettingsWindow } from './components/SettingsWindow';

function App() {
  const [windowType, setWindowType] = useState<'main' | 'settings' | 'processing_overlay'>('main');

  useEffect(() => {
    // Check which window this is
    const windowLabel = (window as any).__TAURI_WINDOW_LABEL__;
    if (windowLabel === 'settings') {
      setWindowType('settings');
    } else if (windowLabel === 'processing_overlay') {
      setWindowType('processing_overlay');
    } else {
      setWindowType('main');
    }
  }, []);

  if (windowType === 'settings') {
    return <SettingsWindow />;
  }

  if (windowType === 'processing_overlay') {
    return <ProcessingOverlay />;
  }

  return (
    <div className="app">
      <MainLayout />
    </div>
  );
}

export default App;
