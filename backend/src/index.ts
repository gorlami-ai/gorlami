import { prisma } from './services/database.js';
import { createApp } from './app.js';
import { env } from './config/env.js';

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('Database connected successfully');

    const app = createApp();
    const port = env.PORT;

    app.listen(port, env.SERVER_HOST, () => {
      console.log(`Server running on http://${env.SERVER_HOST}:${port}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      if (env.NODE_ENV === 'development') {
        console.log(`API Documentation: http://localhost:${port}/docs`);
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      await prisma.$disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received. Shutting down gracefully...');
      await prisma.$disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();
