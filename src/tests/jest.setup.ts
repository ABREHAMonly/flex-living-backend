//src\tests\jest.setup.ts
// Global setup for Jest
import mongoose from 'mongoose';

// Suppress console logs during tests
const originalConsole = { ...console };

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'debug').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  Object.assign(console, originalConsole);
  mongoose.disconnect();
});