//src\tests\unit\controllers.test.ts
import { Request, Response } from 'express';
import { ReviewController } from '../../controllers/reviews.controller';
import { Review } from '../../models/Review';
import { HostawayService } from '../../services/hostaway.service';

// Proper mocking
jest.mock('../../models/Review', () => ({
  Review: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
    distinct: jest.fn(),
    insertMany: jest.fn(),
    deleteMany: jest.fn(),
  }
}));

jest.mock('../../models/Listing', () => ({
  Listing: {
    findOne: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    deleteMany: jest.fn(),
  }
}));

jest.mock('../../services/hostaway.service', () => ({
  HostawayService: {
    syncReviews: jest.fn(),
    fetchReviews: jest.fn(),
  }
}));

jest.mock('../../services/google.service', () => ({
  GoogleReviewService: {
    getPlaceReviews: jest.fn(),
    getPlaceDetails: jest.fn(),
    searchPlace: jest.fn(),
  }
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

// Mock config
jest.mock('../../config/env', () => ({
  config: {
    NODE_ENV: 'test',
    GOOGLE_API_KEY: 'test-mock-key',
  }
}));

describe('ReviewController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonResponse: jest.Mock;
  let statusResponse: jest.Mock;

  beforeEach(() => {
    jsonResponse = jest.fn();
    statusResponse = jest.fn().mockReturnValue({ json: jsonResponse });
    mockResponse = {
      json: jsonResponse,
      status: statusResponse
    };
    mockRequest = {
      query: {},
      params: {},
      body: {}
    };
    jest.clearAllMocks();
  });

  describe('getHostawayReviews', () => {
    it('should return reviews with pagination', async () => {
      const mockReviews = [{ 
        _id: 'test-id', 
        publicReview: 'Great!',
        listingId: 'test-1',
        guestName: 'John Doe',
        listingName: 'Test Listing',
        channel: 'hostaway',
        rating: 5,
        type: 'guest-to-host',
        status: 'published',
        externalId: 'test-1',
        submittedAt: new Date(),
        isApproved: true,
        isPublic: true,
        reviewCategory: [],
        sentimentScore: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }];
      
      // Setup mock chain
      const mockLean = jest.fn().mockResolvedValue(mockReviews);
      const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
      (Review.find as jest.Mock).mockReturnValue({ sort: mockSort });
      
      (Review.countDocuments as jest.Mock).mockResolvedValue(1);

      mockRequest.query = { page: '1', limit: '10' };
      await ReviewController.getHostawayReviews(mockRequest as Request, mockResponse as Response);

      expect(jsonResponse).toHaveBeenCalledWith({
        status: 'success',
        data: mockReviews,
        pagination: expect.objectContaining({
          page: 1,
          limit: 10,
          total: 1
        })
      });
    });

    it('should handle errors properly', async () => {
      (Review.find as jest.Mock).mockImplementation(() => {
        throw new Error('DB Error');
      });

      mockRequest.query = { page: '1', limit: '10' };
      await ReviewController.getHostawayReviews(mockRequest as Request, mockResponse as Response);

      expect(statusResponse).toHaveBeenCalledWith(500);
      expect(jsonResponse).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to fetch reviews',
        error: 'DB Error'
      });
    });
  });

  describe('syncHostawayReviews', () => {
    it('should sync reviews successfully', async () => {
      const mockResult = { imported: 5, updated: 2 };
      (HostawayService.syncReviews as jest.Mock).mockResolvedValue(mockResult);

      await ReviewController.syncHostawayReviews(mockRequest as Request, mockResponse as Response);

      expect(jsonResponse).toHaveBeenCalledWith({
        status: 'success',
        message: 'Reviews synced successfully',
        data: mockResult
      });
    });

    it('should handle sync errors', async () => {
      (HostawayService.syncReviews as jest.Mock).mockRejectedValue(new Error('Sync failed'));

      await ReviewController.syncHostawayReviews(mockRequest as Request, mockResponse as Response);

      expect(statusResponse).toHaveBeenCalledWith(500);
      expect(jsonResponse).toHaveBeenCalledWith({
        status: 'error',
        message: 'Failed to sync reviews'
      });
    });
  });
});