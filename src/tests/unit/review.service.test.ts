// src/tests/unit/review.service.test.ts
import { ReviewService } from '../../services/review.service';
import { Review } from '../../models/Review';
import { Listing } from '../../models/Listing';
import mongoose from 'mongoose';

// Create proper mock types
interface MockReviewDocument {
  _id: mongoose.Types.ObjectId;
  save: jest.Mock;
  toObject: () => any;
}

// Mock the models properly
jest.mock('../../models/Review', () => {
  const mockReview = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn().mockImplementation((data: any) => {
      const doc: MockReviewDocument = {
        _id: new mongoose.Types.ObjectId(),
        save: jest.fn().mockResolvedValue(undefined),
        toObject: () => ({ ...data, _id: new mongoose.Types.ObjectId() }),
        ...data
      };
      return Promise.resolve(doc);
    }),
    aggregate: jest.fn(),
    distinct: jest.fn(),
    insertMany: jest.fn(),
    deleteMany: jest.fn(),
  };
  return {
    Review: mockReview,
    __esModule: true,
  };
});

jest.mock('../../models/Listing', () => {
  const mockListing = {
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((data: any) => {
      const doc = {
        _id: new mongoose.Types.ObjectId(),
        save: jest.fn().mockResolvedValue(undefined),
        toObject: () => ({ ...data, _id: new mongoose.Types.ObjectId() }),
        ...data
      };
      return Promise.resolve(doc);
    }),
    findOneAndUpdate: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    deleteMany: jest.fn(),
  };
  return {
    Listing: mockListing,
    __esModule: true,
  };
});

// Mock logger to suppress console output during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

