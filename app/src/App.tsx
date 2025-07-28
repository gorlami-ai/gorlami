import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { MainLayout } from './layouts/MainLayout';
import { UpdateBanner } from './components/UpdateBanner';
import { useAutoUpdater } from './hooks/useAutoUpdater';
import { useAudioPermission } from './hooks/useAudioPermission';
import { useAccessibilityPermission } from './hooks/useAccessibilityPermission';
import { MicrophonePermissionDialog } from './components/MicrophonePermissionDialog';
import { AccessibilityPermissionDialog } from './components/AccessibilityPermissionDialog';
import { Home } from './pages/Home';
import { Settings } from './pages/Settings';
import { Activity } from './pages/Activity';
import { Login } from './pages/Login';
import { AuthCallback } from './pages/AuthCallback';
import { ProtectedRoute } from './components/ProtectedRoute';
import { authService } from './services/auth';
import { editModeService } from './services/editMode';

function App() {
  const { updateInfo, showNotification, handleLater } = useAutoUpdater();

  const {
    showPermissionDialog: showMicrophoneDialog,
    closePermissionDialog: closeMicrophoneDialog,
  } = useAudioPermission();

  const {
    showPermissionDialog: showAccessibilityDialog,
    closePermissionDialog: closeAccessibilityDialog,
  } = useAccessibilityPermission();

  useEffect(() => {
    // Initialize edit mode service
    editModeService.setHandlers({
      onError: (error) => {
        console.error('Edit mode error:', error);
      },
    });
  }, []);

  // Removed overlay window handling

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="w-screen h-screen overflow-hidden bg-slate-950 text-slate-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
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
              <Route index element={<Home />} />
              <Route path="settings" element={<Settings />} />
              <Route path="activity" element={<Activity />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Update Banner - subtle notification */}
          {showNotification && updateInfo && (
            <UpdateBanner updateInfo={updateInfo} onDismiss={handleLater} />
          )}

          {/* Microphone Permission Dialog */}
          <MicrophonePermissionDialog
            isOpen={showMicrophoneDialog}
            onClose={closeMicrophoneDialog}
            onPermissionGranted={() => {
              console.log('Microphone permission granted');
            }}
          />

          {/* Accessibility Permission Dialog */}
          <AccessibilityPermissionDialog
            isOpen={showAccessibilityDialog}
            onClose={closeAccessibilityDialog}
            onPermissionGranted={() => {
              console.log('Accessibility permission granted');
            }}
          />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
