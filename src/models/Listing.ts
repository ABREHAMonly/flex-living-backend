// src/models/Listing.ts
import { Schema, model, Document } from 'mongoose';

export interface IListing extends Document {
  listingId: string;
  name: string;
  address: string;
  city: string;
  country: string;
  googlePlaceId?: string;
  totalReviews: number;
  averageRating: number;
  categoryAverages: Map<string, number>;
  lastReviewSync: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const listingSchema = new Schema<IListing>({
  listingId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  googlePlaceId: { type: String },
  totalReviews: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  categoryAverages: { type: Map, of: Number, default: {} },
  lastReviewSync: { type: Date },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

export const Listing = model<IListing>('Listing', listingSchema);