import { prisma } from './services/database.js';
import { createApp } from './app.js';
import { env } from './config/env.js';
import logger from './utils/logger.js';

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();

    const app = createApp();
    const port = env.PORT;

    const server = app.listen(port, env.SERVER_HOST, () => {
      const address = server.address();
      const bind = typeof address === 'string' ? address : `port ${address?.port}`;
      logger.info(`🚀 Server listening on ${bind} in ${env.NODE_ENV} mode`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed.');
      });
      
      await prisma.$disconnect();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error(error, 'Failed to start server');
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();
