//src/controllers/dashboard.controller.ts
import { Request, Response } from 'express';
import { Review } from '../models/Review';
import { Listing } from '../models/Listing';
import { logger } from '../utils/logger';
import { Types } from 'mongoose';

interface CategoryStat {
  category: string;
  averageRating: number;
  count: number;
}

interface PerformanceProperty {
  listingId: string;
  listingName: string;
  address: string;
  totalReviews: number;
  averageRating: number;
  sentimentScore: number;
  categoryAverages: CategoryStat[];
  channelBreakdown: Record<string, number>;
  issues: Issue[];
  recommendations: string[];
  trends: {
    ratingChange: number;
    reviewCountChange: number;
  };
}

interface Issue {
  category: string;
  pattern: string;
  count: number;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

// Define a proper interface for the review data
interface ProcessedReview {
  _id: Types.ObjectId;
  rating: number | null;
  publicReview: string;
  reviewCategory: Array<{ category: string; rating: number }>;
  submittedAt: Date;
  guestName: string;
  listingName: string;
  listingId: string;
  channel: string;
  isApproved: boolean;
  isPublic: boolean;
  managerNotes?: string;
  sentimentScore?: number;
}

export class DashboardController {
  static async getPropertyPerformance(req: Request, res: Response): Promise<void> {
  try {
    const { timeframe = '30d', listingIds, compare: _compare } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get listings filter
    const listingFilter: Record<string, unknown> = { isActive: true };
    if (listingIds && typeof listingIds === 'string') {
      const idArray = listingIds.split(',');
      listingFilter.listingId = { $in: idArray };
    }

    const listings = await Listing.find(listingFilter).lean();
    
    if (listings.length === 0) {
      res.json({
        status: 'success',
        data: {
          timeframe: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          },
          overall: {
            totalProperties: 0,
            totalReviews: 0,
            averageRating: 0,
            topPerforming: [],
            needsAttention: []
          },
          properties: []
        }
      });
      return;
    }

    const performanceData = await Promise.all(
      listings.map(async (listing) => {
        try {
          const reviews = await Review.find({
            listingId: listing.listingId,
            submittedAt: { $gte: startDate, $lte: endDate },
            isApproved: true
          }).lean();

          // Cast to ProcessedReview type to avoid 'any'
          const typedReviews = reviews as unknown as ProcessedReview[];
          const totalReviews = typedReviews.length;
          
          // Calculate average rating, handling null ratings
          const ratings = typedReviews
            .map(review => review.rating)
            .filter((rating): rating is number => rating !== null && rating !== undefined);
          
          const averageRating = ratings.length > 0
            ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
            : 0;

          // Category breakdown
          const categoryStats = new Map<string, { sum: number; count: number }>();
          typedReviews.forEach((review) => {
            (review.reviewCategory || []).forEach((cat) => {
              const current = categoryStats.get(cat.category) || { sum: 0, count: 0 };
              current.sum += cat.rating;
              current.count += 1;
              categoryStats.set(cat.category, current);
            });
          });

          const categoryAverages: CategoryStat[] = Array.from(categoryStats.entries()).map(([category, stats]) => ({
            category,
            averageRating: stats.count > 0 ? stats.sum / stats.count : 0,
            count: stats.count
          }));

          // Sentiment analysis
          let positiveCount = 0;
          let negativeCount = 0;
          
          typedReviews.forEach((review) => {
            const reviewText = (review.publicReview || '').toLowerCase();
            const positiveWords = ['great', 'excellent', 'wonderful', 'amazing', 'perfect', 'love', 'best', 'good'];
            const negativeWords = ['bad', 'poor', 'terrible', 'awful', 'horrible', 'disappointed', 'worst'];
            
            const hasPositive = positiveWords.some(word => reviewText.includes(word));
            const hasNegative = negativeWords.some(word => reviewText.includes(word));
            
            if (hasPositive && !hasNegative) { positiveCount++; }
            if (hasNegative && !hasPositive) { negativeCount++; }
          });

          const sentimentScore = totalReviews > 0
            ? (positiveCount - negativeCount) / totalReviews
            : 0;

          // Channel breakdown
          const channelStats: Record<string, number> = typedReviews.reduce((acc: Record<string, number>, review) => {
            const channel = review.channel || 'unknown';
            acc[channel] = (acc[channel] || 0) + 1;
            return acc;
          }, {});

          // Identify issues
         const issues = DashboardController.identifyIssues(typedReviews);
         const recommendations = DashboardController.generateRecommendations(typedReviews, categoryAverages);

          const property: PerformanceProperty = {
            listingId: listing.listingId,
            listingName: listing.name,
            address: listing.address || 'Unknown',
            totalReviews,
            averageRating: parseFloat(averageRating.toFixed(2)),
            sentimentScore: parseFloat(sentimentScore.toFixed(2)),
            categoryAverages: categoryAverages.sort((a, b) => b.averageRating - a.averageRating),
            channelBreakdown: channelStats,
            issues,
            recommendations,
            trends: {
              ratingChange: 0,
              reviewCountChange: 0
            }
          };

          return property;
        } catch (error) {
          logger.error(`Error processing property ${listing.listingId}:`, error);
          // Return a minimal property object for error cases
          return {
            listingId: listing.listingId,
            listingName: listing.name,
            address: listing.address || 'Unknown',
            totalReviews: 0,
            averageRating: 0,
            sentimentScore: 0,
            categoryAverages: [],
            channelBreakdown: {},
            issues: [],
            recommendations: [],
            trends: {
              ratingChange: 0,
              reviewCountChange: 0
            }
          } as PerformanceProperty;
        }
      })
    );

    // Sort by average rating descending
    const validPerformanceData = performanceData.filter(p => p !== undefined);
    validPerformanceData.sort((a, b) => b.averageRating - a.averageRating);

    // Overall statistics
    const overallStats = {
      totalProperties: validPerformanceData.length,
      totalReviews: validPerformanceData.reduce((sum, property) => sum + property.totalReviews, 0),
      averageRating: validPerformanceData.length > 0
        ? validPerformanceData.reduce((sum, property) => sum + property.averageRating, 0) / validPerformanceData.length
        : 0,
      topPerforming: validPerformanceData.slice(0, 5),
      needsAttention: validPerformanceData.slice(-5).reverse()
    };

    res.json({
      status: 'success',
      data: {
        timeframe: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        overall: overallStats,
        properties: validPerformanceData
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error getting property performance:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get property performance data',
      error: process.env.NODE_ENV === 'test' ? errorMessage : undefined,
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
    });
  }
}

private static identifyIssues(reviews: ProcessedReview[]): Issue[] {
  const issues: Issue[] = [];
  
  if (reviews.length === 0) {
    return issues;
  }

  // Check for low ratings
  const lowRatingReviews = reviews.filter(review => review.rating && review.rating <= 2);
  if (lowRatingReviews.length > 0) {
    issues.push({
      category: 'overall',
      pattern: 'low_rating',
      count: lowRatingReviews.length,
      severity: lowRatingReviews.length >= 2 ? 'high' : 'medium',
      description: `${lowRatingReviews.length} review${lowRatingReviews.length > 1 ? 's' : ''} with rating ≤ 2`
    });
  }

  // Define negative keywords with proper typing
  interface NegativeKeyword {
    keyword: string;
    category: string;
    defaultSeverity: 'high' | 'medium' | 'low';
  }

  const negativeKeywords: NegativeKeyword[] = [
    { keyword: 'dirty', category: 'cleanliness', defaultSeverity: 'high' },
    { keyword: 'noise', category: 'noise', defaultSeverity: 'medium' },
    { keyword: 'broken', category: 'maintenance', defaultSeverity: 'high' },
    { keyword: 'smell', category: 'cleanliness', defaultSeverity: 'medium' },
    { keyword: 'terrible', category: 'overall', defaultSeverity: 'high' },
    { keyword: 'awful', category: 'overall', defaultSeverity: 'high' },
    { keyword: 'horrible', category: 'overall', defaultSeverity: 'high' }
  ];

  // Count occurrences of each negative keyword
  const keywordCounts = new Map<string, number>();
  
  reviews.forEach(review => {
    const text = review.publicReview.toLowerCase();
    negativeKeywords.forEach(({ keyword }) => {
      if (text.includes(keyword)) {
        keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
      }
    });
  });

  // Create issues for keywords that appear
  negativeKeywords.forEach(({ keyword, category, defaultSeverity }) => {
    const count = keywordCounts.get(keyword) || 0;
    if (count > 0) {
      // Determine final severity based on count and default severity
      let finalSeverity: 'high' | 'medium' | 'low';
      if (count >= 2) {
        finalSeverity = 'high';
      } else {
        finalSeverity = defaultSeverity;
      }
      
      issues.push({
        category,
        pattern: keyword,
        count,
        severity: finalSeverity,
        description: `Mention of "${keyword}" in ${count} review${count > 1 ? 's' : ''}`
      });
    }
  });

  // Check for low category ratings
  reviews.forEach(review => {
    (review.reviewCategory || []).forEach(category => {
      if (category.rating <= 5) {
        issues.push({
          category: category.category,
          pattern: 'low_category_rating',
          count: 1,
          severity: category.rating <= 3 ? 'high' : 'medium',
          description: `Low ${category.category} rating: ${category.rating}/10`
        });
      }
    });
  });

  return issues;
}

