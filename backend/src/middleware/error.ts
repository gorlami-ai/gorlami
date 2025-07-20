import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  logger.error(err, 'Unhandled error');
  res.status(500).json({
    error: 'Internal server error',
    ...(env.NODE_ENV === 'development' && { 
      message: err.message,
      stack: err.stack 
    }),
  });
}