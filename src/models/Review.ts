//models/Review.ts
import { Schema, model, Document, Types } from 'mongoose';
import { Channel, ReviewType, ReviewStatus, IReview as IReviewBase } from '../types';

export interface IReview extends Omit<IReviewBase, '_id'>, Document {
  _id: Types.ObjectId;
}

const reviewSchema = new Schema<IReview>({
  externalId: { type: String, required: true, unique: true },
  type: { 
    type: String, 
    required: true,
    enum: ['host-to-guest', 'guest-to-host', 'guest-to-property'] as ReviewType[]
  },
  status: {
    type: String,
    required: true,
    enum: ['published', 'unpublished', 'pending', 'archived'] as ReviewStatus[],
    default: 'pending'
  },
  rating: { type: Number, min: 1, max: 5, default: null },
  publicReview: { type: String, required: true },
  reviewCategory: [{
    category: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 10 }
  }],
  submittedAt: { type: Date, required: true },
  guestName: { type: String, required: true },
  listingName: { type: String, required: true },
  listingId: { type: String, required: true, index: true },
  channel: { 
    type: String, 
    required: true, 
    enum: ['hostaway', 'google', 'airbnb', 'booking', 'direct'] as Channel[],
    default: 'hostaway' 
  },
  isApproved: { type: Boolean, default: false, index: true },
  isPublic: { type: Boolean, default: false, index: true },
  managerNotes: { type: String },
  sentimentScore: { type: Number, default: 0, min: -1, max: 1 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
reviewSchema.index({ listingId: 1, isApproved: 1 });
reviewSchema.index({ submittedAt: -1 });
reviewSchema.index({ rating: -1 });
reviewSchema.index({ channel: 1 });
reviewSchema.index({ 'reviewCategory.category': 1 });

// Virtual for average category rating
reviewSchema.virtual('averageCategoryRating').get(function() {
  if (!this.reviewCategory || this.reviewCategory.length === 0) {
    return null;
  }
  const sum = this.reviewCategory.reduce((acc, cat) => acc + cat.rating, 0);
  return sum / this.reviewCategory.length;
});

export const Review = model<IReview>('Review', reviewSchema);