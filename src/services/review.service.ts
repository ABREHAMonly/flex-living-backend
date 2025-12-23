// src/services/review.service.ts
import { Review, IReview } from '../models/Review';
import { Listing } from '../models/Listing';
import { logger } from '../utils/logger';
import { Channel, ReviewStatus, ReviewType } from '../types';

// Base interface for all review data sources
interface BaseReviewData {
  id?: number | string;
  externalId?: string;  // Add externalId to base interface
  type?: string;
  status?: string;
  rating?: number | null;
  publicReview?: string;
  reviewCategory?: Array<{
    category: string;
    rating: number;
  }>;
  submittedAt?: string | Date;
  guestName?: string;
  listingName?: string;
}

// Hostaway specific data
interface HostawayReviewData extends BaseReviewData {
  id: number;
  type: string;
  status: string;
  listingName: string;
  guestName: string;
}

// Google specific data
interface GoogleReviewData extends BaseReviewData {
  place_id?: string;
  time?: number;
  text?: string;
  author_name?: string;
}

// Airbnb specific data
interface AirbnbReviewData extends BaseReviewData {
  comments?: string;
  reviewer?: { name?: string };
  listing?: { name?: string };
  listing_id?: string;
  created_at?: string | Date;
  categories?: Array<{ category: string; rating: number }>;
}

// Booking/Direct specific data
interface BookingReviewData extends BaseReviewData {
  text?: string;
  author_name?: string;
  listing_id?: string;
  created_at?: string | Date;
  categories?: Array<{ category: string; rating: number }>;
}

// Union type for all review data
type ReviewData = HostawayReviewData | GoogleReviewData | AirbnbReviewData | BookingReviewData;

// Helper function to safely convert string to ReviewStatus
const toReviewStatus = (status?: string): ReviewStatus => {
  const validStatuses: ReviewStatus[] = ['published', 'unpublished', 'pending', 'archived'];
  if (status && validStatuses.includes(status as ReviewStatus)) {
    return status as ReviewStatus;
  }
  return 'pending';
};

// Helper function to safely convert string to ReviewType
const toReviewType = (type?: string): ReviewType => {
  const validTypes: ReviewType[] = ['host-to-guest', 'guest-to-host', 'guest-to-property'];
  if (type && validTypes.includes(type as ReviewType)) {
    return type as ReviewType;
  }
  return 'guest-to-property'; // Default type
};

