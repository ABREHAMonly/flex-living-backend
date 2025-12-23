//src/config/env.ts
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.join(__dirname, `../../${envFile}`) });

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000'),
  
  // MongoDB
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/flex-living',
  
  // Hostaway API
  HOSTAWAY_ACCOUNT_ID: process.env.HOSTAWAY_ACCOUNT_ID || '61148',
  HOSTAWAY_API_KEY: process.env.HOSTAWAY_API_KEY || 'test-mock-key',
  HOSTAWAY_API_URL: process.env.HOSTAWAY_API_URL || 'https://api.hostaway.com/v1',
  
  // Google Places API
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
  GOOGLE_PLACES_URL: process.env.GOOGLE_PLACES_URL || 'https://maps.googleapis.com/maps/api/place',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};