import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error.js';
import { requestId } from './middleware/requestId.js';
import { requestLogger } from './middleware/logging.js';

export function createApp() {
  const app = express();

  // Request logging
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // CORS configuration
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    })
  );

  // Add request ID to all requests
  app.use(requestId);

  // Add request-scoped logger
  app.use(requestLogger);

  // Body parsing middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Routes
  app.use(routes);

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}
