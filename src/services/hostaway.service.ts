//src\services\hostaway.service.ts
import { HostawayReview } from '../types';
import { Review } from '../models/Review';
import { Listing } from '../models/Listing';
import { logger } from '../utils/logger';

export class HostawayService {
  static async fetchReviews(): Promise<HostawayReview[]> {
    // Mock data as per assessment
    return this.getMockReviews();
  }

private static getMockReviews(): HostawayReview[] {
  // Use current date for test environment
  const now = new Date();
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(now.getMonth() - 1);
  
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setMonth(now.getMonth() - 2);
  
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(now.getMonth() - 3);
  
  const fourMonthsAgo = new Date(now);
  fourMonthsAgo.setMonth(now.getMonth() - 4);
  
  const fiveMonthsAgo = new Date(now);
  fiveMonthsAgo.setMonth(now.getMonth() - 5);

  return [
    {
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
      submittedAt: this.formatDateForHostaway(oneMonthAgo),
      guestName: 'Shane Finkelstein',
      listingName: '2B N1 A - 29 Shoreditch Heights'
    },
    {
      id: 7454,
      type: 'guest-to-host',
      status: 'published',
      rating: 4.8,
      publicReview: 'Amazing location and very clean apartment. The host was very responsive.',
      reviewCategory: [
        { category: 'cleanliness', rating: 9 },
        { category: 'communication', rating: 10 },
        { category: 'location', rating: 10 },
        { category: 'check_in', rating: 8 }
      ],
      submittedAt: this.formatDateForHostaway(twoMonthsAgo),
      guestName: 'Maria Rodriguez',
      listingName: '2B N1 A - 29 Shoreditch Heights'
    },
    {
      id: 7455,
      type: 'guest-to-host',
      status: 'published',
      rating: 3.5,
      publicReview: 'Good location but the apartment was a bit noisy at night.',
      reviewCategory: [
        { category: 'cleanliness', rating: 7 },
        { category: 'communication', rating: 6 },
        { category: 'location', rating: 9 },
        { category: 'noise', rating: 4 }
      ],
      submittedAt: this.formatDateForHostaway(threeMonthsAgo),
      guestName: 'John Smith',
      listingName: 'Luxury Studio - Central London'
    },
    {
      id: 7456,
      type: 'guest-to-host',
      status: 'published',
      rating: 5.0,
      publicReview: 'Perfect stay! Everything was exactly as described. Would definitely return.',
      reviewCategory: [
        { category: 'cleanliness', rating: 10 },
        { category: 'communication', rating: 10 },
        { category: 'accuracy', rating: 10 },
        { category: 'value', rating: 9 }
      ],
      submittedAt: this.formatDateForHostaway(fourMonthsAgo),
      guestName: 'Emma Wilson',
      listingName: 'Modern 2BR near Shoreditch'
    },
    {
      id: 7457,
      type: 'guest-to-host',
      status: 'published',
      rating: 2.0,
      publicReview: 'Disappointed with the cleanliness. The bathroom needed proper cleaning.',
      reviewCategory: [
        { category: 'cleanliness', rating: 2 },
        { category: 'communication', rating: 5 },
        { category: 'amenities', rating: 4 }
      ],
      submittedAt: this.formatDateForHostaway(fiveMonthsAgo),
      guestName: 'David Brown',
      listingName: 'Luxury Studio - Central London'
    }
  ];
}

// Helper method to format date for Hostaway API
private static formatDateForHostaway(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

  static async syncReviews(): Promise<{ imported: number; updated: number }> {
  try {
    const reviews = await this.fetchReviews();
    let imported = 0;
    let updated = 0;

    for (const reviewData of reviews) {
      const listingId = this.extractListingId(reviewData.listingName);
      
      // Ensure listing exists
      await this.ensureListingExists(listingId, reviewData.listingName);

      // Prepare review data
      const reviewDoc: Record<string, unknown> = {
        externalId: `hostaway-${reviewData.id}`,
        type: reviewData.type,
        status: reviewData.status,
        rating: reviewData.rating,
        publicReview: reviewData.publicReview,
        reviewCategory: reviewData.reviewCategory,
        submittedAt: new Date(reviewData.submittedAt),
        guestName: reviewData.guestName,
        listingName: reviewData.listingName,
        listingId,
        channel: 'hostaway',
        isApproved: reviewData.status === 'published',
        isPublic: reviewData.status === 'published',
        sentimentScore: 0
      };

      // Check if review exists
      const existingReview = await Review.findOne({ 
        externalId: `hostaway-${reviewData.id}` 
      });

      if (existingReview) {
        // Update existing
        await Review.findOneAndUpdate(
          { externalId: `hostaway-${reviewData.id}` },
          reviewDoc,
          { new: true }
        );
        updated++;
      } else {
        // Create new
        await Review.create(reviewDoc);
        imported++;
      }

      // Update listing statistics
      await this.updateListingStats(listingId);
    }

    logger.info(`Synced reviews: ${imported} imported, ${updated} updated`);
    return { imported, updated };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error syncing Hostaway reviews:', errorMessage);
    throw new Error(`Failed to sync reviews: ${errorMessage}`);
  }
}

  private static extractListingId(listingName: string): string {
    return listingName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private static async ensureListingExists(listingId: string, listingName: string): Promise<void> {
    const existing = await Listing.findOne({ listingId });
    if (!existing) {
      await Listing.create({
        listingId,
        name: listingName,
        address: 'To be updated',
        city: 'London',
        country: 'UK',
        totalReviews: 0,
        averageRating: 0
      });
    }
  }

private static async updateListingStats(listingId: string): Promise<void> {
  const reviews = await Review.find({ 
    listingId, 
    isApproved: true,
    rating: { $ne: null }
  });

  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? reviews.reduce((sum, review) => sum + (review.rating || 0), 0) / totalReviews
    : 0;

  await Listing.findOneAndUpdate(
    { listingId },
    {
      totalReviews,
      averageRating,
      lastReviewSync: new Date()
    },
    { upsert: true } // Add this line
  );
}
}