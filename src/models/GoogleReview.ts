// src/models/GoogleReview.ts
import { Schema, model, Document } from 'mongoose';

export interface IGoogleReview extends Document {
  googleId: string; // Combination of place_id + time for uniqueness
  placeId: string; // Google Places place_id
  authorName: string;
  rating: number;
  text: string;
  time: number; // Unix timestamp
  profilePhotoUrl?: string;
  relativeTimeDescription: string;
  language?: string;
  originalLanguage?: string;
  translated?: boolean;
  responseText?: string; // Owner response
  responseTime?: number; // Unix timestamp
  responseRelativeTime?: string;
  isPublic: boolean;
  isApproved: boolean;
  listingId?: string; // Linked to our listing if known
  metadata: {
    fetchedAt: Date;
    lastUpdated: Date;
    source: 'api' | 'manual';
  };
  createdAt: Date;
  updatedAt: Date;
}

const googleReviewSchema = new Schema<IGoogleReview>({
  googleId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  placeId: { 
    type: String, 
    required: true,
    index: true 
  },
  authorName: { type: String, required: true },
  rating: { 
    type: Number, 
    required: true,
    min: 1,
    max: 5,
    index: true 
  },
  text: { type: String, required: true },
  time: { 
    type: Number, 
    required: true,
    index: true 
  },
  profilePhotoUrl: { type: String },
  relativeTimeDescription: { type: String },
  language: { type: String, default: 'en' },
  originalLanguage: { type: String },
  translated: { type: Boolean, default: false },
  responseText: { type: String },
  responseTime: { type: Number },
  responseRelativeTime: { type: String },
  isPublic: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  isApproved: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  listingId: { 
    type: String,
    index: true 
  },
  metadata: {
    fetchedAt: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    source: { 
      type: String, 
      enum: ['api', 'manual'],
      default: 'api'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for optimized queries
googleReviewSchema.index({ placeId: 1, time: -1 });
googleReviewSchema.index({ listingId: 1, isApproved: 1 });
googleReviewSchema.index({ rating: -1, time: -1 });

// Virtual for formatted date
googleReviewSchema.virtual('reviewDate').get(function() {
  return new Date(this.time * 1000);
});

// Virtual for response date
googleReviewSchema.virtual('responseDate').get(function() {
  return this.responseTime ? new Date(this.responseTime * 1000) : null;
});

// Pre-save middleware to update lastUpdated
googleReviewSchema.pre('save', function(next) {
  this.metadata.lastUpdated = new Date();
  next();
});

// Static methods
googleReviewSchema.statics.findByPlaceId = function(placeId: string, limit = 50) {
  return this.find({ placeId })
    .sort({ time: -1 })
    .limit(limit)
    .lean();
};

googleReviewSchema.statics.getPlaceStats = async function(placeId: string) {
  const stats = await this.aggregate([
    { $match: { placeId, isPublic: true } },
    {
      $group: {
        _id: '$placeId',
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        ratingDistribution: {
          $push: '$rating'
        },
        latestReview: { $max: '$time' },
        oldestReview: { $min: '$time' }
      }
    },
    {
      $project: {
        _id: 0,
        placeId: '$_id',
        totalReviews: 1,
        averageRating: { $round: ['$averageRating', 2] },
        ratingBreakdown: {
          5: { $size: { $filter: { input: '$ratingDistribution', as: 'r', cond: { $eq: ['$$r', 5] } } } },
          4: { $size: { $filter: { input: '$ratingDistribution', as: 'r', cond: { $eq: ['$$r', 4] } } } },
          3: { $size: { $filter: { input: '$ratingDistribution', as: 'r', cond: { $eq: ['$$r', 3] } } } },
          2: { $size: { $filter: { input: '$ratingDistribution', as: 'r', cond: { $eq: ['$$r', 2] } } } },
          1: { $size: { $filter: { input: '$ratingDistribution', as: 'r', cond: { $eq: ['$$r', 1] } } } }
        },
        latestReviewDate: { $toDate: { $multiply: ['$latestReview', 1000] } },
        oldestReviewDate: { $toDate: { $multiply: ['$oldestReview', 1000] } }
      }
    }
  ]);
  
  return stats[0] || null;
};

export const GoogleReview = model<IGoogleReview>('GoogleReview', googleReviewSchema);