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
        submittedAt: '2020-08-21 22:45:14',
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
        submittedAt: '2021-03-15 10:30:00',
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
        submittedAt: '2021-04-22 14:20:00',
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
        submittedAt: '2021-05-10 09:15:00',
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
        submittedAt: '2021-06-05 16:45:00',
        guestName: 'David Brown',
        listingName: 'Luxury Studio - Central London'
      }
    ];
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
      }
    );
  }
}