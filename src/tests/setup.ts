//src/tests/setup.ts
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

export const setupTestDatabase = {
  beforeAll: async () => {
    try {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      
      // Override environment variables for tests
      process.env.MONGODB_URI = mongoUri;
      process.env.NODE_ENV = 'test';
      process.env.GOOGLE_API_KEY = 'test-mock-key';
      process.env.HOSTAWAY_API_KEY = 'test-hostaway-key';
      process.env.PORT = '3001';
      process.env.JWT_SECRET = 'test-jwt-secret';
      
      // Disconnect if already connected
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
      
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
      });
      
      console.log('✅ Test MongoDB connected successfully');
    } catch (error) {
      console.error('❌ Test MongoDB connection error:', error);
      throw error;
    }
  },

  afterAll: async () => {
    try {
      // Close connection
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
      }
      if (mongoServer) {
        await mongoServer.stop();
      }
      console.log('✅ Test MongoDB disconnected');
    } catch (error) {
      console.error('❌ Error cleaning up test database:', error);
    }
  },

  beforeEach: async () => {
    try {
      // Clear all collections before each test
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
    } catch (error) {
      console.error('❌ Error clearing test database:', error);
    }
  }
};