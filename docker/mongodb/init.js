//docker/mongodb/init.js
db = db.getSiblingDB('flex-living');

// Create admin user for the application database
db.createUser({
  user: 'flexuser',
  pwd: 'flexpass123',
  roles: [
    {
      role: 'readWrite',
      db: 'flex-living'
    }
  ]
});

// Create collections
db.createCollection('reviews');
db.createCollection('listings');

// Create indexes
db.reviews.createIndex({ externalId: 1 }, { unique: true });
db.reviews.createIndex({ listingId: 1 });
db.reviews.createIndex({ isApproved: 1 });
db.reviews.createIndex({ isPublic: 1 });
db.reviews.createIndex({ submittedAt: -1 });
db.reviews.createIndex({ rating: -1 });

db.listings.createIndex({ listingId: 1 }, { unique: true });
db.listings.createIndex({ googlePlaceId: 1 });

print('✅ MongoDB initialized successfully for Flex Living');