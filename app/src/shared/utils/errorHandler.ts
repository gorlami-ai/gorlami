import { createLogger } from '../../utils/logger';
import { emit } from '@tauri-apps/api/event';

const logger = createLogger('ErrorHandler');

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  context?: string;
  fallbackMessage?: string;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export async function handleError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): Promise<string> {
  const {
    showToast = true,
    logError = true,
    context = '',
    fallbackMessage = 'An unexpected error occurred'
  } = options;

  let errorMessage = fallbackMessage;
  let errorCode: string | undefined;
  let statusCode: number | undefined;

  if (error instanceof AppError) {
    errorMessage = error.message;
    errorCode = error.code;
    statusCode = error.statusCode;
  } else if (error instanceof Error) {
    errorMessage = parseErrorMessage(error);
    statusCode = extractStatusCode(error);
  } else if (typeof error === 'string') {
    errorMessage = error;
  }

  if (logError) {
    logger.error(`${context ? `[${context}] ` : ''}${errorMessage}`, {
      error,
      code: errorCode,
      statusCode
    });
  }

  if (showToast) {
    await emit('show-error', { 
      message: errorMessage,
      context,
      code: errorCode
    });
  }

  return errorMessage;
}

function parseErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'Cannot connect to backend server. Please check your connection.';
  }
  
  if (message.includes('unauthorized') || message.includes('401')) {
    return 'Authentication required. Please log in again.';
  }
  
  if (message.includes('forbidden') || message.includes('403')) {
    return 'You do not have permission to perform this action.';
  }
  
  if (message.includes('not found') || message.includes('404')) {
    return 'The requested resource was not found.';
  }
  
  if (message.includes('timeout')) {
    return 'The request timed out. Please try again.';
  }
  
  return error.message;
}

function extractStatusCode(error: Error): number | undefined {
  const match = error.message.match(/\b(4\d{2}|5\d{2})\b/);
  return match ? parseInt(match[1], 10) : undefined;
}

export function createErrorHandler(context: string) {
  return (error: unknown, options?: Omit<ErrorHandlerOptions, 'context'>) => 
    handleError(error, { ...options, context });
}

export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options?: ErrorHandlerOptions
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    await handleError(error, options);
    return null;
  }
}