export class ReviewService {
  static async normalizeReviewData(reviewData: ReviewData, source: Channel): Promise<Partial<IReview>> {
    try {
      let normalized: Partial<IReview> = {
        channel: source,
        isApproved: false,
        isPublic: false,
        submittedAt: new Date(),
        reviewCategory: []
      };

      switch (source) {
        case 'hostaway': {
          const hostawayData = reviewData as HostawayReviewData;
          normalized = {
            ...normalized,
            externalId: `hostaway-${hostawayData.id}`,
            type: toReviewType(hostawayData.type),
            status: toReviewStatus(hostawayData.status),
            rating: hostawayData.rating,
            publicReview: hostawayData.publicReview || '',
            reviewCategory: hostawayData.reviewCategory || [],
            submittedAt: new Date(hostawayData.submittedAt || Date.now()),
            guestName: hostawayData.guestName || '',
            listingName: hostawayData.listingName || '',
            listingId: this.extractListingId(hostawayData.listingName || '')
          };
          break;
        }

        case 'google': {
          const googleData = reviewData as GoogleReviewData;
          const googleTime = googleData.time || Math.floor(Date.now() / 1000);
          normalized = {
            ...normalized,
            externalId: `google-${googleData.place_id || 'unknown'}-${googleTime}`,
            type: 'guest-to-property',
            status: 'published',
            rating: googleData.rating,
            publicReview: googleData.text || googleData.publicReview || '',
            reviewCategory: [],
            submittedAt: new Date(googleTime * 1000),
            guestName: googleData.author_name || googleData.guestName || 'Google User',
            listingName: googleData.listingName || 'Google Review',
            listingId: `google-${googleData.place_id || 'unknown'}`,
            channel: 'google',
            isApproved: true, // Auto-approve Google reviews
            isPublic: true,
            sentimentScore: this.calculateSentiment(googleData.text || '')
          };
          break;
        }

        case 'airbnb': {
          const airbnbData = reviewData as AirbnbReviewData;
          normalized = {
            ...normalized,
            externalId: `airbnb-${airbnbData.id}`,
            type: 'guest-to-property',
            status: toReviewStatus(airbnbData.status),
            rating: airbnbData.rating,
            publicReview: airbnbData.comments || airbnbData.publicReview || '',
            reviewCategory: airbnbData.categories || [],
            submittedAt: new Date(airbnbData.created_at || airbnbData.submittedAt || Date.now()),
            guestName: airbnbData.reviewer?.name || 'Anonymous',
            listingName: airbnbData.listing?.name || 'Airbnb Listing',
            listingId: `airbnb-${airbnbData.listing_id || 'unknown'}`
          };
          break;
        }

        case 'booking':
        case 'direct': {
          const bookingData = reviewData as BookingReviewData;
          normalized = {
            ...normalized,
            externalId: `${source}-${bookingData.id || Date.now()}`,
            type: 'guest-to-property',
            status: toReviewStatus(bookingData.status),
            rating: bookingData.rating,
            publicReview: bookingData.publicReview || bookingData.text || '',
            reviewCategory: bookingData.reviewCategory || bookingData.categories || [],
            submittedAt: new Date(bookingData.submittedAt || bookingData.created_at || Date.now()),
            guestName: bookingData.guestName || bookingData.author_name || 'Guest',
            listingName: bookingData.listingName || `${source.charAt(0).toUpperCase() + source.slice(1)} Review`,
            listingId: `${source}-${bookingData.listing_id || 'unknown'}`
          };
          break;
        }

        default:
  logger.error(`Unsupported source: ${source}`, reviewData);
  throw new Error(`Unsupported source: ${source}`);
      }

      // Clean and validate data
      normalized.publicReview = this.sanitizeReviewText(normalized.publicReview || '');
      normalized.guestName = this.sanitizeGuestName(normalized.guestName || '');
      
      // Calculate sentiment score (simplified)
      normalized.sentimentScore = this.calculateSentiment(normalized.publicReview || '');
      
      // Auto-approval rules
      if (source === 'hostaway' && reviewData.status === 'published') {
        normalized.isApproved = true;
        normalized.isPublic = true;
      }

      return normalized;
    } catch (error) {
      logger.error('Error normalizing review data:', error);
      throw new Error(`Failed to normalize review data from ${source}`);
    }
  }


