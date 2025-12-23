// src/routes/reviews.routes.ts
import { Router } from 'express';
import { ReviewController } from '../controllers/reviews.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { query, param, body } from 'express-validator';

const router = Router();

/**
 * @route GET /api/reviews/hostaway
 * @description Get Hostaway reviews with filtering
 */
router.get(
  '/hostaway',
  [
    query('listingId').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('minRating').optional().isFloat({ min: 1, max: 5 }),
    query('maxRating').optional().isFloat({ min: 1, max: 5 }),
    query('category').optional().isString(),
    query('isApproved').optional().isBoolean(),
    query('channel').optional().isString(),
    query('page').optional().isInt({ min: 1 }).toInt().default(1),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().default(20),
  ],
  validateRequest,
  ReviewController.getHostawayReviews
);

/**
 * @route POST /api/reviews/sync
 * @description Sync reviews from Hostaway
 */
router.post(
  '/sync',
  ReviewController.syncHostawayReviews
);

/**
 * @route GET /api/reviews/:id
 * @description Get a single review by ID
 */
router.get(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid review ID format')
  ],
  validateRequest,
  ReviewController.getReviewById
);

/**
 * @route PATCH /api/reviews/:id
 * @description Update a review (approval, notes, etc.)
 */
router.patch(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid review ID format'),
    body('isApproved').optional().isBoolean(),
    body('isPublic').optional().isBoolean(),
    body('managerNotes').optional().isString().trim().isLength({ max: 500 }),
    body('status').optional().isString().isIn(['published', 'unpublished', 'pending', 'archived'])
  ],
  validateRequest,
  ReviewController.updateReviewStatus
);

/**
 * @route DELETE /api/reviews/:id
 * @description Delete a review (soft delete)
 */
router.delete(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid review ID format')
  ],
  validateRequest,
  ReviewController.deleteReview
);

/**
 * @route GET /api/reviews/dashboard/stats
 * @description Get dashboard statistics
 */
router.get(
  '/dashboard/stats',
  [
    query('listingId').optional().isString(),
    query('timeframe').optional().isString().isIn(['7d', '30d', '90d', '1y', 'all']),
    query('channel').optional().isString()
  ],
  validateRequest,
  ReviewController.getDashboardStats
);

/**
 * @route GET /api/reviews/export
 * @description Export reviews in various formats
 */
router.get(
  '/export',
  [
    query('format').optional().isString().isIn(['json', 'csv']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('listingId').optional().isString()
  ],
  validateRequest,
  ReviewController.exportReviews
);

/**
 * @route GET /api/reviews/summary
 * @description Get summary statistics for multiple listings
 */
router.get(
  '/summary',
  [
    query('listingIds').optional().isString()
  ],
  validateRequest,
  ReviewController.getReviewsSummary
);

/**
 * @route POST /api/reviews/analyze
 * @description Analyze reviews for sentiment and insights
 */
router.post(
  '/analyze',
  [
    body('text').optional().isString(),
    body('reviewIds').optional().isArray(),
    body('analyzeSentiment').optional().isBoolean(),
    body('extractKeywords').optional().isBoolean()
  ],
  validateRequest,
  ReviewController.analyzeReviews
);

/**
 * @route GET /api/reviews/metadata
 * @description Get metadata about reviews (categories, channels, etc.)
 */
router.get(
  '/metadata',
  ReviewController.getReviewMetadata
);

/**
 * @route GET /api/reviews/public/:listingId
 * @description Get public reviews for website display
 */
router.get(
  '/public/:listingId',
  [
    param('listingId').isString()
  ],
  ReviewController.getPublicReviews
);

export default router;