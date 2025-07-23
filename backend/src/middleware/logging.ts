import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger.js';

/**
 * Middleware that adds a request-scoped logger with request ID
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Create a child logger with the request ID
  req.logger = logger.child({
    requestId: req.requestId,
  });

  // Log the incoming request
  req.logger.info(
    {
      method: req.method,
      url: req.url,
    },
    'Incoming request'
  );

  // Log response when finished
  res.on('finish', () => {
    req.logger.info(
      {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        contentLength: res.get('content-length'),
      },
      'Request completed'
    );
  });

  next();
};
