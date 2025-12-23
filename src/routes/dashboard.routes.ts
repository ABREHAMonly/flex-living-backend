// src/routes/dashboard.routes.ts
import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { query } from 'express-validator';

const router = Router();

/**
 * @route GET /api/dashboard/performance
 * @description Get property performance metrics
 */
router.get(
  '/performance',
  [
    query('timeframe').optional().isString().isIn(['7d', '30d', '90d', '1y', 'all']),
    query('listingIds').optional().isString(),
    query('compare').optional().isBoolean()
  ],
  validateRequest,
  DashboardController.getPropertyPerformance
);

/**
 * @route GET /api/dashboard/trends
 * @description Get review trends and patterns
 */
router.get(
  '/trends',
  [
    query('listingId').optional().isString(),
    query('metric').optional().isString().isIn(['rating', 'count', 'sentiment']),
    query('interval').optional().isString().isIn(['day', 'week', 'month', 'quarter', 'year'])
  ],
  validateRequest,
  DashboardController.getTrends
);

/**
 * @route GET /api/dashboard/issues
 * @description Get identified issues and alerts
 */
router.get(
  '/issues',
  [
    query('priority').optional().isString().isIn(['high', 'medium', 'low', 'all']),
    query('listingId').optional().isString()
  ],
  validateRequest,
  DashboardController.getIssues
);

/**
 * @route GET /api/dashboard/quick-stats
 * @description Get quick statistics for dashboard widgets
 */
router.get(
  '/quick-stats',
  [
    query('listingId').optional().isString(),
    query('timeframe').optional().isString().isIn(['7d', '30d', '90d', '1y', 'all']),
  ],
  validateRequest,
  DashboardController.getQuickStats
);

export default router;