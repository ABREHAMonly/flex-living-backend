// src/routes/google.routes.ts
import { Router } from 'express';
import { GoogleController } from '../controllers/google.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { query, body } from 'express-validator';

const router = Router();

/**
 * @route GET /api/google/reviews
 * @description Get Google reviews for a place or listing
 */
router.get(
  '/reviews',
  [
    query('placeId').optional().isString(),
    query('listingId').optional().isString()
  ],
  validateRequest,
  GoogleController.getGoogleReviews
);

/**
 * @route GET /api/google/search
 * @description Search for Google places
 */
router.get(
  '/search',
  [
    query('query').isString().trim().isLength({ min: 1, max: 200 })
  ],
  validateRequest,
  GoogleController.searchGooglePlaces
);

/**
 * @route POST /api/google/connect
 * @description Connect a Google place to a listing
 */
router.post(
  '/connect',
  [
    body('listingId').isString(),
    body('placeId').isString(),
    body('placeName').optional().isString(),
    body('address').optional().isString()
  ],
  validateRequest,
  GoogleController.connectGooglePlace
);

/**
 * @route GET /api/google/integration-status
 * @description Get Google integration status for all listings
 */
router.get(
  '/integration-status',
  GoogleController.getGoogleIntegrationStatus
);

export default router;