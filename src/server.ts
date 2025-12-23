// Updated src/server.ts with better shutdown handling
import App from './app';
import { config } from './config/env';
import { logger } from './utils/logger';

const app = new App();

const startServer = async () => {
  try {
    await app.initializeDatabase();
    
    const server = app.getServer().listen(config.PORT, () => {
      logger.info(`🚀 Server running on port ${config.PORT}`);
      logger.info(`🌐 Environment: ${config.NODE_ENV}`);
      logger.info(`📚 API Documentation: http://localhost:${config.PORT}/api/docs`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close(() => {
        logger.info('Server closed.');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();