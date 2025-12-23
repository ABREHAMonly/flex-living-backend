//jest.setup.js in root directory
// Global setup for Jest
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/flex-living-test';
process.env.PORT = '3001';
process.env.GOOGLE_API_KEY = 'test-key-not-empty';

// Suppress console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};