  static async processBatchReviews(reviews: ReviewData[], source: Channel): Promise<{
    processed: number;
    imported: number;
    updated: number;
    errors: Array<{ review: string; error: string }>;
  }> {
    const results = {
      processed: 0,
      imported: 0,
      updated: 0,
      errors: [] as Array<{ review: string; error: string }>
    };

    for (const reviewData of reviews) {
      try {
        const normalized = await this.normalizeReviewData(reviewData, source);
        
        // Ensure listing exists
        if (normalized.listingId && normalized.listingName) {
          await this.ensureListingExists(
            normalized.listingId,
            normalized.listingName,
            source
          );
        }

        // Get externalId for upsert and error reporting

        // Upsert review
        const existing = await Review.findOne({
          externalId: normalized.externalId,
          channel: source
        });

        if (existing) {
          // Update existing
          await Review.findByIdAndUpdate(existing._id, normalized);
          results.updated++;
        } else {
          // Create new
          await Review.create(normalized);
          results.imported++;
        }

        // Update listing statistics
        if (normalized.listingId) {
          await this.updateListingStats(normalized.listingId);
        }

        results.processed++;
      } catch (error) {
        // Use externalId or id for error reporting
        const reviewIdentifier = reviewData.externalId || 
            (reviewData.id ? `${source}-${reviewData.id}` : `unknown-${Date.now()}`);
        
        results.errors.push({
            review: reviewIdentifier.toString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        logger.error('Error processing review:', error);
        }
    }

    return results;
  }


  static async getReviewsWithInsights(filters: Record<string, unknown>) {
    const reviews = await Review.find(filters)
      .sort({ submittedAt: -1 })
      .lean();

    // Add insights to each review
    const reviewsWithInsights = reviews.map((review) => ({
      ...review,
      insights: {
        sentiment: this.calculateSentiment(review.publicReview),
        lengthCategory: this.categorizeReviewLength(review.publicReview),
        hasIssues: this.detectIssues(review as IReview),
        recommendation: this.generateRecommendation(review as IReview),
        similarReviews: []
      }
    }));

    return reviewsWithInsights;
  }


  // Update other methods that use IReview
  static async analyzeReviewPatterns(listingId?: string) {
    const matchStage: Record<string, unknown> = { isApproved: true };
    if (listingId) { matchStage.listingId = listingId; }

    const patterns = await Review.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            month: { $month: '$submittedAt' },
            year: { $year: '$submittedAt' }
          },
          totalReviews: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          commonWords: { $push: '$publicReview' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Extract common words (simplified)
    const allWords = patterns.flatMap(p => 
      p.commonWords.flatMap((text: string) => 
        text.toLowerCase().split(/\W+/).filter(word => word.length > 3)
      )
    );

    const wordFrequency = allWords.reduce((acc: Record<string, number>, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});

    const commonWords = Object.entries(wordFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));

    return {
      monthlyPatterns: patterns,
      commonWords,
      seasonalTrends: this.analyzeSeasonality(patterns)
    };
  }

  static async generateReport(listingId: string, timeframe: string) {
    const [reviews, listing] = await Promise.all([
      Review.find({ 
        listingId,
        submittedAt: this.getDateRange(timeframe)
      }).lean(),
      Listing.findOne({ listingId }).lean()
    ]);

    if (!listing) {
      throw new Error('Listing not found');
    }

    const report = {
      listing: {
        name: listing.name,
        address: listing.address,
        totalReviews: listing.totalReviews,
        averageRating: listing.averageRating
      },
      timeframe: {
        start: this.getDateRange(timeframe).$gte,
        end: new Date()
      },
      summary: {
        totalReviews: reviews.length,
        averageRating: reviews.length > 0
          ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
          : 0,
        ratingDistribution: this.getRatingDistribution(reviews),
        categoryBreakdown: this.getCategoryBreakdown(reviews)
      },
      trends: {
        monthly: await this.getMonthlyTrends(listingId),
        category: await this.getCategoryTrends(listingId)
      },
      insights: {
        strengths: this.identifyStrengths(reviews),
        areasForImprovement: this.identifyImprovementAreas(reviews),
        recommendations: this.generateBusinessRecommendations(reviews)
      },
      notableReviews: {
        best: reviews.filter(r => r.rating === 5).slice(0, 5),
        critical: reviews.filter(r => r.rating && r.rating <= 2).slice(0, 5)
      }
    };

    return report;
  }

  private static extractListingId(listingName: string): string {
    return listingName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private static sanitizeReviewText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000);
  }

  private static sanitizeGuestName(name: string): string {
    return name
      .replace(/[^a-zA-Z\s]/g, '')
      .trim()
      .slice(0, 100);
  }

  private static calculateSentiment(text: string): number {
    const positiveWords = ['excellent', 'great', 'wonderful', 'amazing', 'perfect', 'love', 'best', 'fantastic'];
    const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'horrible', 'disappointed', 'worst', 'disgusting'];
    
