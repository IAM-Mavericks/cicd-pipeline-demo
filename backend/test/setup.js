/**
 * Jest Test Setup
 * Global configuration and setup for all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-chars';
// MongoDB Memory Server — global setup handles connection
const mongoose = require('mongoose');

beforeAll(async () => {
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
    });
  }
}, 30000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch (err) {
    // ignore
  }
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      try {
        await collections[key].deleteMany({});
      } catch (err) {
        // ignore
      }
    }
  }
});
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.PG_TEST_ENABLED = 'false';

// Suppress console logs during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Increase timeout for integration tests
jest.setTimeout(60000); // 60s — MongoMemoryServer needs time to download on first run

// Mock environment-specific modules
jest.mock('winston', () => ({
  // No-op for adding colors in tests
  addColors: jest.fn(),

  // Logger factory used by utils/logger.js
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
  })),

  // Minimal format API surface
  format: Object.assign(
    jest.fn(() => jest.fn()), // make winston.format itself callable
    {
      combine: jest.fn(),
      timestamp: jest.fn(() => jest.fn()),
      errors: jest.fn(() => jest.fn()),
      json: jest.fn(() => jest.fn()),
      printf: jest.fn(fn => fn),
      colorize: jest.fn(() => jest.fn()),
      simple: jest.fn(() => jest.fn()),
    }
  ),

  // Transport constructors mocked out
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

// Global test utilities
global.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

global.mockUser = {
  _id: '507f1f77bcf86cd799439011',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  phoneNumber: '08012345678',
  accountNumber: '1234567890',
  pin: '$2a$12$hashed-pin',
  kyc: {
    tier: 1,
    verified: true,
  },
  accounts: [{
    currency: 'NGN',
    balance: 10000,
    accountNumber: '1234567890'
  }],
  mfa: {
    enabled: false
  }
};

global.mockTransaction = {
  _id: '507f1f77bcf86cd799439012',
  userId: '507f1f77bcf86cd799439011',
  type: 'transfer',
  amount: 1000,
  currency: 'NGN',
  status: 'completed',
  reference: 'TXN123456',
  timestamp: new Date(),
};
