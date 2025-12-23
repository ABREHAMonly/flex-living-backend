// src/tests/unit/hostaway.service.test.ts
import { HostawayService } from '../../services/hostaway.service';
import { Review } from '../../models/Review';
import { Listing } from '../../models/Listing';
import { Query } from 'mongoose';

// Mock the models
jest.mock('../../models/Review');
jest.mock('../../models/Listing');

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }
}));

describe('HostawayService', () => {
  const MockReview = Review as jest.Mocked<typeof Review>;
  const MockListing = Listing as jest.Mocked<typeof Listing>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations with proper types
    MockReview.findOne.mockResolvedValue(null);
    
    // Create a proper mock Query for findOneAndUpdate
    const mockQuery = {
      exec: jest.fn().mockResolvedValue({
        _id: 'test-id',
        externalId: 'hostaway-1234',
        type: 'guest-to-host',
        rating: 5,
        // Add other required properties
      })
    } as unknown as Query<any, any>;
    
    MockReview.findOneAndUpdate.mockReturnValue(mockQuery);
    
    MockReview.create.mockResolvedValue({ 
      _id: 'new-id',
      externalId: 'hostaway-1234',
      type: 'guest-to-host',
      rating: 5,
      // Add other required properties
    } as any);
    
    MockReview.find.mockResolvedValue([]);
    
    MockListing.findOne.mockResolvedValue(null);
    MockListing.create.mockResolvedValue({} as any);
    
    // Mock findOneAndUpdate for Listing with upsert
    const mockListingQuery = {
      exec: jest.fn().mockResolvedValue({
        _id: 'listing-id',
        listingId: 'test-listing',
        name: 'Test Listing'
      })
    } as unknown as Query<any, any>;
    
    MockListing.findOneAndUpdate.mockReturnValue(mockListingQuery);
  });


  describe('fetchReviews', () => {
    it('should return mock reviews', async () => {
      const reviews = await HostawayService.fetchReviews();
      
      expect(Array.isArray(reviews)).toBe(true);
      expect(reviews.length).toBeGreaterThan(0);
      expect(reviews[0]).toHaveProperty('id');
      expect(reviews[0]).toHaveProperty('guestName');
      expect(reviews[0]).toHaveProperty('listingName');
      expect(reviews[0]).toHaveProperty('publicReview');
    });

    it('should include review categories', async () => {
      const reviews = await HostawayService.fetchReviews();
      const reviewWithCategories = reviews.find(r => r.reviewCategory && r.reviewCategory.length > 0);
      
      expect(reviewWithCategories).toBeDefined();
      expect(reviewWithCategories!.reviewCategory[0]).toHaveProperty('category');
      expect(reviewWithCategories!.reviewCategory[0]).toHaveProperty('rating');
    });
  });

  describe('syncReviews', () => {
    it('should sync reviews successfully', async () => {
      // Mock the fetchReviews method
      const mockReviews = [{
        id: 7453,
        type: 'host-to-guest',
        status: 'published',
        rating: null,
        publicReview: 'Shane and family are wonderful! Would definitely host again :)',
        reviewCategory: [
          { category: 'cleanliness', rating: 10 },
          { category: 'communication', rating: 10 },
          { category: 'respect_house_rules', rating: 10 }
        ],
        submittedAt: '2020-08-21 22:45:14',
        guestName: 'Shane Finkelstein',
        listingName: '2B N1 A - 29 Shoreditch Heights'
      }];
      
      // Use jest.spyOn instead of direct mocking
      const fetchReviewsSpy = jest.spyOn(HostawayService, 'fetchReviews')
        .mockResolvedValue(mockReviews);

      // Mock existing review query to return null (no existing review)
      MockReview.findOne.mockResolvedValueOnce(null);

      const result = await HostawayService.syncReviews();
      
      expect(result).toHaveProperty('imported');
      expect(result).toHaveProperty('updated');
      expect(result.imported).toBe(1);
      expect(result.updated).toBe(0);
      
      // Check that the listing was created or updated
      expect(MockListing.findOne).toHaveBeenCalled();
      expect(MockListing.create).toHaveBeenCalled();
      
      fetchReviewsSpy.mockRestore();
    });
  

    it('should handle existing listings', async () => {
      const mockExistingListingQuery = {
        exec: jest.fn().mockResolvedValue({ 
          _id: 'existing-id',
          listingId: '2b-n1-a-29-shoreditch-heights',
          name: 'Existing Listing'
        })
      } as unknown as Query<any, any>;
      
      MockListing.findOne.mockReturnValue(mockExistingListingQuery);
      
      const mockReviews = [{
        id: 7453,
        type: 'host-to-guest',
        status: 'published',
        rating: null,
        publicReview: 'Test review',
        reviewCategory: [],
        submittedAt: '2020-08-21 22:45:14',
        guestName: 'Test Guest',
        listingName: '2B N1 A - 29 Shoreditch Heights'
      }];
      
      const fetchReviewsSpy = jest.spyOn(HostawayService, 'fetchReviews')
        .mockResolvedValue(mockReviews);

      const result = await HostawayService.syncReviews();
      
      expect(MockListing.create).not.toHaveBeenCalled();
      expect(result).toBeDefined();
      
      fetchReviewsSpy.mockRestore();
    });

    it('should update existing reviews', async () => {
      // Mock existing review
      const mockExistingReviewQuery = {
        exec: jest.fn().mockResolvedValue({ 
          _id: 'existing-id',
          externalId: 'hostaway-7453',
          type: 'guest-to-host',
          rating: 4
        })
      } as unknown as Query<any, any>;
      
      MockReview.findOne.mockReturnValue(mockExistingReviewQuery);
      
      const mockReviews = [{
        id: 7453,
        type: 'host-to-guest',
        status: 'published',
        rating: 5,
        publicReview: 'Updated review',
        reviewCategory: [],
        submittedAt: '2020-08-21 22:45:14',
        guestName: 'Test Guest',
        listingName: 'Test Listing'
      }];
      
      const fetchReviewsSpy = jest.spyOn(HostawayService, 'fetchReviews')
        .mockResolvedValue(mockReviews);

      const result = await HostawayService.syncReviews();
      
      expect(result.updated).toBe(1);
      expect(MockReview.findOneAndUpdate).toHaveBeenCalled();
      
      fetchReviewsSpy.mockRestore();
    });

    it('should handle errors during sync', async () => {
      const fetchReviewsSpy = jest.spyOn(HostawayService, 'fetchReviews')
        .mockRejectedValue(new Error('Test error'));

      await expect(HostawayService.syncReviews()).rejects.toThrow('Failed to sync reviews');
      
      fetchReviewsSpy.mockRestore();
    });
  });

  describe('extractListingId', () => {
    it('should extract valid listing ID from name', () => {
      const listingName = '2B N1 A - 29 Shoreditch Heights';
      const listingId = (HostawayService as any)['extractListingId'](listingName);
      
      expect(listingId).toBe('2b-n1-a-29-shoreditch-heights');
      expect(listingId).not.toMatch(/[^a-z0-9-]/);
    });

    it('should handle special characters', () => {
      const listingName = 'Test & More @ Location #1';
      const listingId = (HostawayService as any)['extractListingId'](listingName);
      
      expect(listingId).toBe('test-more-location-1');
    });

    it('should handle empty or invalid names', () => {
      const listingId1 = (HostawayService as any)['extractListingId']('');
      expect(listingId1).toBe('');
      
      const listingId2 = (HostawayService as any)['extractListingId']('   ');
      expect(listingId2).toBe('');
    });
  });

  describe('updateListingStats', () => {
    it('should calculate correct statistics', async () => {
      MockReview.find.mockResolvedValue([
        { rating: 5 },
        { rating: 4 },
        { rating: 3 },
        { rating: null }
      ] as any[]);

      await (HostawayService as any)['updateListingStats']('test-listing');
      
      expect(MockReview.find).toHaveBeenCalledWith({
        listingId: 'test-listing',
        isApproved: true,
        rating: { $ne: null }
      });
      
      expect(MockListing.findOneAndUpdate).toHaveBeenCalled();
    });

it('should handle empty reviews', async () => {
  MockReview.find.mockResolvedValue([]);
  
  const mockExec = jest.fn().mockResolvedValue({
    _id: 'listing-id',
    listingId: 'test-listing',
    name: 'Test Listing'
  });
  
  MockListing.findOneAndUpdate.mockReturnValue({
    exec: mockExec
  } as any);

  await (HostawayService as any)['updateListingStats']('test-listing');
  
  expect(MockListing.findOneAndUpdate).toHaveBeenCalled();
  
  const callArgs = (MockListing.findOneAndUpdate as jest.Mock).mock.calls[0];
  expect(callArgs[0]).toEqual({ listingId: 'test-listing' });
  expect(callArgs[1]).toMatchObject({
    totalReviews: 0,
    averageRating: 0,
    lastReviewSync: expect.any(Date)
  });
  expect(callArgs[2]).toEqual({ upsert: true });
});
});

  describe('ensureListingExists', () => {
    it('should create listing if it does not exist', async () => {
      // Mock to return null (listing doesn't exist)
      MockListing.findOne.mockResolvedValueOnce(null);

      await (HostawayService as any)['ensureListingExists']('test-listing', 'Test Listing');
      
      expect(MockListing.findOne).toHaveBeenCalledWith({ listingId: 'test-listing' });
      expect(MockListing.create).toHaveBeenCalledWith({
        listingId: 'test-listing',
        name: 'Test Listing',
        address: 'To be updated',
        city: 'London',
        country: 'UK',
        totalReviews: 0,
        averageRating: 0
      });
    });

    it('should not create listing if it exists', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue({ 
          listingId: 'test-listing',
          name: 'Existing Listing' 
        })
      } as unknown as Query<any, any>;
      
      MockListing.findOne.mockReturnValue(mockQuery);

      await (HostawayService as any)['ensureListingExists']('test-listing', 'Test Listing');
      
      expect(MockListing.findOne).toHaveBeenCalled();
      expect(MockListing.create).not.toHaveBeenCalled();
    });
  });
});