  private static generateRecommendations(reviews: ProcessedReview[], categoryAverages: CategoryStat[]): string[] {
    const recommendations: string[] = [];
    
    if (categoryAverages.length === 0) { return recommendations; }

    // Find lowest category
    const lowestCategory = categoryAverages
      .filter(cat => cat.count >= 3)
      .sort((a, b) => a.averageRating - b.averageRating)[0];

    if (lowestCategory && lowestCategory.averageRating < 7) {
      recommendations.push(
        `Focus on improving ${lowestCategory.category}. Current average: ${lowestCategory.averageRating.toFixed(1)}/10`
      );
    }

    // Check for response rate
    const negativeReviews = reviews.filter(r => r.rating && r.rating <= 3);
    if (negativeReviews.length > 0) {
      const respondedReviews = reviews.filter(r => r.managerNotes).length;
      const responseRate = (respondedReviews / reviews.length) * 100;
      if (responseRate < 50) {
        recommendations.push(
          `Improve response rate to negative reviews. Current response rate: ${responseRate.toFixed(0)}%`
        );
      }
    }

    return recommendations.slice(0, 3);
  }


  static async getTrends(req: Request, res: Response): Promise<void> {
    try {
      const { listingId, metric: _metric, interval = 'month' } = req.query;

      const matchStage: Record<string, unknown> = { isApproved: true };
      if (listingId && typeof listingId === 'string') {
        matchStage.listingId = listingId;
      }

      let dateFormat: string;
      switch (interval) {
        case 'day':
          dateFormat = '%Y-%m-%d';
          break;
        case 'week':
          dateFormat = '%Y-%U';
          break;
        case 'year':
          dateFormat = '%Y';
          break;
        default:
          dateFormat = '%Y-%m';
      }

      const trends = await Review.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: dateFormat, date: '$submittedAt' } }
            },
            avgRating: { $avg: '$rating' },
            count: { $sum: 1 },
            positiveCount: {
              $sum: {
                $cond: [{ $gte: ['$rating', 4] }, 1, 0]
              }
            },
            negativeCount: {
              $sum: {
                $cond: [{ $lte: ['$rating', 2] }, 1, 0]
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            date: '$_id.date',
            avgRating: { $round: ['$avgRating', 2] },
            totalReviews: '$count',
            positivePercentage: {
              $cond: [
                { $eq: ['$count', 0] },
                0,
                { $round: [{ $multiply: [{ $divide: ['$positiveCount', '$count'] }, 100] }, 2] }
              ]
            },
            negativePercentage: {
              $cond: [
                { $eq: ['$count', 0] },
                0,
                { $round: [{ $multiply: [{ $divide: ['$negativeCount', '$count'] }, 100] }, 2] }
              ]
            }
          }
        },
        { $sort: { date: 1 } }
      ]);

      res.json({
        status: 'success',
        data: trends
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting trends:', errorMessage);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get trends data',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  static async getIssues(req: Request, res: Response): Promise<void> {
    try {
      const { priority = 'all', listingId } = req.query;

      const matchStage: Record<string, unknown> = { isApproved: true };
      if (listingId && typeof listingId === 'string') {
        matchStage.listingId = listingId;
      }

      const reviews = await Review.find(matchStage).lean();
      
      const issues = reviews.flatMap((review) => {
        const issuesFound: Array<{
          type: string;
          priority: 'high' | 'medium' | 'low';
          reviewId: Types.ObjectId;
          listingId: string;
          guestName: string;
          description: string;
          details: string;
          submittedAt: Date;
          category: string;
        }> = [];
        
        // Check for low ratings
        if (review.rating && review.rating <= 2) {
          issuesFound.push({
            type: 'low_rating',
            priority: 'high',
            reviewId: review._id,
            listingId: review.listingId,
            guestName: review.guestName,
            description: `Low rating of ${review.rating}/5`,
            details: review.publicReview,
            submittedAt: review.submittedAt,
            category: 'overall'
          });
        }

        // Check for low category ratings
        review.reviewCategory.forEach((cat: { category: string; rating: number }) => {
          if (cat.rating <= 5) {
            issuesFound.push({
              type: 'category_issue',
              priority: cat.rating <= 3 ? 'high' : 'medium',
              reviewId: review._id,
              listingId: review.listingId,
              guestName: review.guestName,
              description: `Low ${cat.category} rating: ${cat.rating}/10`,
              details: review.publicReview,
              submittedAt: review.submittedAt,
              category: cat.category
            });
          }
        });

        // Check for negative keywords
        const negativeKeywords = [
          { keyword: 'dirty', category: 'cleanliness', priority: 'high' as const },
          { keyword: 'broken', category: 'facilities', priority: 'high' as const },
          { keyword: 'noise', category: 'location', priority: 'medium' as const },
          { keyword: 'rude', category: 'communication', priority: 'high' as const },
          { keyword: 'expensive', category: 'value', priority: 'medium' as const }
        ];

        negativeKeywords.forEach(({ keyword, category, priority }) => {
          if (review.publicReview.toLowerCase().includes(keyword)) {
            issuesFound.push({
              type: 'negative_feedback',
              priority,
              reviewId: review._id,
              listingId: review.listingId,
              guestName: review.guestName,
              description: `Mention of "${keyword}" in feedback`,
              details: review.publicReview,
              submittedAt: review.submittedAt,
              category
            });
          }
        });

        return issuesFound;
      });

      // Filter by priority if specified
      let filteredIssues = issues;
      if (priority !== 'all') {
        filteredIssues = issues.filter(issue => issue.priority === priority);
      }

      // Group by category and listing
      const groupedIssues = filteredIssues.reduce((acc: Record<string, {
        listingId: string;
        category: string;
        issues: typeof filteredIssues;
        count: number;
        priorityCounts: { high: number; medium: number; low: number };
      }>, issue) => {
        const key = `${issue.listingId}-${issue.category}`;
        if (!acc[key]) {
          acc[key] = {
            listingId: issue.listingId,
            category: issue.category,
            issues: [],
            count: 0,
            priorityCounts: { high: 0, medium: 0, low: 0 }
          };
        }
        acc[key].issues.push(issue);
        acc[key].count++;
        
        // Type-safe priority increment
        const priorityKey = issue.priority;
        if (priorityKey === 'high' || priorityKey === 'medium' || priorityKey === 'low') {
          acc[key].priorityCounts[priorityKey]++;
        }
        
        return acc;
      }, {});

      res.json({
        status: 'success',
        data: {
          totalIssues: filteredIssues.length,
          byPriority: {
            high: filteredIssues.filter(i => i.priority === 'high').length,
            medium: filteredIssues.filter(i => i.priority === 'medium').length,
            low: filteredIssues.filter(i => i.priority === 'low').length
          },
          byCategory: Object.values(groupedIssues).sort((a, b) => b.count - a.count),
          recentIssues: filteredIssues
            .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
            .slice(0, 20)
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting issues:', errorMessage);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get issues data',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

static async getQuickStats(req: Request, res: Response): Promise<void> {
  try {
    const { listingId, timeframe = '30d' } = req.query;

    // Calculate date range
    const endDate = new Date();
    let startDate: Date | null = new Date();
    
    switch (timeframe) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'all':
        startDate = null; // No date filter
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const matchStage: Record<string, unknown> = {};
    
    // Only add date filter if startDate is not null (not 'all' timeframe)
    if (startDate !== null) {
      matchStage.submittedAt = { $gte: startDate, $lte: endDate };
    }
    
    if (listingId && typeof listingId === 'string') {
      matchStage.listingId = listingId;
    }

    // Get ALL reviews (not just approved)
    const allReviews = await Review.find(matchStage).lean() as ProcessedReview[];
    
    // Get total listings count
    const totalListings = await Listing.countDocuments({ isActive: true });

    // Helper to safely calculate rating
    const safeRating = (review: ProcessedReview): number => {
      return review.rating || 0;
    };

    // Calculate approved count
    const approvedCount = allReviews.filter(review => review.isApproved).length;

    // Calculate average rating from ALL reviews
    const totalRating = allReviews.reduce((sum: number, review: ProcessedReview) => {
      return sum + safeRating(review);
    }, 0);
    const averageRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;

    // Calculate approval rate
    const approvalRate = allReviews.length > 0 
      ? parseFloat(((approvedCount / allReviews.length) * 100).toFixed(1))
      : 0;

    // Count low rating reviews from ALL reviews
    const lowRatingCount = allReviews.filter(review => {
      const rating = safeRating(review);
      return rating && rating <= 2;
    }).length;

    // Get distinct channels
    const channels = await Review.distinct('channel', matchStage);
    
    // Count pending reviews
    const pendingCount = allReviews.length - approvedCount;

    // Recent reviews (last 7 days) - from ALL reviews
    const last7DaysDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentMatchStage = { 
      ...matchStage, 
      submittedAt: { $gte: last7DaysDate, $lte: endDate }
    };
    const recentReviews = await Review.find(recentMatchStage).lean() as ProcessedReview[];
    const last7DaysCount = recentReviews.length;

    // New unapproved reviews (last 7 days)
    const newUnapprovedCount = recentReviews.filter(review => !review.isApproved).length;

    const stats = {
      totals: {
        reviews: allReviews.length, // Total including unapproved
        approved: approvedCount,
        pending: pendingCount,
        listings: totalListings,
        channels: channels.length
      },
      averages: {
        rating: parseFloat(averageRating.toFixed(2)),
        approvalRate
      },
      recent: {
        last7Days: last7DaysCount,
        newReviews: newUnapprovedCount
      },
      health: {
        responseRate: 0, // Would need managerNotes to calculate
        issues: lowRatingCount
      }
    };

    res.json({
      status: 'success',
      data: stats
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error getting quick stats:', errorMessage);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get quick statistics',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}
}