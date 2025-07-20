import { createClient } from '@supabase/supabase-js';
import { openUrl } from '@tauri-apps/plugin-opener';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true, // Enable to handle tokens in URL
    flowType: 'pkce', // Explicitly use PKCE flow
    storage: {
      getItem: (key: string) => {
        return localStorage.getItem(key);
      },
      setItem: (key: string, value: string) => {
        localStorage.setItem(key, value);
      },
      removeItem: (key: string) => {
        localStorage.removeItem(key);
      },
    },
  },
});

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

export const authService = {
  async signInWithOAuth(provider: 'github') {
    try {
      const isDev = import.meta.env.DEV;
      const redirectTo = isDev 
        ? `http://localhost:1420/auth/callback`
        : `gorlami://auth/callback`;
      
      if (isDev) {
        // In development, let Supabase handle the redirect automatically
        // This avoids the context mismatch issue with PKCE
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: false, // Let Supabase handle the redirect
          },
        });
        
        if (error) throw error;
        // Browser will handle the redirect and callback
        return;
      }
      
      // Production: Use PKCE with deep links and manual handling
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true, // Manual handling for deep links
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');

      // Set up deep link handler for production
      return new Promise<void>(async (resolve, reject) => {
        let handled = false;
        
        // Set up a timeout in case the callback never arrives
        const timeout = setTimeout(() => {
          if (!handled) {
            handled = true;
            unsubscribe?.();
            reject(new Error('OAuth callback timeout'));
          }
        }, 60000); // 1 minute timeout

        // Listen for deep link callback
        const unsubscribe = await onOpenUrl((urls) => {
          if (handled) return;
          
          // Find the auth callback URL
          const callbackUrl = urls.find(url => 
            url.includes('/auth/callback') || url.includes('//auth/callback')
          );
          
          if (!callbackUrl) return;
          
          handled = true;
          clearTimeout(timeout);
          
          try {
            console.log('OAuth callback received:', callbackUrl);
            
            // Parse the URL for PKCE flow (authorization code)
            const url = new URL(callbackUrl);
            const code = url.searchParams.get('code');
            const error = url.searchParams.get('error');
            const errorDescription = url.searchParams.get('error_description');

            if (error) {
              throw new Error(errorDescription || `OAuth error: ${error}`);
            }

            if (!code) {
              throw new Error('No authorization code received');
            }

            // PKCE flow - exchange authorization code for session
            supabase.auth.exchangeCodeForSession(code).then(({ error: sessionError }) => {
              unsubscribe();
              if (sessionError) {
                reject(sessionError);
              } else {
                resolve();
              }
            });
          } catch (err) {
            console.error('OAuth callback error:', err);
            unsubscribe();
            reject(err);
          }
        });

        // Open the OAuth URL in the browser
        await openUrl(data.url);
      });
    } catch (error) {
      console.error('OAuth sign in error:', error);
      throw error;
    }
  },

  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  },

  async getUser(): Promise<AuthUser | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    };
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email,
          user_metadata: session.user.user_metadata,
        });
      } else {
        callback(null);
      }
    });
  },

  async getAccessToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.access_token || null;
  },

  isAuthEnabled(): boolean {
    const authEnabled = import.meta.env.VITE_AUTH_ENABLED;
    return authEnabled !== 'false';
  },

  getMockUser(): AuthUser {
    return {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: { name: 'Test User' },
    };
  },
};
