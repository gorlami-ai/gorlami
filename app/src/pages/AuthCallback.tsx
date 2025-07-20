import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/auth';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle the OAuth callback
    const handleCallback = async () => {
      try {
        // Check for error in URL params first
        const url = new URL(window.location.href);
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
          console.error('OAuth error:', errorDescription || error);
          navigate('/login', { 
            state: { error: errorDescription || `OAuth error: ${error}` } 
          });
          return;
        }

        // With detectSessionInUrl: true, Supabase automatically handles the session
        // We just need to check if a session was established
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          navigate('/login', { 
            state: { error: sessionError.message } 
          });
          return;
        }
        
        if (session) {
          // Session established successfully
          navigate('/', { replace: true });
        } else {
          // Wait a moment for Supabase to process the callback
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession();
            if (retrySession) {
              navigate('/', { replace: true });
            } else {
              console.error('No session established after OAuth callback');
              navigate('/login', { 
                state: { error: 'Authentication failed. Please try again.' } 
              });
            }
          }, 1000);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        navigate('/login', { 
          state: { error: 'Authentication failed. Please try again.' } 
        });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900">Completing sign in...</h2>
        <p className="text-gray-600 mt-2">Please wait while we authenticate you.</p>
      </div>
    </div>
  );
}