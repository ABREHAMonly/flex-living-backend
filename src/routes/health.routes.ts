// src/routes/health.routes.ts
import { Router, Request, Response } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();

/**
 * @route GET /api/health
 * @description Health check endpoint
 */
router.get('/', HealthController.checkHealth);

/**
 * @route GET /api/health/metrics
 * @description Get application metrics
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      environment: process.env.NODE_ENV || 'development',
      pid: process.pid
    };

    res.json({
      status: 'success',
      data: metrics
    });
   } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      status: 'error',
      message: 'Failed to get metrics',
      error: errorMessage
    });
  }
});

export default router;