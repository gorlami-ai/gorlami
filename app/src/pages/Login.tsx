import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GitHubIcon, GorlamiLogoIcon } from '../assets/icons';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signInWithOAuth, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    // Check for errors passed from auth callback
    if (location.state?.error) {
      setError(location.state.error);
    }
  }, [location.state]);

  const handleOAuthSignIn = async (provider: 'github') => {
    setLoading(true);
    setError(null);
    try {
      await signInWithOAuth(provider);
    } catch (err) {
      setError('Failed to sign in. Please try again.');
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GorlamiLogoIcon className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome to Gorlami</h1>
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <p className="text-center text-gray-600">
              Sign in to your account to continue
            </p>

            <button
              onClick={() => handleOAuthSignIn('github')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Sign in with GitHub"
            >
              <GitHubIcon className="w-5 h-5" />
              <span className="font-medium">Sign in with GitHub</span>
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
