// src/tests/integration/dashboard.integration.test.ts
import request from 'supertest';
import mongoose from 'mongoose';
import App from '../../app';
import { Review } from '../../models/Review';
import { Listing } from '../../models/Listing';

describe('Dashboard API Integration Tests', () => {
  let app: App;

  beforeAll(async () => {
    app = new App();
    await app.initializeDatabase();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Review.deleteMany({});
    await Listing.deleteMany({});
  });

  describe('GET /api/dashboard/performance', () => {
    beforeEach(async () => {
    // Create listings
    await Listing.create([
      {
        listingId: 'listing-1',
        name: 'Luxury Apartment Downtown',
        address: '123 Main St',
        city: 'New York',
        country: 'USA',
        isActive: true
      },
      {
        listingId: 'listing-2',
        name: 'Cozy Studio Uptown',
        address: '456 Park Ave',
        city: 'New York',
        country: 'USA',
        isActive: true
      },
      {
        listingId: 'listing-inactive',
        name: 'Inactive Listing',
        address: '789 Side St',
        city: 'New York',
        country: 'USA',
        isActive: false
      }
    ]);

      // Create reviews for listing-1 with recent dates
    const now = new Date();
    await Review.create([
      {
        externalId: 'review-1-1',
        type: 'guest-to-host',
        status: 'published',
        rating: 5,
        publicReview: 'Excellent stay! Very clean.',
        reviewCategory: [
          { category: 'cleanliness', rating: 10 },
          { category: 'communication', rating: 9 },
          { category: 'location', rating: 10 }
        ],
        submittedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        guestName: 'John Smith',
        listingName: 'Luxury Apartment Downtown',
        listingId: 'listing-1',
        channel: 'hostaway',
        isApproved: true,
        isPublic: true
      },
      {
        externalId: 'review-1-2',
        type: 'guest-to-host',
        status: 'published',
        rating: 4,
        publicReview: 'Good location, comfortable beds.',
        reviewCategory: [
          { category: 'cleanliness', rating: 8 },
          { category: 'communication', rating: 7 },
          { category: 'location', rating: 9 }
        ],
        submittedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
        guestName: 'Jane Doe',
        listingName: 'Luxury Apartment Downtown',
        listingId: 'listing-1',
        channel: 'hostaway',
        isApproved: true,
        isPublic: true
      }
    ]);

    // Create reviews for listing-2
    await Review.create([
      {
        externalId: 'review-2-1',
        type: 'guest-to-host',
        status: 'published',
        rating: 3,
        publicReview: 'Average stay, could be cleaner.',
        reviewCategory: [
          { category: 'cleanliness', rating: 5 },
          { category: 'communication', rating: 6 },
          { category: 'location', rating: 8 }
        ],
        submittedAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
        guestName: 'Bob Johnson',
        listingName: 'Cozy Studio Uptown',
        listingId: 'listing-2',
        channel: 'hostaway',
        isApproved: true,
        isPublic: true
      }
    ]);
  });

    it('should return property performance for all active listings', async () => {
    const response = await request(app.getServer())
      .get('/api/dashboard/performance')
      .query({ timeframe: '30d' })
      .expect(200);
    
    expect(response.body.status).toBe('success');
    expect(response.body.data).toHaveProperty('overall');
    expect(response.body.data).toHaveProperty('properties');
    
    const { overall, properties } = response.body.data;
    
    expect(overall.totalProperties).toBe(2); // Only active listings
    expect(properties).toHaveLength(2);
    
    // Should be sorted by average rating
    expect(properties[0].averageRating).toBeGreaterThanOrEqual(properties[1].averageRating);
    
    // Check property data structure
    properties.forEach((property: any) => {
      expect(property).toHaveProperty('listingId');
      expect(property).toHaveProperty('listingName');
      expect(property).toHaveProperty('totalReviews');
      expect(property).toHaveProperty('averageRating');
      expect(property).toHaveProperty('sentimentScore');
      expect(property).toHaveProperty('categoryAverages');
      expect(property).toHaveProperty('channelBreakdown');
      expect(property).toHaveProperty('issues');
      expect(property).toHaveProperty('recommendations');
    });
    
    // Verify specific property data
    const property1 = properties.find((p: any) => p.listingId === 'listing-1');
    expect(property1.totalReviews).toBe(2);
    expect(property1.averageRating).toBe(4.5); // (5 + 4) / 2
    
    const property2 = properties.find((p: any) => p.listingId === 'listing-2');
    expect(property2.totalReviews).toBe(1);
    expect(property2.averageRating).toBe(3);
  });

    it('should filter by specific listingIds', async () => {
      const response = await request(app.getServer())
        .get('/api/dashboard/performance')
        .query({ 
          timeframe: '30d',
          listingIds: 'listing-1'
        })
        .expect(200);
      
      expect(response.body.data.properties).toHaveLength(1);
      expect(response.body.data.properties[0].listingId).toBe('listing-1');
    });

    it('should filter by multiple listingIds', async () => {
      const response = await request(app.getServer())
        .get('/api/dashboard/performance')
        .query({ 
          timeframe: '30d',
          listingIds: 'listing-1,listing-2'
        })
        .expect(200);
      
      expect(response.body.data.properties).toHaveLength(2);
    });

    it('should handle different timeframes', async () => {
      const timeframes = ['7d', '30d', '90d', '1y'];
      
      for (const timeframe of timeframes) {
        const response = await request(app.getServer())
          .get('/api/dashboard/performance')
          .query({ timeframe })
          .expect(200);
        
        expect(response.body.status).toBe('success');
        expect(response.body.data.timeframe).toBeDefined();
      }
    });

    it('should exclude inactive listings', async () => {
      const response = await request(app.getServer())
        .get('/api/dashboard/performance')
        .expect(200);
      
      const inactiveProperty = response.body.data.properties.find(
        (p: any) => p.listingId === 'listing-inactive'
      );
      expect(inactiveProperty).toBeUndefined();
    });

    it('should calculate category averages correctly', async () => {
      const response = await request(app.getServer())
        .get('/api/dashboard/performance')
        .query({ timeframe: '30d' })
        .expect(200);
      
      const property1 = response.body.data.properties.find(
        (p: any) => p.listingId === 'listing-1'
      );
      
      // Check cleanliness average: (10 + 8) / 2 = 9
      const cleanlinessCat = property1.categoryAverages.find(
        (c: any) => c.category === 'cleanliness'
      );
      expect(cleanlinessCat).toBeDefined();
      expect(cleanlinessCat.averageRating).toBe(9);
      expect(cleanlinessCat.count).toBe(2);
    });

it('should identify issues from negative reviews', async () => {
  // Add a negative review
  await Review.create({
    externalId: 'review-negative',
    type: 'guest-to-host',
    status: 'published',
    rating: 2,
    publicReview: 'Very dirty and noisy place. Terrible experience.',
    reviewCategory: [
      { category: 'cleanliness', rating: 2 },
      { category: 'noise', rating: 1 }
    ],
    submittedAt: new Date(),
    guestName: 'Unhappy Guest',
    listingName: 'Luxury Apartment Downtown',
    listingId: 'listing-1',
    channel: 'hostaway',
    isApproved: true,
    isPublic: true
  });

  const response = await request(app.getServer())
    .get('/api/dashboard/performance')
    .query({ timeframe: '30d' })
    .expect(200);
  
  const property1 = response.body.data.properties.find(
    (p: any) => p.listingId === 'listing-1'
  );
  
  expect(property1.issues.length).toBeGreaterThan(0);
  // Now expecting 'high' severity since we made the detection more sensitive
  expect(property1.issues.some((issue: any) => 
    issue.category === 'cleanliness' && issue.severity === 'high'
  )).toBe(true);
});

    it('should generate recommendations based on data', async () => {
      const response = await request(app.getServer())
        .get('/api/dashboard/performance')
        .query({ timeframe: '30d' })
        .expect(200);
      
      const property2 = response.body.data.properties.find(
        (p: any) => p.listingId === 'listing-2'
      );
      
      expect(property2.recommendations).toBeInstanceOf(Array);
      expect(property2.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/dashboard/trends', () => {
    beforeEach(async () => {
      // Create reviews spread across different months
      await Review.create([
        {
          externalId: 'trend-1',
          type: 'guest-to-host',
          status: 'published',
          rating: 5,
          publicReview: 'Great in January',
          submittedAt: new Date('2023-01-15'),
          guestName: 'John',
          listingName: 'Test',
          listingId: 'test-listing',
          channel: 'hostaway',
          isApproved: true,
          isPublic: true
        },
        {
          externalId: 'trend-2',
          type: 'guest-to-host',
          status: 'published',
          rating: 4,
          publicReview: 'Good in February',
          submittedAt: new Date('2023-02-15'),
          guestName: 'Jane',
          listingName: 'Test',
          listingId: 'test-listing',
          channel: 'hostaway',
          isApproved: true,
          isPublic: true
        },
        {
          externalId: 'trend-3',
          type: 'guest-to-host',
          status: 'published',
          rating: 3,
          publicReview: 'Okay in March',
          submittedAt: new Date('2023-03-15'),
          guestName: 'Bob',
          listingName: 'Test',
          listingId: 'test-listing',
          channel: 'hostaway',
          isApproved: true,
          isPublic: true
        }
      ]);
    });

    it('should return review trends by month', async () => {
      const response = await request(app.getServer())
        .get('/api/dashboard/trends')
        .query({ interval: 'month' })
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeInstanceOf(Array);
      
      if (response.body.data.length > 0) {
        const trend = response.body.data[0];
        expect(trend).toHaveProperty('date');
        expect(trend).toHaveProperty('avgRating');
        expect(trend).toHaveProperty('totalReviews');
        expect(trend).toHaveProperty('positivePercentage');
        expect(trend).toHaveProperty('negativePercentage');
      }
    });

    it('should filter trends by listingId', async () => {
      // Create review for different listing
      await Review.create({
        externalId: 'trend-other',
        type: 'guest-to-host',
        status: 'published',
        rating: 5,
        publicReview: 'Other listing',
        submittedAt: new Date('2023-04-15'),
        guestName: 'Alice',
        listingName: 'Other',
        listingId: 'other-listing',
        channel: 'hostaway',
        isApproved: true,
        isPublic: true
      });

      const response = await request(app.getServer())
        .get('/api/dashboard/trends')
        .query({ 
          interval: 'month',
          listingId: 'test-listing'
        })
        .expect(200);
      
      // Should only include data for test-listing
      response.body.data.forEach((trend: any) => {
        // All data points should be from test-listing
        expect(trend.totalReviews).toBeGreaterThan(0);
      });
    });

    it('should support different intervals', async () => {
      const intervals = ['day', 'week', 'month', 'year'];
      
      for (const interval of intervals) {
        const response = await request(app.getServer())
          .get('/api/dashboard/trends')
          .query({ interval })
          .expect(200);
        
        expect(response.body.status).toBe('success');
      }
    });

    it('should calculate positive/negative percentages correctly', async () => {
      const response = await request(app.getServer())
        .get('/api/dashboard/trends')
        .query({ interval: 'month' })
        .expect(200);
      
      response.body.data.forEach((trend: any) => {
        expect(trend.positivePercentage).toBeGreaterThanOrEqual(0);
        expect(trend.positivePercentage).toBeLessThanOrEqual(100);
        expect(trend.negativePercentage).toBeGreaterThanOrEqual(0);
        expect(trend.negativePercentage).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('GET /api/dashboard/issues', () => {
    beforeEach(async () => {
      await Review.create([
        {
          externalId: 'issue-1',
          type: 'guest-to-host',
          status: 'published',
          rating: 1,
          publicReview: 'Terrible! Very dirty and noisy. Broken facilities.',
          reviewCategory: [
            { category: 'cleanliness', rating: 1 },
            { category: 'noise', rating: 2 },
            { category: 'facilities', rating: 1 }
          ],
          submittedAt: new Date(),
          guestName: 'Unhappy Guest',
          listingName: 'Problem Listing',
          listingId: 'listing-issues',
          channel: 'hostaway',
          isApproved: true,
          isPublic: true
        },
        {
          externalId: 'issue-2',
          type: 'guest-to-host',
          status: 'published',
          rating: 2,
          publicReview: 'Disappointed with cleanliness. Bathroom was dirty.',
          reviewCategory: [
            { category: 'cleanliness', rating: 3 },
            { category: 'communication', rating: 6 }
          ],
          submittedAt: new Date(),
          guestName: 'Concerned Guest',
          listingName: 'Problem Listing',
          listingId: 'listing-issues',
          channel: 'hostaway',
          isApproved: true,
          isPublic: true
        },
        {
          externalId: 'issue-3',
          type: 'guest-to-host',
          status: 'published',
          rating: 5,
          publicReview: 'Perfect! No issues.',
          reviewCategory: [
            { category: 'cleanliness', rating: 10 },
            { category: 'communication', rating: 10 }
          ],
          submittedAt: new Date(),
          guestName: 'Happy Guest',
          listingName: 'Good Listing',
          listingId: 'listing-good',
          channel: 'hostaway',
          isApproved: true,
          isPublic: true
        }
      ]);
    });

    it('should identify issues from reviews', async () => {
      const response = await request(app.getServer())
        .get('/api/dashboard/issues')
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('totalIssues');
      expect(response.body.data).toHaveProperty('byPriority');
      expect(response.body.data).toHaveProperty('byCategory');
      expect(response.body.data).toHaveProperty('recentIssues');
      
      expect(response.body.data.totalIssues).toBeGreaterThan(0);
      expect(response.body.data.byPriority.high).toBeGreaterThan(0);
      
      // Should identify cleanliness issues
      const cleanlinessIssues = response.body.data.byCategory.filter(
        (cat: any) => cat.category === 'cleanliness'
      );
      expect(cleanlinessIssues.length).toBeGreaterThan(0);
    });

    it('should filter issues by priority', async () => {
      const responseHigh = await request(app.getServer())
        .get('/api/dashboard/issues')
        .query({ priority: 'high' })
        .expect(200);
      
      const responseAll = await request(app.getServer())
        .get('/api/dashboard/issues')
        .query({ priority: 'all' })
        .expect(200);
      
      expect(responseHigh.body.data.totalIssues).toBeLessThanOrEqual(
        responseAll.body.data.totalIssues
      );
    });

    it('should filter issues by listingId', async () => {
      const response = await request(app.getServer())
        .get('/api/dashboard/issues')
        .query({ listingId: 'listing-issues' })
        .expect(200);
      
      response.body.data.recentIssues.forEach((issue: any) => {
        expect(issue.listingId).toBe('listing-issues');
      });
    });

    it('should categorize issues correctly', async () => {
      const response = await request(app.getServer())
        .get('/api/dashboard/issues')
        .expect(200);
      
      // Check that issues are grouped by category
      response.body.data.byCategory.forEach((category: any) => {
        expect(category).toHaveProperty('category');
        expect(category).toHaveProperty('issues');
        expect(category).toHaveProperty('count');
        expect(category).toHaveProperty('priorityCounts');
        expect(category.priorityCounts).toHaveProperty('high');
        expect(category.priorityCounts).toHaveProperty('medium');
        expect(category.priorityCounts).toHaveProperty('low');
      });
    });

    it('should identify negative keywords', async () => {
      const response = await request(app.getServer())
        .get('/api/dashboard/issues')
        .expect(200);
      
      // Should identify mentions of "dirty" and "broken"
      const hasDirtyIssue = response.body.data.recentIssues.some(
        (issue: any) => issue.description.includes('dirty')
      );
      const hasBrokenIssue = response.body.data.recentIssues.some(
        (issue: any) => issue.description.includes('broken')
      );
      
      expect(hasDirtyIssue || hasBrokenIssue).toBe(true);
    });
  });

  describe('GET /api/dashboard/quick-stats', () => {
    beforeEach(async () => {
      // Create test data
      await Review.create([
        {
          externalId: 'stats-1',
          type: 'guest-to-host',
          status: 'published',
          rating: 5,
          publicReview: 'Great!',
          submittedAt: new Date(),
          guestName: 'John',
          listingName: 'Test',
          listingId: 'test',
          channel: 'hostaway',
          isApproved: true,
          isPublic: true
        },
        {
          externalId: 'stats-2',
          type: 'guest-to-host',
          status: 'published',
          rating: 4,
          publicReview: 'Good',
          submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          guestName: 'Jane',
          listingName: 'Test',
          listingId: 'test',
          channel: 'hostaway',
          isApproved: false,
          isPublic: false
        },
        {
          externalId: 'stats-3',
          type: 'guest-to-host',
          status: 'published',
          rating: 2,
          publicReview: 'Poor',
          submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          guestName: 'Bob',
          listingName: 'Test',
          listingId: 'test',
          channel: 'hostaway',
          isApproved: true,
          isPublic: true
        }
      ]);

      await Listing.create({
        listingId: 'test',
        name: 'Test',
        address: 'Test',
        city: 'Test',
        country: 'Test',
        isActive: true
      });
    });

    it('should return quick statistics', async () => {
      const response = await request(app.getServer())
        .get('/api/dashboard/quick-stats')
        .query({ timeframe: '30d' })
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('totals');
      expect(response.body.data).toHaveProperty('averages');
      expect(response.body.data).toHaveProperty('recent');
      expect(response.body.data).toHaveProperty('health');
      
      const { totals, averages, recent, health } = response.body.data;
      
      expect(totals.reviews).toBe(3);
      expect(totals.approved).toBe(2);
      expect(totals.pending).toBe(1);
      expect(totals.listings).toBe(1);
      
      expect(averages.rating).toBeGreaterThan(0);
      expect(averages.approvalRate).toBeGreaterThan(0);
      
      expect(recent.last7Days).toBe(2); // 2 reviews in last 7 days
      expect(recent.newReviews).toBe(1); // 1 unapproved review
      
      expect(health.issues).toBe(1); // 1 review with rating <= 2
    });

    it('should filter by listingId', async () => {
      // Create another listing with reviews
      await Review.create({
        externalId: 'stats-other',
        type: 'guest-to-host',
        status: 'published',
        rating: 5,
        publicReview: 'Other',
        submittedAt: new Date(),
        guestName: 'Alice',
        listingName: 'Other',
        listingId: 'other',
        channel: 'hostaway',
        isApproved: true,
        isPublic: true
      });

      const response = await request(app.getServer())
        .get('/api/dashboard/quick-stats')
        .query({ 
          timeframe: '30d',
          listingId: 'test'
        })
        .expect(200);
      
      expect(response.body.data.totals.reviews).toBe(3); // Only from 'test' listing
    });

    it('should handle different timeframes', async () => {
      const timeframes = ['7d', '30d', '90d', '1y'];
      
      for (const timeframe of timeframes) {
        const response = await request(app.getServer())
          .get('/api/dashboard/quick-stats')
          .query({ timeframe })
          .expect(200);
        
        expect(response.body.status).toBe('success');
      }
    });
  });

  describe('Error handling', () => {
    it('should handle invalid query parameters', async () => {
      const response = await request(app.getServer())
        .get('/api/dashboard/performance')
        .query({ timeframe: 'invalid' })
        .expect(400);
      
      expect(response.body.status).toBe('error');
    });

    it('should return empty data when no reviews exist', async () => {
      await Review.deleteMany({});
      await Listing.deleteMany({});
      
      const response = await request(app.getServer())
        .get('/api/dashboard/performance')
        .expect(200);
      
      expect(response.body.data.properties).toEqual([]);
      expect(response.body.data.overall.totalProperties).toBe(0);
    });
  });
});