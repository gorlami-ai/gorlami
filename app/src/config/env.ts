/**
 * Environment configuration utility
 * Centralizes access to environment variables with defaults
 */

export const env = {
  // Backend API configuration
  backendApiBaseHttp: import.meta.env.VITE_BACKEND_API_BASE_HTTP || 'http://localhost:8000',
  
  // Supabase configuration
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
} as const;

/**
 * Get API endpoint URL
 */
export function getApiUrl(path: string): string {
  const baseUrl = env.backendApiBaseHttp;
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}