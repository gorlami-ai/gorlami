import { createClient } from '@supabase/supabase-js';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { listen } from '@tauri-apps/api/event';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: false,
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
  async signInWithOAuth(provider: 'google' | 'github') {
    try {
      const port = await invoke<number>('start_oauth_server');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `http://localhost:${port}/callback`,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL returned');

      await openUrl(data.url);

      return new Promise<void>(async (resolve, reject) => {
        const unlisten = await listen<string>('oauth://callback', async (event) => {
          try {
            const url = new URL(event.payload);
            const code = url.searchParams.get('code');
            
            if (!code) {
              throw new Error('No authorization code received');
            }

            const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (sessionError) throw sessionError;

            unlisten();
            resolve();
          } catch (err) {
            unlisten();
            reject(err);
          }
        });
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
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getUser(): Promise<AuthUser | null> {
    const { data: { user } } = await supabase.auth.getUser();
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