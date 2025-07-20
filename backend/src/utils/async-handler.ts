import { RequestHandler } from 'express';
import { AuthenticatedRequest } from '../types/index.js';

// Type-safe wrapper for async route handlers that use AuthenticatedRequest
export function asyncHandler<T = any>(
  fn: (req: AuthenticatedRequest, res: any, next: any) => Promise<T>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
  };
}