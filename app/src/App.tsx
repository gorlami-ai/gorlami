import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MainLayout } from './layouts/MainLayout';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { UpdateBanner } from './components/UpdateBanner';
import { useAutoUpdater } from './hooks/useAutoUpdater';
import { Dashboard } from './pages/Dashboard';
import { Settings } from './pages/Settings';
import { Dictionary } from './pages/Dictionary';
import { Activity } from './pages/Activity';
import { Login } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { authService } from './services/auth';

function App() {
  const [windowType, setWindowType] = useState<'main' | 'processing_overlay'>('main');
  const { 
    updateInfo, 
    showNotification, 
    handleLater 
  } = useAutoUpdater();

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
    <AuthProvider>
      <BrowserRouter>
        <div className="w-screen h-screen overflow-hidden bg-slate-950 text-slate-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/" 
              element={
                authService.isAuthEnabled() ? (
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                ) : (
                  <MainLayout />
                )
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="settings" element={<Settings />} />
              <Route path="dictionary" element={<Dictionary />} />
              <Route path="activity" element={<Activity />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
          {/* Update Banner - subtle notification */}
          {showNotification && updateInfo && (
            <UpdateBanner
              updateInfo={updateInfo}
              onDismiss={handleLater}
            />
          )}
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
