/**
 * Environment configuration utility
 * Centralizes access to environment variables with defaults
 */

export const env = {
  // Backend API configuration
  backendApiBaseHttp: import.meta.env.VITE_BACKEND_API_BASE_HTTP || 'http://localhost:8000',
  backendApiBaseWs: import.meta.env.VITE_BACKEND_API_BASE_WS || 'ws://localhost:8000',
  
  // Supabase configuration
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
} as const;

/**
 * Get WebSocket URL
 */
export function getWebSocketUrl(path: string = '/ws/transcribe'): string {
  const baseUrl = env.backendApiBaseWs;
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * Get API endpoint URL
 */
export function getApiUrl(path: string): string {
  const baseUrl = env.backendApiBaseHttp;
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}