    const words = text.toLowerCase().split(/\W+/);
    let score = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) { score += 1; }
      if (negativeWords.includes(word)) { score -= 1; }
    });
    
    // Normalize to -1 to 1 range
    return Math.max(-1, Math.min(1, score / 10));
  }

  private static categorizeReviewLength(text: string): string {
    const length = text.length;
    if (length < 50) { return 'short'; }
    if (length < 200) { return 'medium'; }
    return 'detailed';
  }

  // Update the detectIssues method to accept IReview
  private static detectIssues(review: IReview): string[] {
    const issues: string[] = [];
    
    if (review.rating && review.rating <= 2) {
      issues.push('low_rating');
    }
    
    review.reviewCategory?.forEach(cat => {
      if (cat.rating <= 5) {
        issues.push(`low_${cat.category}`);
      }
    });
    
    const negativeKeywords = ['dirty', 'broken', 'noise', 'rude', 'expensive', 'small', 'old'];
    negativeKeywords.forEach(keyword => {
      if (review.publicReview.toLowerCase().includes(keyword)) {
        issues.push(`mentions_${keyword}`);
      }
    });
    
    return issues;
  }

   // Update the generateRecommendation method to accept IReview
  private static generateRecommendation(review: IReview): string {
    if (review.rating === 5) {
      return 'Thank guest and encourage sharing';
    }
    if (review.rating && review.rating <= 2) {
      return 'Follow up with guest and address concerns';
    }
    if (review.publicReview.length > 200) {
      return 'Consider featuring this detailed review';
    }
    return 'Standard acknowledgment';
  }

  
  private static async ensureListingExists(listingId: string, listingName: string, source: string) {
    const existing = await Listing.findOne({ listingId });
    if (!existing) {
      await Listing.create({
        listingId,
        name: listingName,
        address: 'TBD',
        city: 'TBD',
        country: 'TBD',
        source,
        totalReviews: 0,
        averageRating: 0
      });
    }
  }

  private static async updateListingStats(listingId: string) {
    const reviews = await Review.find({ 
      listingId, 
      isApproved: true,
      rating: { $ne: null }
    });

    const stats = {
      totalReviews: reviews.length,
      averageRating: reviews.length > 0
        ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
        : 0,
      lastReviewSync: new Date()
    };

    await Listing.findOneAndUpdate(
      { listingId },
      stats,
      { upsert: true }
    );
  }

  private static getDateRange(timeframe: string) {
    const now = new Date();
    const start = new Date();
    
    switch (timeframe) {
      case '7d': start.setDate(now.getDate() - 7); break;
      case '30d': start.setDate(now.getDate() - 30); break;
      case '90d': start.setDate(now.getDate() - 90); break;
      case '1y': start.setFullYear(now.getFullYear() - 1); break;
      default: start.setDate(now.getDate() - 30);
    }
    
    return { $gte: start, $lte: now };
  }

  private static getRatingDistribution(reviews: IReview[]) {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      if (review.rating && review.rating >= 1 && review.rating <= 5) {
        distribution[review.rating as keyof typeof distribution]++;
      }
    });
    return distribution;
  }

  private static getCategoryBreakdown(reviews: IReview[]) {
    const categories = new Map<string, { sum: number; count: number }>();
    
    reviews.forEach(review => {
      review.reviewCategory?.forEach(cat => {
        const current = categories.get(cat.category) || { sum: 0, count: 0 };
        current.sum += cat.rating;
        current.count++;
        categories.set(cat.category, current);
      });
    });
    
    return Array.from(categories.entries()).map(([category, data]) => ({
      category,
      averageRating: data.sum / data.count,
      count: data.count
    }));
  }

  private static async getMonthlyTrends(listingId: string) {
    return Review.aggregate([
      { $match: { listingId, isApproved: true } },
      {
        $group: {
          _id: {
            year: { $year: '$submittedAt' },
            month: { $month: '$submittedAt' }
          },
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
  }

  private static async getCategoryTrends(listingId: string) {
    return Review.aggregate([
      { $match: { listingId, isApproved: true } },
      { $unwind: '$reviewCategory' },
      {
        $group: {
          _id: {
            category: '$reviewCategory.category',
            year: { $year: '$submittedAt' },
            month: { $month: '$submittedAt' }
          },
          avgRating: { $avg: '$reviewCategory.rating' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.category': 1, '_id.year': 1, '_id.month': 1 } }
    ]);
  }

  private static identifyStrengths(reviews: IReview[]): string[] {
    const strengths: string[] = [];
    const categoryAverages = this.getCategoryBreakdown(reviews);
    
    categoryAverages.forEach(({ category, averageRating }) => {
      if (averageRating >= 9) {
        strengths.push(`${category} (${averageRating.toFixed(1)}/10)`);
      }
    });

    const positiveWords = ['excellent', 'great', 'wonderful', 'amazing', 'perfect'];
    const wordCounts = new Map<string, number>();
    
    reviews.forEach(review => {
      positiveWords.forEach(word => {
        if (review.publicReview.toLowerCase().includes(word)) {
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      });
    });
    
    wordCounts.forEach((count, word) => {
      if (count >= reviews.length * 0.3) {
        strengths.push(`Frequently described as "${word}"`);
      }
    });
    
    return strengths.slice(0, 5);
  }

  private static identifyImprovementAreas(reviews: IReview[]): string[] {
    const areas: string[] = [];
    const categoryAverages = this.getCategoryBreakdown(reviews);
    
    categoryAverages.forEach(({ category, averageRating }) => {
      if (averageRating <= 6) {
        areas.push(`${category} (${averageRating.toFixed(1)}/10)`);
      }
    });
    
    const negativePatterns = [
      { pattern: 'clean', issue: 'cleanliness concerns' },
      { pattern: 'noise', issue: 'noise issues' },
      { pattern: 'small', issue: 'space concerns' },
      { pattern: 'old', issue: 'outdated facilities' }
    ];
    
    negativePatterns.forEach(({ pattern, issue }) => {
      const mentions = reviews.filter(r => 
        r.publicReview.toLowerCase().includes(pattern)
      ).length;
      
      if (mentions >= reviews.length * 0.2) {
        areas.push(issue);
      }
    });
    
    return areas.slice(0, 5);
  }

  private static generateBusinessRecommendations(reviews: IReview[]): string[] {
    const recommendations: string[] = [];
    const categoryAverages = this.getCategoryBreakdown(reviews);
    
    // Find lowest category
    const lowestCategory = categoryAverages
      .filter(cat => cat.count >= 5)
      .sort((a, b) => a.averageRating - b.averageRating)[0];
    
    if (lowestCategory && lowestCategory.averageRating < 7) {
      recommendations.push(
        `Priority: Improve ${lowestCategory.category}. Current: ${lowestCategory.averageRating.toFixed(1)}/10`
      );
    }
    
    // Response rate recommendation
    const respondedReviews = reviews.filter(r => r.managerNotes).length;
    const responseRate = (respondedReviews / reviews.length) * 100;
    
    if (responseRate < 50) {
      recommendations.push(
        `Increase response rate to reviews. Current: ${responseRate.toFixed(0)}%`
      );
    }
    
    // Rating trend recommendation
    if (reviews.length >= 10) {
      const recent = reviews
        .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
        .slice(0, 5);
      const older = reviews
        .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
        .slice(5, 10);
      
      const recentAvg = recent.reduce((s, r) => s + (r.rating || 0), 0) / recent.length;
      const olderAvg = older.reduce((s, r) => s + (r.rating || 0), 0) / older.length;
      
      if (recentAvg < olderAvg - 0.5) {
        recommendations.push('Address declining ratings trend');
      }
    }
    
    return recommendations;
  }

  private static analyzeSeasonality(patterns: Array<{
    _id: { month: number; year: number };
    avgRating: number;
  }>) {
    // Simple seasonality analysis
    const monthlyAverages: Record<string, number> = {};
    
    patterns.forEach(pattern => {
      const month = pattern._id.month;
      if (!monthlyAverages[month]) {
        monthlyAverages[month] = 0;
      }
      monthlyAverages[month] += pattern.avgRating;
    });
    
    // Find best and worst months
    const entries = Object.entries(monthlyAverages);
    if (entries.length === 0) { return {}; }
    
    const sorted = entries.sort(([,a], [,b]) => b - a);
    
    return {
      bestMonth: parseInt(sorted[0][0]),
      worstMonth: parseInt(sorted[sorted.length - 1][0]),
      seasonalityScore: sorted[0][1] - sorted[sorted.length - 1][1]
    };
  }
}