import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/error.js';

export function createApp() {
  const app = express();

  // Request logging
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // CORS configuration
  app.use(cors({
    origin: env.CORS_ORIGINS,
    credentials: true,
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Routes
  app.use(routes);

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}