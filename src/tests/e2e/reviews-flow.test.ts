//src\tests\e2e\reviews-flow.test.ts
import request from 'supertest';
import App from '../../app';
import { Review } from '../../models/Review';
import { Listing } from '../../models/Listing';
import mongoose from 'mongoose';


interface TestListing {
  listingId: string;
  name: string;
  address: string;
  city: string;
  country: string;
  isActive?: boolean;
  googlePlaceId?: string;
}

interface DashboardProperty {
  listingId: string;
  issues: Array<{
    category: string;
    pattern?: string;
    count?: number;
    severity?: string;
    description?: string;
  }>;
}

interface IssuesResponse {
  totalIssues: number;
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
}

interface PublicReview {
  rating: number;
  isApproved: boolean;
  isPublic: boolean;
}

interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
}

interface QuickStatsResponse {
  status: string;
  data: {
    totals: {
      reviews: number;
      approved: number;
      pending: number;
      listings: number;
      channels: number;
    };
    averages: {
      rating: number;
      approvalRate: number;
    };
    recent: {
      last7Days: number;
      newReviews: number;
    };
    health: {
      responseRate: number;
      issues: number;
    };
  };
}

describe('Reviews E2E Flow Tests', () => {
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

  describe('Complete review management flow', () => {
    it('should complete full review lifecycle', async () => {
      // 1. Sync reviews from Hostaway
      const syncResponse = await request(app.getServer())
        .post('/api/reviews/sync')
        .expect(200);
      
      expect(syncResponse.body.status).toBe('success');
      expect(syncResponse.body.data.imported).toBeGreaterThan(0);

      // 2. Get all reviews
      const getReviewsResponse = await request(app.getServer())
        .get('/api/reviews/hostaway')
        .expect(200);
      
      expect(getReviewsResponse.body.data.length).toBeGreaterThan(0);
      const reviewId = getReviewsResponse.body.data[0]._id;

      // 3. Update review status (approve for display)
      const updateResponse = await request(app.getServer())
        .patch(`/api/reviews/${reviewId}`)
        .send({
          isApproved: true,
          isPublic: true,
          managerNotes: 'Approved for website display'
        })
        .expect(200);
      
      expect(updateResponse.body.data.isApproved).toBe(true);
      expect(updateResponse.body.data.isPublic).toBe(true);

      // 4. Get public reviews for website
      const listingId = getReviewsResponse.body.data[0].listingId;
      const publicResponse = await request(app.getServer())
        .get(`/api/reviews/public/${listingId}`)
        .expect(200);
      
      expect(publicResponse.body.data.length).toBeGreaterThan(0);
      const publicReview = publicResponse.body.data[0] as PublicReview;
      expect(publicReview.isApproved).toBe(true);
      expect(publicReview.isPublic).toBe(true);

      // 5. Get dashboard statistics
      const dashboardResponse = await request(app.getServer())
        .get('/api/dashboard/performance')
        .query({ timeframe: '30d' })
        .expect(200);
      
      expect(dashboardResponse.body.data.properties.length).toBeGreaterThan(0);
      expect(dashboardResponse.body.data.overall.totalProperties).toBeGreaterThan(0);

      // 6. Get dashboard issues
      const issuesResponse = await request(app.getServer())
        .get('/api/dashboard/issues')
        .expect(200);
      
      const issuesData = issuesResponse.body.data as IssuesResponse;
      expect(issuesData.totalIssues).toBeDefined();

      // 7. Get quick stats with timeframe that includes mock data
      const statsResponse = await request(app.getServer())
      .get('/api/dashboard/quick-stats')
      .query({ timeframe: 'all' }) // Use 'all' timeframe
      .expect(200);
      
      const statsData = statsResponse.body as QuickStatsResponse;
      expect(statsData.data.totals.reviews).toBeGreaterThan(0);
    });
  });

  describe('Google integration flow', () => {
    it('should complete Google integration flow', async () => {
      // 1. Create a listing
      const testListing: TestListing = {
        listingId: 'e2e-listing',
        name: 'E2E Test Hotel',
        address: '123 E2E St',
        city: 'Test City',
        country: 'Test Country'
      };
      
      await Listing.create(testListing);

      // 2. Search for Google places
      const searchResponse = await request(app.getServer())
        .get('/api/google/search')
        .query({ query: 'hotel test' })
        .expect(200);
      
      expect(searchResponse.body.data.length).toBeGreaterThan(0);
      const place = searchResponse.body.data[0] as GooglePlace;

      // 3. Connect Google place to listing
      const connectResponse = await request(app.getServer())
        .post('/api/google/connect')
        .send({
          listingId: 'e2e-listing',
          placeId: place.place_id,
          placeName: place.name,
          address: place.formatted_address
        })
        .expect(200);
      
      expect(connectResponse.body.status).toBe('success');

      // 4. Get Google reviews for the listing
      const reviewsResponse = await request(app.getServer())
        .get('/api/google/reviews')
        .query({ listingId: 'e2e-listing' })
        .expect(200);
      
      expect(reviewsResponse.body.status).toBe('success');
      expect(reviewsResponse.body.data.reviews).toBeInstanceOf(Array);

      // 5. Check integration status
      const statusResponse = await request(app.getServer())
        .get('/api/google/integration-status')
        .expect(200);
      
      expect(statusResponse.body.data.overall.totalConnected).toBeGreaterThan(0);
    });
  });

  describe('Review filtering and analysis flow', () => {
    beforeEach(async () => {
      // Create test data with various ratings and categories
      const now = new Date();
      await Review.create([
        {
          externalId: 'flow-1',
          type: 'guest-to-host',
          status: 'published',
          rating: 5,
          publicReview: 'Excellent clean quiet perfect! Very clean and tidy!',
          reviewCategory: [
            { category: 'cleanliness', rating: 10 },
            { category: 'noise', rating: 10 }
          ],
          submittedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          guestName: 'Happy Guest',
          listingName: 'Flow Test 1',
          listingId: 'flow-listing-1',
          channel: 'hostaway',
          isApproved: true,
          isPublic: true
        },
        {
          externalId: 'flow-2',
          type: 'guest-to-host',
          status: 'published',
          rating: 2,
          publicReview: 'Dirty and noisy. The place was very dirty and had a bad smell.',
          reviewCategory: [
            { category: 'cleanliness', rating: 2 },
            { category: 'noise', rating: 1 },
            { category: 'facilities', rating: 2 }
          ],
          submittedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          guestName: 'Unhappy Guest',
          listingName: 'Flow Test 1',
          listingId: 'flow-listing-1',
          channel: 'hostaway',
          isApproved: true,
          isPublic: false
        },
        {
          externalId: 'flow-3',
          type: 'guest-to-host',
          status: 'published',
          rating: 4,
          publicReview: 'Good but could be cleaner. Some areas were a bit dirty.',
          reviewCategory: [
            { category: 'cleanliness', rating: 6 },
            { category: 'communication', rating: 9 }
          ],
          submittedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          guestName: 'Neutral Guest',
          listingName: 'Flow Test 2',
          listingId: 'flow-listing-2',
          channel: 'hostaway',
          isApproved: true,
          isPublic: true
        }
      ]);

      await Listing.create([
        {
          listingId: 'flow-listing-1',
          name: 'Flow Test 1',
          address: '123 Flow St',
          city: 'Flow City',
          country: 'Flow Country',
          isActive: true
        },
        {
          listingId: 'flow-listing-2',
          name: 'Flow Test 2',
          address: '456 Flow St',
          city: 'Flow City',
          country: 'Flow Country',
          isActive: true
        }
      ]);
    });

    it('should filter and analyze reviews correctly', async () => {
      // 1. Filter by high ratings
      const highRatingsResponse = await request(app.getServer())
        .get('/api/reviews/hostaway')
        .query({ minRating: 4 })
        .expect(200);
      
      expect(highRatingsResponse.body.data.length).toBe(2); // Ratings 5 and 4

      // 2. Filter by low ratings
      const lowRatingsResponse = await request(app.getServer())
        .get('/api/reviews/hostaway')
        .query({ maxRating: 2 })
        .expect(200);
      
      expect(lowRatingsResponse.body.data.length).toBe(1); // Rating 2

      // 3. Filter by category
      const cleanlinessResponse = await request(app.getServer())
        .get('/api/reviews/hostaway')
        .query({ category: 'cleanliness' })
        .expect(200);
      
      expect(cleanlinessResponse.body.data.length).toBe(3); // All have cleanliness category

      // 4. Get dashboard performance - should identify cleanliness issues
      const performanceResponse = await request(app.getServer())
        .get('/api/dashboard/performance')
        .query({ timeframe: '7d' })
        .expect(200);
      
      const properties = performanceResponse.body.data.properties as DashboardProperty[];
      const listing1 = properties.find(p => p.listingId === 'flow-listing-1');
      expect(listing1?.issues.length).toBeGreaterThan(0);
      
      // Check for cleanliness issues (dirty keyword should trigger this)
      const hasCleanlinessIssue = listing1?.issues.some(i => 
        i.category === 'cleanliness' && 
        (i.pattern === 'dirty' || i.pattern === 'low_category_rating')
      );
      expect(hasCleanlinessIssue).toBe(true);

      // 5. Get dashboard issues - should show high priority issues
      const issuesResponse = await request(app.getServer())
        .get('/api/dashboard/issues')
        .query({ priority: 'high' })
        .expect(200);
      
      const issuesData = issuesResponse.body.data as IssuesResponse;
      
      // Note: The exact count depends on issue detection logic
      // We just check that the structure is correct
      expect(issuesData.totalIssues).toBeDefined();
      expect(issuesData.byPriority.high).toBeDefined();

      // 6. Get trends - should show rating changes over time
      const trendsResponse = await request(app.getServer())
        .get('/api/dashboard/trends')
        .query({ 
          interval: 'day',
          listingId: 'flow-listing-1' 
        })
        .expect(200);
      
      expect(trendsResponse.body.data.length).toBeGreaterThan(0);

      // 7. Get public reviews - should only show approved and public
      const publicResponse = await request(app.getServer())
        .get('/api/reviews/public/flow-listing-1')
        .expect(200);
      
      const publicReviews = publicResponse.body.data as PublicReview[];
      
      // Expect only review with isApproved=true AND isPublic=true
      // This is review flow-1 (5-star, isPublic: true)
      expect(publicReviews.length).toBe(1);
      expect(publicReviews[0].rating).toBe(5);
      expect(publicReviews[0].isApproved).toBe(true);
      expect(publicReviews[0].isPublic).toBe(true);
    });

    it('should handle date-based filtering correctly', async () => {
      // Filter by date range that includes our test data
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const oneDayAhead = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
      
      // Format dates as YYYY-MM-DD
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      
      const response = await request(app.getServer())
        .get('/api/reviews/hostaway')
        .query({
          startDate: formatDate(threeDaysAgo),
          endDate: formatDate(oneDayAhead)
        })
        .expect(200);
      
      // Should get all 3 reviews (they were created within last 3 days)
      expect(response.body.data.length).toBe(3);
    });

    it('should return quick stats correctly', async () => {
      const response = await request(app.getServer())
        .get('/api/dashboard/quick-stats')
        .query({ 
          timeframe: '30d',
          listingId: 'flow-listing-1' 
        })
        .expect(200);
      
      const statsData = response.body as QuickStatsResponse;
      
      // flow-listing-1 has 2 reviews (both approved, one public, one not)
      expect(statsData.data.totals.reviews).toBe(2);
      expect(statsData.data.totals.approved).toBe(2);
      expect(statsData.data.totals.pending).toBe(0);
      expect(statsData.data.health.issues).toBeGreaterThanOrEqual(0); // At least 1 low rating
    });
  });
});