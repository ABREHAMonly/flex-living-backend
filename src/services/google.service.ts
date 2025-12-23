// src/services/google.service.ts
import axios from 'axios';
import { config } from '../config/env';
import { logger } from '../utils/logger';

interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  profile_photo_url?: string;
  relative_time_description: string;
}

interface GooglePlaceDetails {
  result: {
    place_id: string;
    name: string;
    rating?: number;
    user_ratings_total?: number;
    reviews?: GoogleReview[];
    formatted_address?: string;
    formatted_phone_number?: string;
    website?: string;
  };
  status: string;
}

interface SearchParams {
  [key: string]: string | number | undefined;
}

interface SearchResponse {
  data: {
    status: string;
    candidates?: Array<{
      place_id: string;
      name: string;
      formatted_address?: string;
      rating?: number;
      user_ratings_total?: number;
    }>;
  };
}

export class GoogleReviewService {
  private static readonly PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';
  
  static async getPlaceReviews(placeId: string): Promise<GoogleReview[]> {
  try {
    // Always return mock data in test environment
    if (config.NODE_ENV === 'test') {
      return this.getMockReviews();
    }

    if (!config.GOOGLE_API_KEY || config.GOOGLE_API_KEY === 'test-mock-key' || config.GOOGLE_API_KEY === 'your_google_api_key_here') {
      logger.warn('Using mock data for Google reviews (no API key configured)');
      return this.getMockReviews();
    }

    const response = await axios.get<GooglePlaceDetails>(
      `${this.PLACES_API_URL}/details/json`,
      {
        params: {
          place_id: placeId,
          key: config.GOOGLE_API_KEY,
          fields: 'place_id,name,rating,user_ratings_total,reviews,formatted_address,formatted_phone_number,website'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    if (response.data.status !== 'OK') {
      logger.error(`Google Places API error: ${response.data.status}`, { placeId });
      throw new Error(`Google Places API error: ${response.data.status}`);
    }

    return response.data.result.reviews || [];
   } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching Google reviews:', {
      error: errorMessage,
      placeId,
    });
    
    // Return mock data as fallback
    logger.info('Using mock data as fallback');
    return this.getMockReviews();
  }
}

  static async getPlaceDetails(placeId: string): Promise<GooglePlaceDetails['result']> {
    try {
      if (config.NODE_ENV === 'test' || 
          !config.GOOGLE_API_KEY || 
          config.GOOGLE_API_KEY === 'test-mock-key' ||
          config.GOOGLE_API_KEY === 'your_google_api_key_here') {
        // Return mock place details
        return {
          place_id: placeId,
          name: 'Mock Place',
          rating: 4.5,
          user_ratings_total: 128,
          reviews: this.getMockReviews(),
          formatted_address: '123 Mock Street, Test City'
        };
      }

      const response = await axios.get<GooglePlaceDetails>(
        `${this.PLACES_API_URL}/details/json`,
        {
          params: {
            place_id: placeId,
            key: config.GOOGLE_API_KEY,
            fields: 'place_id,name,rating,user_ratings_total,reviews,formatted_address,formatted_phone_number,website,opening_hours'
          }
        }
      );

      if (response.data.status !== 'OK') {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      return response.data.result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error fetching Google place details:', errorMessage);
      
      if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') {
        // Return mock place details
        return {
          place_id: placeId,
          name: 'Mock Place',
          rating: 4.5,
          user_ratings_total: 128,
          reviews: this.getMockReviews(),
          formatted_address: '123 Mock Street, Test City'
        };
      }
      
      throw new Error('Failed to fetch Google place details');
    }
  }

  static async searchPlace(query: string, location?: string): Promise<Array<{
    place_id: string;
    name: string;
    formatted_address?: string;
    rating?: number;
    user_ratings_total?: number;
  }>> {
    try {
      if (config.NODE_ENV === 'test' || 
          !config.GOOGLE_API_KEY || 
          config.GOOGLE_API_KEY === 'test-mock-key' ||
          config.GOOGLE_API_KEY === 'your_google_api_key_here') {
        logger.info('Using mock search data for Google places');
        return this.getMockSearchResults(query);
      }

      const params: SearchParams = {
        input: query,
        inputtype: 'textquery',
        key: config.GOOGLE_API_KEY,
        fields: 'place_id,name,formatted_address,rating,user_ratings_total'
      };

      if (location) {
        params.locationbias = `circle:5000@${location}`;
      }

      const response = await axios.get<SearchResponse['data']>(
        `${this.PLACES_API_URL}/findplacefromtext/json`,
        { params }
      );

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      return response.data.candidates || [];
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error searching Google places:', errorMessage);
      
      if (config.NODE_ENV === 'development' || config.NODE_ENV === 'test') {
        return this.getMockSearchResults(query);
      }
      
      throw new Error('Failed to search Google places');
    }
  }

  // Mock data for development/testing
  private static getMockReviews(): GoogleReview[] {
    const now = Math.floor(Date.now() / 1000);
    return [
      {
        author_name: 'John Traveler',
        rating: 5,
        text: 'Excellent stay! The apartment was clean, modern, and perfectly located. Staff was very helpful.',
        time: now - 86400 * 7, // 7 days ago
        relative_time_description: 'a week ago',
        profile_photo_url: 'https://lh3.googleusercontent.com/a/default-user'
      },
      {
        author_name: 'Sarah M.',
        rating: 4,
        text: 'Great location and comfortable beds. The kitchen was well-equipped. Would stay again!',
        time: now - 86400 * 14, // 14 days ago
        relative_time_description: '2 weeks ago'
      },
      {
        author_name: 'Mike T.',
        rating: 3,
        text: 'Good value for money. The place was clean but a bit noisy at night due to street traffic.',
        time: now - 86400 * 30, // 30 days ago
        relative_time_description: 'a month ago'
      },
      {
        author_name: 'Emma Wilson',
        rating: 5,
        text: 'Perfect location, amazing views! Everything was exactly as described. Highly recommended.',
        time: now - 86400 * 2, // 2 days ago
        relative_time_description: '2 days ago'
      },
      {
        author_name: 'David Brown',
        rating: 2,
        text: 'Disappointed with the cleanliness. Bathroom needed more attention. Location was good though.',
        time: now - 86400 * 45, // 45 days ago
        relative_time_description: 'a month ago'
      }
    ];
  }

  private static getMockSearchResults(_query: string): Array<{
    place_id: string;
    name: string;
    formatted_address?: string;
    rating?: number;
    user_ratings_total?: number;
  }> {
    return [
      {
        place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
        name: 'Flex Living Shoreditch Heights',
        formatted_address: '29 Shoreditch Heights, London, UK',
        rating: 4.5,
        user_ratings_total: 128
      },
      {
        place_id: 'ChIJd8zQy9iuEmsRwLsayLYlBEg',
        name: 'Luxury Apartments London',
        formatted_address: '123 Luxury Street, London, UK',
        rating: 4.2,
        user_ratings_total: 89
      }
    ];
  }
}