describe('ReviewService', () => {
  const MockReview = Review as jest.Mocked<typeof Review>;
  const MockListing = Listing as jest.Mocked<typeof Listing>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations with proper typing
    MockReview.findOne.mockResolvedValue(null);
    MockReview.create.mockImplementation(async (data: any) => {
      const doc: any = {
        _id: new mongoose.Types.ObjectId(),
        ...(data as object),
        save: jest.fn().mockResolvedValue(undefined),
        toObject: () => ({ ...data, _id: new mongoose.Types.ObjectId() })
      };
      return doc;
    });
    
    MockListing.findOne.mockResolvedValue(null);
    MockListing.create.mockImplementation(async (data: any) => {
      const doc: any = {
        _id: new mongoose.Types.ObjectId(),
        ...(data as object),
        save: jest.fn().mockResolvedValue(undefined),
        toObject: () => ({ ...data, _id: new mongoose.Types.ObjectId() })
      };
      return doc;
    });
    
    // Setup aggregate mock
    MockReview.aggregate.mockResolvedValue([]);
  });

  describe('normalizeReviewData', () => {
    it('should normalize Hostaway review correctly', async () => {
      const hostawayReview = {
        id: 1234,
        type: 'guest-to-host',
        status: 'published',
        rating: 4.5,
        publicReview: 'Great stay!   Very clean.   ',
        reviewCategory: [
          { category: 'cleanliness', rating: 10 },
          { category: 'communication', rating: 9 }
        ],
        submittedAt: '2023-01-15 10:30:00',
        guestName: 'John Doe  ',
        listingName: 'Test Listing'
      };

      const result = await ReviewService.normalizeReviewData(hostawayReview, 'hostaway');

      expect(result.externalId).toBe('hostaway-1234');
      expect(result.type).toBe('guest-to-host');
      expect(result.rating).toBe(4.5);
      expect(result.publicReview).toBe('Great stay! Very clean.');
      expect(result.guestName).toBe('John Doe');
      expect(result.channel).toBe('hostaway');
      expect(result.isApproved).toBe(true);
      expect(result.isPublic).toBe(true);
      expect(result.reviewCategory).toHaveLength(2);
      expect(result.listingId).toBe('test-listing');
    });

    it('should normalize Google review correctly', async () => {
      const googleReview = {
        place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        rating: 5,
        text: 'Excellent!',
        time: 1673788800,
        author_name: 'Google User'
      };

      const result = await ReviewService.normalizeReviewData(googleReview, 'google');

      expect(result.externalId).toBe('google-ChIJN1t_tDeuEmsRUsoyG83frY4-1673788800');
      expect(result.type).toBe('guest-to-property');
      expect(result.rating).toBe(5);
      expect(result.channel).toBe('google');
      expect(result.isApproved).toBe(true);
      expect(result.isPublic).toBe(true);
      expect(result.submittedAt).toBeInstanceOf(Date);
      expect(result.sentimentScore).toBeDefined();
    });

    it('should throw error for unsupported source', async () => {
      const invalidReview = {
        id: 1234,
        publicReview: 'test',
        guestName: 'test',
        listingName: 'test'
      };

      await expect(
        ReviewService.normalizeReviewData(invalidReview, 'unsupported' as any)
      ).rejects.toThrow('Failed to normalize review data from unsupported');
    });
  });

  describe('processBatchReviews', () => {
    it('should process batch of reviews successfully', async () => {
      const mockReviews = [
        {
          id: 1,
          type: 'guest-to-host',
          status: 'published',
          rating: 5,
          publicReview: 'Great!',
          reviewCategory: [],
          submittedAt: '2023-01-01',
          guestName: 'John',
          listingName: 'Test Listing'
        },
        {
          id: 2,
          type: 'guest-to-host',
          status: 'published',
          rating: 4,
          publicReview: 'Good!',
          reviewCategory: [],
          submittedAt: '2023-01-02',
          guestName: 'Jane',
          listingName: 'Test Listing'
        }
      ];

      // Setup mocks with proper types
      MockReview.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      
      MockReview.find.mockResolvedValue([]);
      MockReview.findOneAndUpdate = jest.fn().mockResolvedValue({});

      const result = await ReviewService.processBatchReviews(mockReviews, 'hostaway');

      expect(result.processed).toBe(2);
      expect(result.imported).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(MockReview.findOne).toHaveBeenCalledTimes(2);
      expect(MockReview.create).toHaveBeenCalledTimes(2);
    });

    it('should handle errors in batch processing', async () => {
      const mockReviews = [
        {
          id: 1,
          type: 'guest-to-host',
          status: 'published',
          rating: 5,
          publicReview: 'Great!',
          reviewCategory: [],
          submittedAt: '2023-01-01',
          guestName: 'John',
          listingName: 'Test Listing'
        }
      ];

      MockReview.findOne.mockRejectedValue(new Error('DB Error'));

      const result = await ReviewService.processBatchReviews(mockReviews, 'hostaway');

      expect(result.processed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toHaveProperty('error');
      expect(result.errors[0].error).toBe('DB Error');
    });
  });

  describe('getReviewsWithInsights', () => {
    it('should add insights to reviews', async () => {
      const mockReviews = [
        {
          _id: '1',
          publicReview: 'Excellent stay! Very clean.',
          rating: 5,
          reviewCategory: [{ category: 'cleanliness', rating: 10 }],
          submittedAt: new Date(),
          guestName: 'Test Guest',
          listingName: 'Test Listing',
          listingId: 'test-1',
          channel: 'hostaway',
          status: 'published',
          externalId: 'test-1',
          type: 'guest-to-host' as const,
          isApproved: true,
          isPublic: true,
          sentimentScore: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      MockReview.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockReviews)
        })
      } as any);

      const result = await ReviewService.getReviewsWithInsights({});

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('insights');
      expect((result[0] as any).insights).toHaveProperty('sentiment');
      expect((result[0] as any).insights).toHaveProperty('lengthCategory');
      expect((result[0] as any).insights).toHaveProperty('hasIssues');
      expect((result[0] as any).insights).toHaveProperty('recommendation');
    });
  });

  describe('calculateSentiment', () => {
    it('should calculate positive sentiment', () => {
      // Cast to access private method
      const text = 'Excellent amazing perfect stay! Love it!';
      const sentiment = (ReviewService as any).calculateSentiment(text);
      
      expect(sentiment).toBeGreaterThan(0);
    });

    it('should calculate negative sentiment', () => {
      const text = 'Terrible awful horrible stay. Worst experience ever.';
      const sentiment = (ReviewService as any).calculateSentiment(text);
      
      expect(sentiment).toBeLessThan(0);
    });

    it('should calculate neutral sentiment', () => {
      const text = 'The stay was okay. Nothing special.';
      const sentiment = (ReviewService as any).calculateSentiment(text);
      
      expect(sentiment).toBe(0);
    });

    it('should handle empty text', () => {
      const sentiment = (ReviewService as any).calculateSentiment('');
      expect(sentiment).toBe(0);
    });
  });

  describe('sanitizeReviewText', () => {
    it('should remove excessive whitespace', () => {
      const text = '   Great!   Very   clean.   ';
      const sanitized = (ReviewService as any).sanitizeReviewText(text);
      
      expect(sanitized).toBe('Great! Very clean.');
    });

    it('should limit text length', () => {
      const longText = 'A'.repeat(6000);
      const sanitized = (ReviewService as any).sanitizeReviewText(longText);
      
      expect(sanitized.length).toBeLessThanOrEqual(5000);
    });
  });

  describe('sanitizeGuestName', () => {
    it('should sanitize guest name', () => {
      const name = '  John Doe 123!@#  ';
      const sanitized = (ReviewService as any).sanitizeGuestName(name);
      
      expect(sanitized).toBe('John Doe');
    });

    it('should limit name length', () => {
      const longName = 'A'.repeat(150);
      const sanitized = (ReviewService as any).sanitizeGuestName(longName);
      
      expect(sanitized.length).toBeLessThanOrEqual(100);
    });
  });
});