//src\controllers\reviews.controller.ts
import { Request, Response } from 'express';
import { HostawayService } from '../services/hostaway.service';
import { Review } from '../models/Review';
import { Listing } from '../models/Listing';
import { logger } from '../utils/logger';
import { ReviewQueryParams } from '../types';

export class ReviewController {
  static async getHostawayReviews(req: Request<unknown, unknown, unknown, ReviewQueryParams>, res: Response): Promise<void> {
  try {
    const { 
      listingId, startDate, endDate, minRating, maxRating, 
      category, isApproved, channel, page = '1', limit = '20' 
    } = req.query;

    const filter: Record<string, unknown> = {};
    
    if (listingId) { filter.listingId = listingId; }
    if (isApproved !== undefined) { 
      filter.isApproved = isApproved === 'true' || isApproved === true; 
    }
    if (channel) { filter.channel = channel; }
    
    if (minRating || maxRating) {
      filter.rating = {};
      if (minRating) { (filter.rating as Record<string, unknown>).$gte = parseFloat(minRating as string); }
      if (maxRating) { (filter.rating as Record<string, unknown>).$lte = parseFloat(maxRating as string); }
    }
    
    if (startDate || endDate) {
      filter.submittedAt = {};
      if (startDate) { (filter.submittedAt as Record<string, unknown>).$gte = new Date(startDate); }
      if (endDate) { (filter.submittedAt as Record<string, unknown>).$lte = new Date(endDate); }
    }
    
    if (category) {
      filter['reviewCategory.category'] = category;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Review.countDocuments(filter)
    ]);

    res.json({
      status: 'success',
      data: reviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching reviews:', errorMessage);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch reviews',
      error: process.env.NODE_ENV === 'test' ? errorMessage : undefined
    });
  }
}

  static async syncHostawayReviews(_req: Request, res: Response): Promise<void> {
    try {
      const result = await HostawayService.syncReviews();
      
      res.json({
        status: 'success',
        message: 'Reviews synced successfully',
        data: result
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error syncing reviews:', errorMessage);
      res.status(500).json({
        status: 'error',
        message: 'Failed to sync reviews',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  static async updateReviewStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isApproved, isPublic, managerNotes, status } = req.body;

      const review = await Review.findById(id);
      if (!review) {
        res.status(404).json({
          status: 'error',
          message: 'Review not found'
        });
        return;
      }

      const updates: Record<string, unknown> = {};
      if (isApproved !== undefined) { updates.isApproved = isApproved; }
      if (isPublic !== undefined) { updates.isPublic = isPublic; }
      if (managerNotes !== undefined) { updates.managerNotes = managerNotes; }
      if (status !== undefined) { updates.status = status; }

      const updatedReview = await Review.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );

      res.json({
        status: 'success',
        data: updatedReview
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error updating review:', errorMessage);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update review',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  static async getPublicReviews(req: Request, res: Response): Promise<void> {
    try {
      const { listingId } = req.params;

      const reviews = await Review.find({
        listingId,
        isApproved: true,
        isPublic: true
      }).sort({ submittedAt: -1 }).lean();

      res.json({
        status: 'success',
        data: reviews
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error fetching public reviews:', errorMessage);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch public reviews'
      });
    }
  }

  static async getReviewById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const review = await Review.findById(id);
      if (!review) {
        res.status(404).json({
          status: 'error',
          message: 'Review not found'
        });
        return;
      }

      res.json({
        status: 'success',
        data: review
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error fetching review by ID:', errorMessage);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch review',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  static async deleteReview(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const review = await Review.findById(id);
      if (!review) {
        res.status(404).json({
          status: 'error',
          message: 'Review not found'
        });
        return;
      }

      // Soft delete by marking as archived
      await Review.findByIdAndUpdate(id, {
        status: 'archived',
        isPublic: false,
        isApproved: false
      });

      res.json({
        status: 'success',
        message: 'Review deleted successfully'
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error deleting review:', errorMessage);
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete review',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  static async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const { listingId, timeframe = '30d', channel } = req.query;

      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();
      
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
          startDate = new Date(0); // Beginning of time
          break;
      }

      const filter: Record<string, unknown> = {
        submittedAt: { $gte: startDate, $lte: endDate }
      };
      
      if (listingId) { filter.listingId = listingId; }
      if (channel) { filter.channel = channel; }

      const [
        totalReviews,
        approvedReviews,
        averageRating,
        reviewsByChannel,
        recentReviews
      ] = await Promise.all([
        Review.countDocuments(filter),
        Review.countDocuments({ ...filter, isApproved: true }),
        Review.aggregate([
          { $match: { ...filter, rating: { $ne: null } } },
          { $group: { _id: null, avg: { $avg: '$rating' } } }
        ]),
        Review.aggregate([
          { $match: filter },
          { $group: { _id: '$channel', count: { $sum: 1 } } }
        ]),
        Review.find(filter)
          .sort({ submittedAt: -1 })
          .limit(10)
          .lean()
      ]);

      const stats = {
        totals: {
          all: totalReviews,
          approved: approvedReviews,
          pending: totalReviews - approvedReviews
        },
        averages: {
          rating: averageRating[0]?.avg ? parseFloat(averageRating[0].avg.toFixed(2)) : 0,
          approvalRate: totalReviews > 0 ? (approvedReviews / totalReviews) * 100 : 0
        },
        channels: reviewsByChannel.reduce((acc: Record<string, number>, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        recent: recentReviews,
        timeframe: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          label: timeframe
        }
      };

      res.json({
        status: 'success',
        data: stats
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting dashboard stats:', errorMessage);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get dashboard statistics',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  static async exportReviews(req: Request, res: Response): Promise<void> {
    try {
      const { format = 'json', startDate, endDate, listingId } = req.query;

      const filter: Record<string, unknown> = {};
      if (startDate && typeof startDate === 'string') {
        filter.submittedAt = { $gte: new Date(startDate) };
      }
      if (endDate && typeof endDate === 'string') {
        filter.submittedAt = filter.submittedAt || {};
        (filter.submittedAt as Record<string, unknown>).$lte = new Date(endDate);
      }
      if (listingId && typeof listingId === 'string') {
        filter.listingId = listingId;
      }

      const reviews = await Review.find(filter).lean();

      if (format === 'csv') {
        // Simple CSV export
        const csv = this.generateCSV(reviews);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=reviews.csv');
        res.send(csv);
        return;
      }

      // Default to JSON
      res.json({
        status: 'success',
        data: reviews,
        metadata: {
          count: reviews.length,
          exportedAt: new Date().toISOString()
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error exporting reviews:', errorMessage);
      res.status(500).json({
        status: 'error',
        message: 'Failed to export reviews',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  static async getReviewsSummary(req: Request, res: Response): Promise<void> {
    try {
      const { listingIds } = req.query;

      const filter: Record<string, unknown> = {};
      if (listingIds) {
        const ids = (listingIds as string).split(',');
        filter.listingId = { $in: ids };
      }

      const [summary, listings] = await Promise.all([
        Review.aggregate([
          { $match: filter },
          {
            $group: {
              _id: '$listingId',
              totalReviews: { $sum: 1 },
              averageRating: { $avg: '$rating' },
              approvedReviews: {
                $sum: { $cond: [{ $eq: ['$isApproved', true] }, 1, 0] }
              }
            }
          }
        ]),
        Listing.find(filter.listingId ? { listingId: { $in: (filter.listingId as { $in: string[] }).$in } } : {})
      ]);

      // Combine summary with listing details
      const summaryWithDetails = summary.map(item => {
        const listing = listings.find(l => l.listingId === item._id);
        return {
          listingId: item._id,
          listingName: listing?.name || 'Unknown',
          totalReviews: item.totalReviews,
          averageRating: parseFloat((item.averageRating || 0).toFixed(2)),
          approvalRate: item.totalReviews > 0 
            ? parseFloat(((item.approvedReviews / item.totalReviews) * 100).toFixed(2))
            : 0
        };
      });

      res.json({
        status: 'success',
        data: summaryWithDetails
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting reviews summary:', errorMessage);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get reviews summary',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  static async analyzeReviews(req: Request, res: Response): Promise<void> {
    try {
      const { text, reviewIds, analyzeSentiment = true, extractKeywords = true } = req.body;

      let reviews;
      if (reviewIds && Array.isArray(reviewIds)) {
        reviews = await Review.find({ _id: { $in: reviewIds } }).lean();
      } else if (text) {
        // Analyze single text
        const analysis = {
          sentiment: this.calculateSentiment(text),
          wordCount: text.split(/\s+/).length,
          characterCount: text.length,
          keywords: extractKeywords ? this.extractKeywords(text) : []
        };
        res.json({
          status: 'success',
          data: analysis
        });
        return;
      } else {
        res.status(400).json({
          status: 'error',
          message: 'Either text or reviewIds must be provided'
        });
        return;
      }

      const analysis = reviews.map(review => ({
        reviewId: review._id,
        sentiment: analyzeSentiment ? this.calculateSentiment(review.publicReview) : null,
        wordCount: review.publicReview.split(/\s+/).length,
        characterCount: review.publicReview.length,
        keywords: extractKeywords ? this.extractKeywords(review.publicReview) : [],
        rating: review.rating
      }));

      res.json({
        status: 'success',
        data: analysis
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error analyzing reviews:', errorMessage);
      res.status(500).json({
        status: 'error',
        message: 'Failed to analyze reviews',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  static async getReviewMetadata(_req: Request, res: Response): Promise<void> {
    try {
      const [channels, categories, statuses, types] = await Promise.all([
        Review.distinct('channel'),
        Review.distinct('reviewCategory.category'),
        Review.distinct('status'),
        Review.distinct('type')
      ]);

      res.json({
        status: 'success',
        data: {
          channels,
          categories,
          statuses,
          types,
          counts: {
            total: await Review.countDocuments({}),
            approved: await Review.countDocuments({ isApproved: true }),
            public: await Review.countDocuments({ isPublic: true })
          }
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting review metadata:', errorMessage);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get review metadata',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  // Helper methods
  private static generateCSV(reviews: unknown[]): string {
    if (reviews.length === 0) { return 'No reviews to export'; }

    const headers = [
      'ID', 'Guest Name', 'Rating', 'Review', 'Listing', 
      'Submitted At', 'Channel', 'Status', 'Approved', 'Public'
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = reviews.map((review: any) => [
      review._id,
      `"${review.guestName?.replace(/"/g, '""') || ''}"`,
      review.rating || '',
      `"${review.publicReview?.replace(/"/g, '""') || ''}"`,
      `"${review.listingName?.replace(/"/g, '""') || ''}"`,
      review.submittedAt?.toISOString() || '',
      review.channel || '',
      review.status || '',
      review.isApproved ? 'Yes' : 'No',
      review.isPublic ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
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

  private static extractKeywords(text: string): string[] {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3 && !stopWords.includes(word));
    
    // Count frequencies
    const frequency = words.reduce((acc: Record<string, number>, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});
    
    // Return top 10 keywords
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }
}