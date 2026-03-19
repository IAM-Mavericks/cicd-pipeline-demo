/**
 * Jest Configuration
 * Test framework setup for SznPay backend
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directory
  roots: ['<rootDir>'],

  // Test match patterns
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/**/*.spec.js',
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js'
  ],

  // Coverage directory
  coverageDirectory: 'coverage',

  // Use V8 native coverage
  coverageProvider: 'v8',

  // Focus coverage on critical, currently-tested modules
  collectCoverageFrom: [
    'services/billPaymentService.js',
    'services/transactionEngine.js',
    'services/monitoringService.js',
    'services/emailService.js',
    'services/smsService.js',
    'routes/authRoutes.js',
    'routes/billPaymentRoutes.js',
    'routes/monitoringRoutes.js'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },

  // Global setup — runs once before all tests
  globalSetup: '<rootDir>/test/globalSetup.js',
  globalTeardown: '<rootDir>/test/globalTeardown.js',
  globalSetup: '<rootDir>/test/globalSetup.js',
  globalTeardown: '<rootDir>/test/globalTeardown.js',
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],

  // Module paths
  modulePaths: ['<rootDir>'],

  // Clear mocks between tests
  clearMocks: true,

  // Reset mocks between tests
  resetMocks: false, // keeps mock implementations between tests

  // Restore mocks between tests
  restoreMocks: true,

  // Skip tests that require external services or ZKP build files
  testPathIgnorePatterns: [
    '/node_modules/',
    'test/integration/solvency',
    'test/zkp_kyc.test.js',
    'test/solvency.test.js',
    'test/zkpAiTest.js',
  ],
  // Run serially to avoid MongoDB connection conflicts
  runInBand: true,
  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 60000, // MongoMemoryServer needs longer on CI

  // Transform files with babel-jest
  transform: {
    '^.+\\.js$': 'babel-jest',
  },

  // By default, node_modules are not transformed, but we need to transform uuid
  transformIgnorePatterns: [
    '/node_modules/(?!uuid)/',
  ],

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@models/(.*)$': '<rootDir>/models/$1',
    '^@utils/(.*)$': '<rootDir>/utils/$1',
    '^.*/services/billPaymentService$': '<rootDir>/services/__mocks__/billPaymentService.js'
  }
};
