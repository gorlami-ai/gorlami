import { createClient, Session } from '@supabase/supabase-js';
import { openUrl } from '@tauri-apps/plugin-opener';
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';
import { createLogger } from '../../utils/logger';
import { handleError, AppError } from '../../shared/utils/errorHandler';

const logger = createLogger('AuthService');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: (key: string, value: string) => localStorage.setItem(key, value),
      removeItem: (key: string) => localStorage.removeItem(key),
    },
  },
});

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
}

interface OAuthConfig {
  provider: 'github';
  redirectTo: string;
  skipBrowserRedirect: boolean;
}

class AuthService {
  private mockMode = false;
  private mockUser: AuthUser | null = null;

  constructor() {
    this.mockMode = !this.isAuthEnabled();
  }

  isAuthEnabled(): boolean {
    const authEnabled = import.meta.env.VITE_AUTH_ENABLED;
    return authEnabled !== 'false';
  }

  private getMockUser(): AuthUser {
    if (!this.mockUser) {
      this.mockUser = {
        id: 'dev-user-' + Math.random().toString(36).substr(2, 9),
        email: 'developer@gorlami.local',
        user_metadata: {
          name: 'Local Developer',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=developer',
          created_at: new Date().toISOString(),
        },
      };
    }
    return this.mockUser;
  }

  private async handleOAuthCallback(urls: string[]): Promise<void> {
    const callbackUrl = urls.find(url =>
      url.includes('/auth/callback') || url.includes('//auth/callback')
    );

    if (!callbackUrl) return;

    logger.info('OAuth callback received', { url: callbackUrl });

    const url = new URL(callbackUrl);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    if (error) {
      throw new AppError(
        errorDescription || `OAuth error: ${error}`,
        'OAUTH_ERROR'
      );
    }

    if (!code) {
      throw new AppError('No authorization code received', 'OAUTH_NO_CODE');
    }

    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    if (sessionError) {
      throw sessionError;
    }
  }

  private getOAuthConfig(): OAuthConfig {
    const isDev = import.meta.env.DEV;
    return {
      provider: 'github',
      redirectTo: isDev
        ? 'http://localhost:1420/auth/callback'
        : 'gorlami://auth/callback',
      skipBrowserRedirect: !isDev,
    };
  }

  async signInWithOAuth(provider: 'github'): Promise<void> {
    if (this.mockMode) {
      logger.info('Mock mode: simulating OAuth sign in');
      return;
    }

    const config = this.getOAuthConfig();
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: config.redirectTo,
          skipBrowserRedirect: config.skipBrowserRedirect,
        },
      });

      if (error) throw error;

      // Development mode: let browser handle redirect
      if (!config.skipBrowserRedirect) {
        return;
      }

      // Production mode: handle deep link
      if (!data.url) {
        throw new AppError('No OAuth URL returned', 'OAUTH_NO_URL');
      }

      await this.handleProductionOAuth(data.url);
    } catch (error) {
      await handleError(error, {
        context: 'AuthService.signInWithOAuth',
        fallbackMessage: 'Failed to sign in with OAuth'
      });
      throw error;
    }
  }

  private async handleProductionOAuth(authUrl: string): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      let handled = false;
      let unsubscribe: (() => void) | undefined;

      const cleanup = () => {
        handled = true;
        unsubscribe?.();
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new AppError('OAuth callback timeout', 'OAUTH_TIMEOUT'));
      }, 60000);

      try {
        unsubscribe = await onOpenUrl(async (urls) => {
          if (handled) return;

          try {
            await this.handleOAuthCallback(urls);
            clearTimeout(timeout);
            cleanup();
            resolve();
          } catch (err) {
            clearTimeout(timeout);
            cleanup();
            reject(err);
          }
        });

        await openUrl(authUrl);
      } catch (error) {
        clearTimeout(timeout);
        cleanup();
        reject(error);
      }
    });
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    if (this.mockMode) {
      logger.info('Mock mode: simulating email sign in');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      await handleError(error, {
        context: 'AuthService.signInWithEmail',
        fallbackMessage: 'Failed to sign in'
      });
      throw error;
    }
  }

  async signUp(email: string, password: string): Promise<void> {
    if (this.mockMode) {
      logger.info('Mock mode: simulating sign up');
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      await handleError(error, {
        context: 'AuthService.signUp',
        fallbackMessage: 'Failed to sign up'
      });
      throw error;
    }
  }

  async signOut(): Promise<void> {
    if (this.mockMode) {
      logger.info('Mock mode: simulating sign out');
      this.mockUser = null;
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      await handleError(error, {
        context: 'AuthService.signOut',
        fallbackMessage: 'Failed to sign out'
      });
      throw error;
    }
  }

  async getSession(): Promise<Session | null> {
    if (this.mockMode) {
      return null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  async getUser(): Promise<AuthUser | null> {
    if (this.mockMode) {
      return this.getMockUser();
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    };
  }

  async getAccessToken(): Promise<string | null> {
    if (this.mockMode) {
      return 'mock-access-token';
    }

    const session = await this.getSession();
    return session?.access_token || null;
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    if (this.mockMode) {
      // Immediately call with mock user
      callback(this.getMockUser());
      // Return a mock subscription
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              logger.debug('Mock auth state change unsubscribed');
            },
          },
        },
      };
    }

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
  }
}

export const authService = new AuthService();