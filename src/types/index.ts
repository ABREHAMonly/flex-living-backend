import { Types } from 'mongoose';

// src/types/index.ts
export type Channel = 'hostaway' | 'google' | 'airbnb' | 'booking' | 'direct';
export type ReviewType = 'host-to-guest' | 'guest-to-host' | 'guest-to-property';
export type ReviewStatus = 'published' | 'unpublished' | 'pending' | 'archived';

export interface HostawayReview {
  id: number;
  type: string;
  status: string;
  rating: number | null;
  publicReview: string;
  reviewCategory: Array<{
    category: string;
    rating: number;
  }>;
  submittedAt: string;
  guestName: string;
  listingName: string;
}

export interface ReviewQueryParams {
  listingId?: string;
  startDate?: string;
  endDate?: string;
  minRating?: number | string;
  maxRating?: number | string;
  category?: string;
  isApproved?: boolean | string;
  channel?: string;
  page?: number | string;
  limit?: number | string;
}

export interface DashboardQueryParams {
  timeframe?: string;
  listingIds?: string;
  compare?: boolean | string;
  metric?: string;
  interval?: string;
  priority?: string;
}

export interface GoogleQueryParams {
  placeId?: string;
  listingId?: string;
  forceRefresh?: string;
  query?: string;
  location?: string;
}

export interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  relative_time_description: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ErrorResponse {
  status: 'error';
  message: string;
  error?: string;
}

// Add a type for lean review results
export interface LeanReview extends Omit<IReview, 'id'> {
  _id: string;
}

// Add this to your types if needed
export interface IReview {
  _id?: string | Types.ObjectId;  // Allow both string and ObjectId
  externalId: string;
  type: ReviewType;
  status: ReviewStatus;
  rating: number | null;
  publicReview: string;
  reviewCategory: Array<{
    category: string;
    rating: number;
  }>;
  submittedAt: Date;
  guestName: string;
  listingName: string;
  listingId: string;
  channel: Channel;
  isApproved: boolean;
  isPublic: boolean;
  managerNotes?: string;
  sentimentScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessedReview {
  _id: string | Types.ObjectId;
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