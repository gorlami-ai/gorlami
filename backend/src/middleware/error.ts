import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

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
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.requestId;

  if (err instanceof AppError) {
    req.logger?.error(
      {
        error: err.message,
        statusCode: err.statusCode,
        stack: err.stack,
      },
      'Application error'
    );

    res.status(err.statusCode).json({
      error: err.message,
      requestId,
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  req.logger?.error(
    {
      error: err.message,
      stack: err.stack,
    },
    'Unhandled error'
  );

  res.status(500).json({
    error: 'Internal server error',
    requestId,
    ...(env.NODE_ENV === 'development' && {
      message: err.message,
      stack: err.stack,
    }),
  });
}
