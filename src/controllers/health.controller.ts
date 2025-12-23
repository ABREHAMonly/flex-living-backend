//src/controllers/health.controller.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export class HealthController {
  static async checkHealth(_req: Request, res: Response): Promise<void> {
    try {
      const healthCheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development',
        version: process.version,
      };
      
      // Check database connection
      if (mongoose.connection.readyState !== 1) {
        healthCheck.status = 'unhealthy';
        healthCheck.database = 'disconnected';
        
        res.status(503).json({
          status: 'error',
          message: 'Database connection failed',
          data: healthCheck,
        });
        return;
      }
      
      res.json({
        status: 'success',
        data: healthCheck,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Health check failed:', errorMessage);
      
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: errorMessage,
        },
      });
    }
  }
}