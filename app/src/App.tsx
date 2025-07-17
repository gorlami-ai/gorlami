import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import { MainLayout } from './layouts/MainLayout';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Dictionary } from './pages/Dictionary';
import { Activity } from './pages/Activity';

function App() {
  const [windowType, setWindowType] = useState<'main' | 'processing_overlay'>('main');

  useEffect(() => {
    // Check which window this is
    const windowLabel = (window as any).__TAURI_WINDOW_LABEL__;
    if (windowLabel === 'processing_overlay') {
      setWindowType('processing_overlay');
    } else {
      setWindowType('main');
    }
  }, []);

  if (windowType === 'processing_overlay') {
    return <ProcessingOverlay />;
  }

  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="settings" element={<Settings />} />
            <Route path="dictionary" element={<Dictionary />} />
            <Route path="activity" element={<Activity />} />
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
