// src/tests/integration/reviews.integration.test.ts
import request from 'supertest';
import mongoose from 'mongoose';
import App from '../../app';
import { Review } from '../../models/Review';
import { Listing } from '../../models/Listing';

describe('Reviews API Integration Tests', () => {
  let app: App;

  beforeAll(async () => {
    app = new App();
    await app.initializeDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
  // Clear all collections properly
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    try {
      await collection.deleteMany({});
    } catch (error) {
      console.error(`Error clearing collection ${key}:`, error);
    }
  }
});

  describe('GET /api/reviews/hostaway', () => {
    it('should return empty array when no reviews exist', async () => {
      const response = await request(app.getServer())
        .get('/api/reviews/hostaway')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should return reviews with correct structure', async () => {
      // Create test review with all required fields
      const reviewData = {
        externalId: 'test-1',
        type: 'guest-to-host',
        status: 'published',
        rating: 5,
        publicReview: 'Great stay!',
        reviewCategory: [{ category: 'cleanliness', rating: 10 }],
        submittedAt: new Date(),
        guestName: 'John Doe',
        listingName: 'Test Listing',
        listingId: 'test-listing',
        channel: 'hostaway',
        isApproved: true,
        isPublic: true,
        sentimentScore: 0
      };

      await Review.create(reviewData);

      const response = await request(app.getServer())
        .get('/api/reviews/hostaway')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        rating: 5,
        guestName: 'John Doe',
        listingName: 'Test Listing',
        channel: 'hostaway'
      });
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1
      });
    });

    it('should filter reviews by listingId', async () => {
      // Create multiple reviews with all required fields
      await Review.create([
        {
          externalId: 'test-1',
          listingId: 'listing-1',
          type: 'guest-to-host',
          status: 'published',
          rating: 5,
          publicReview: 'Great!',
          reviewCategory: [{ category: 'cleanliness', rating: 10 }],
          submittedAt: new Date(),
          guestName: 'John',
          listingName: 'Test 1',
          channel: 'hostaway',
          isApproved: true,
          isPublic: true,
          sentimentScore: 0
        },
        {
          externalId: 'test-2',
          listingId: 'listing-2',
          type: 'guest-to-host',
          status: 'published',
          rating: 4,
          publicReview: 'Good',
          reviewCategory: [{ category: 'cleanliness', rating: 9 }],
          submittedAt: new Date(),
          guestName: 'Jane',
          listingName: 'Test 2',
          channel: 'hostaway',
          isApproved: true,
          isPublic: true,
          sentimentScore: 0
        }
      ]);

      const response = await request(app.getServer())
        .get('/api/reviews/hostaway')
        .query({ listingId: 'listing-1' })
        .expect(200);
      
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].listingId).toBe('listing-1');
    });

    it('should filter by date range', async () => {
      await Review.create({
        externalId: 'test-date',
        type: 'guest-to-host',
        status: 'published',
        rating: 5,
        publicReview: 'Test',
        submittedAt: new Date('2023-06-15'),
        guestName: 'Test',
        listingName: 'Test',
        listingId: 'test',
        channel: 'hostaway',
        isApproved: true
      });

      const response = await request(app.getServer())
        .get('/api/reviews/hostaway')
        .query({
          startDate: '2023-01-01',
          endDate: '2023-12-31'
        })
        .expect(200);
      
      expect(response.body.data.length).toBe(1);
    });

    it('should filter by rating range', async () => {
      await Review.create([
        {
          externalId: 'test-high',
          type: 'guest-to-host',
          status: 'published',
          rating: 5,
          publicReview: 'Excellent',
          submittedAt: new Date(),
          guestName: 'John',
          listingName: 'Test',
          listingId: 'test',
          channel: 'hostaway',
          isApproved: true
        },
        {
          externalId: 'test-low',
          type: 'guest-to-host',
          status: 'published',
          rating: 2,
          publicReview: 'Poor',
          submittedAt: new Date(),
          guestName: 'Jane',
          listingName: 'Test',
          listingId: 'test',
          channel: 'hostaway',
          isApproved: true
        }
      ]);

      const response = await request(app.getServer())
        .get('/api/reviews/hostaway')
        .query({ minRating: 4 })
        .expect(200);
      
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].rating).toBe(5);
    });

    it('should filter by approval status', async () => {
      await Review.create([
        {
          externalId: 'test-approved',
          type: 'guest-to-host',
          status: 'published',
          rating: 5,
          publicReview: 'Great',
          submittedAt: new Date(),
          guestName: 'John',
          listingName: 'Test',
          listingId: 'test',
          channel: 'hostaway',
          isApproved: true
        },
        {
          externalId: 'test-pending',
          type: 'guest-to-host',
          status: 'published',
          rating: 4,
          publicReview: 'Good',
          submittedAt: new Date(),
          guestName: 'Jane',
          listingName: 'Test',
          listingId: 'test',
          channel: 'hostaway',
          isApproved: false
        }
      ]);

      const response = await request(app.getServer())
        .get('/api/reviews/hostaway')
        .query({ isApproved: 'true' })
        .expect(200);
      
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].isApproved).toBe(true);
    });

    it('should support pagination', async () => {
      // Create multiple reviews
      const reviews = Array.from({ length: 25 }, (_, i) => ({
        externalId: `test-${i}`,
        type: 'guest-to-host',
        status: 'published',
        rating: 4,
        publicReview: `Review ${i}`,
        submittedAt: new Date(),
        guestName: `User ${i}`,
        listingName: 'Test',
        listingId: 'test',
        channel: 'hostaway',
        isApproved: true
      }));
      
      await Review.insertMany(reviews);

      const response = await request(app.getServer())
        .get('/api/reviews/hostaway')
        .query({ page: 2, limit: 10 })
        .expect(200);
      
      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        pages: 3
      });
    });
  });

  describe('POST /api/reviews/sync', () => {
    it('should sync reviews successfully', async () => {
      const response = await request(app.getServer())
        .post('/api/reviews/sync')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Reviews synced successfully');
      expect(response.body.data).toHaveProperty('imported');
      expect(response.body.data).toHaveProperty('updated');
      expect(response.body.data.imported).toBeGreaterThan(0);
    });

    it('should create listings from synced reviews', async () => {
      await request(app.getServer())
        .post('/api/reviews/sync')
        .expect(200);
      
      // Check that listings were created
      const listings = await Listing.find({});
      expect(listings.length).toBeGreaterThan(0);
      
      // Check that reviews were created
      const reviews = await Review.find({});
      expect(reviews.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /api/reviews/:id', () => {
    it('should update review status successfully', async () => {
      const review = await Review.create({
        externalId: 'test-update',
        type: 'guest-to-host',
        status: 'published',
        rating: 5,
        publicReview: 'Test review',
        submittedAt: new Date(),
        guestName: 'John',
        listingName: 'Test',
        listingId: 'test',
        channel: 'hostaway',
        isApproved: false,
        isPublic: false
      });

      const response = await request(app.getServer())
        .patch(`/api/reviews/${review._id}`)
        .send({
          isApproved: true,
          isPublic: true,
          managerNotes: 'Approved for display'
        })
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data.isApproved).toBe(true);
      expect(response.body.data.isPublic).toBe(true);
      expect(response.body.data.managerNotes).toBe('Approved for display');

      // Verify in database
      const updatedReview = await Review.findById(review._id);
      expect(updatedReview?.isApproved).toBe(true);
      expect(updatedReview?.isPublic).toBe(true);
    });

    it('should return 404 for non-existent review', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app.getServer())
        .patch(`/api/reviews/${fakeId}`)
        .send({ isApproved: true })
        .expect(404);
      
      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Review not found');
    });

    it('should validate request body', async () => {
      const review = await Review.create({
        externalId: 'test-validate',
        type: 'guest-to-host',
        status: 'published',
        rating: 5,
        publicReview: 'Test',
        submittedAt: new Date(),
        guestName: 'John',
        listingName: 'Test',
        listingId: 'test',
        channel: 'hostaway',
        isApproved: false
      });

      // Invalid boolean value
      const response = await request(app.getServer())
        .patch(`/api/reviews/${review._id}`)
        .send({ isApproved: 'not-a-boolean' })
        .expect(400);
      
      expect(response.body.status).toBe('error');
    });
  });

  describe('GET /api/reviews/public/:listingId', () => {
    it('should return only approved and public reviews', async () => {
      const listingId = 'test-listing-public';
      
      await Review.create([
        {
          externalId: 'test-public-1',
          type: 'guest-to-host',
          status: 'published',
          rating: 5,
          publicReview: 'Public review',
          submittedAt: new Date(),
          guestName: 'John',
          listingName: 'Test',
          listingId,
          channel: 'hostaway',
          isApproved: true,
          isPublic: true
        },
        {
          externalId: 'test-private-1',
          type: 'guest-to-host',
          status: 'published',
          rating: 4,
          publicReview: 'Private review',
          submittedAt: new Date(),
          guestName: 'Jane',
          listingName: 'Test',
          listingId,
          channel: 'hostaway',
          isApproved: true,
          isPublic: false // Not public
        },
        {
          externalId: 'test-unapproved-1',
          type: 'guest-to-host',
          status: 'published',
          rating: 3,
          publicReview: 'Unapproved review',
          submittedAt: new Date(),
          guestName: 'Bob',
          listingName: 'Test',
          listingId,
          channel: 'hostaway',
          isApproved: false, // Not approved
          isPublic: true
        }
      ]);

      const response = await request(app.getServer())
        .get(`/api/reviews/public/${listingId}`)
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].isApproved).toBe(true);
      expect(response.body.data[0].isPublic).toBe(true);
    });

    it('should return empty array for listing with no public reviews', async () => {
      const response = await request(app.getServer())
        .get('/api/reviews/public/nonexistent')
        .expect(200);
      
      expect(response.body.data).toEqual([]);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid query parameters', async () => {
      const response = await request(app.getServer())
        .get('/api/reviews/hostaway')
        .query({ minRating: 'invalid' })
        .expect(400);
      
      expect(response.body.status).toBe('error');
    });

    it('should handle database errors gracefully', async () => {
      // Simulate database error by disconnecting
      await mongoose.connection.close();
      
      const response = await request(app.getServer())
        .get('/api/reviews/hostaway')
        .expect(500);
      
      expect(response.body.status).toBe('error');
      
      // Reconnect for other tests
      await mongoose.connect(process.env.MONGODB_URI || '');
    });
  });
});