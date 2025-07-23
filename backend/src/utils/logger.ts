import { pino } from 'pino';
import { env } from '../config/env.js';

const isDevelopment = env.NODE_ENV === 'development';

const logger = pino({
  level: env.LOG_LEVEL,
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
          messageFormat: '{msg}',
        },
      }
    : undefined,
  base: {
    pid: false,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;