import { supabase } from './auth';
import { env } from '../config/env';

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiClient<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  if (!token && import.meta.env.VITE_AUTH_ENABLED !== 'false') {
    throw new ApiError(401, 'No authentication token');
  }

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof ArrayBuffer) && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Add timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const response = await fetch(`${env.backendApiBaseHttp}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
      throw new ApiError(response.status, errorMessage, errorData);
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError(response.status, errorMessage);
    }
  }

    if (response.headers.get('content-type')?.includes('application/json')) {
      return response.json();
    }

    return response as any;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(408, 'Request timeout - backend server not responding');
    }
    throw error;
  }
}