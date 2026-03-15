/**
 * Service Mocks
 * Mock implementations of external services for testing
 */

// Mock Redis Service
const mockRedisService = {
  isReady: jest.fn(() => true),
  connect: jest.fn(() => Promise.resolve()),
  get: jest.fn((key) => Promise.resolve(null)),
  set: jest.fn((key, value, expiry) => Promise.resolve(true)),
  delete: jest.fn((key) => Promise.resolve(true)),
  exists: jest.fn((key) => Promise.resolve(false)),
  setSession: jest.fn((userId, data) => Promise.resolve(true)),
  getSession: jest.fn((userId) => Promise.resolve(null)),
  deleteSession: jest.fn((userId) => Promise.resolve(true)),
  setOTP: jest.fn((userId, otp) => Promise.resolve(true)),
  getOTP: jest.fn((userId) => Promise.resolve(null)),
  deleteOTP: jest.fn((userId) => Promise.resolve(true)),
  trackLoginAttempt: jest.fn((identifier) => Promise.resolve(1)),
  getLoginAttempts: jest.fn((identifier) => Promise.resolve(0)),
  clearLoginAttempts: jest.fn((identifier) => Promise.resolve(true)),
};

// Mock Email Service
const mockEmailService = {
  isConfigured: true,
  sendEmail: jest.fn(() => Promise.resolve({ success: true, messageId: 'test-message-id' })),
  sendOTP: jest.fn(() => Promise.resolve({ success: true })),
  sendWelcomeEmail: jest.fn(() => Promise.resolve({ success: true })),
  sendTransactionAlert: jest.fn(() => Promise.resolve({ success: true })),
  sendLoginAlert: jest.fn(() => Promise.resolve({ success: true })),
  sendPasswordReset: jest.fn(() => Promise.resolve({ success: true })),
  sendAccountLockedAlert: jest.fn(() => Promise.resolve({ success: true })),
  sendSuspiciousActivityAlert: jest.fn(() => Promise.resolve({ success: true })),
};

// Mock SMS Service
const mockSMSService = {
  isConfigured: true,
  sendSMS: jest.fn(() => Promise.resolve({ success: true, messageId: 'test-sms-id' })),
  sendOTP: jest.fn(() => Promise.resolve({ success: true })),
  sendTransactionAlert: jest.fn(() => Promise.resolve({ success: true })),
  sendLoginAlert: jest.fn(() => Promise.resolve({ success: true })),
  sendAccountLockedAlert: jest.fn(() => Promise.resolve({ success: true })),
  sendPasswordResetCode: jest.fn(() => Promise.resolve({ success: true })),
  sendNotification: jest.fn(() => Promise.resolve({ success: true })),
  isValidPhoneNumber: jest.fn((phone) => /^(\+234|0)[7-9][0-1]\d{8}$/.test(phone)),
  getStatus: jest.fn(() => ({
    configured: true,
    primaryProvider: 'mock',
    fallbackProvider: null,
    hasFallback: false
  })),
};

// Mock Monitoring Service
const mockMonitoringService = {
  trackRequest: jest.fn(),
  trackError: jest.fn(),
  getUptime: jest.fn(() => 3600),
  getHealthCheck: jest.fn(() => Promise.resolve({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: { status: 'healthy' },
      redis: { status: 'healthy' }
    }
  })),
  getQuickHealthCheck: jest.fn(() => Promise.resolve({
    status: 'healthy',
    uptime: 3600
  })),
  getMetrics: jest.fn(() => ({
    requests_total: 100,
    requests_errors_total: 5,
    response_time_avg_ms: 50
  })),
};

// Mock MFA Service
const mockMFAService = {
  generateOTP: jest.fn(() => ({ otp: '123456', expiresAt: Date.now() + 600000 })),
  verifyOTP: jest.fn(() => ({ valid: true })),
  generateTOTPSecret: jest.fn(() => ({
    secret: 'JBSWY3DPEHPK3PXP',
    qrCode: 'data:image/png;base64,...'
  })),
  verifyTOTP: jest.fn(() => true),
  generateBackupCodes: jest.fn(() => ['ABC123', 'DEF456']),
  verifyBackupCode: jest.fn(() => true),
  sendOTP: jest.fn(() => Promise.resolve({ success: true })),
};

// Mock Compliance Service
const mockComplianceService = {
  checkKYCLimits: jest.fn(() => ({
    allowed: true,
    tier: 1,
    limits: {
      singleTransaction: 50000,
      dailyLimit: 200000,
      cumulativeBalance: 300000
    }
  })),
  checkAMLCompliance: jest.fn(() => ({
    compliant: true,
    flags: [],
    riskScore: 10
  })),
  logComplianceEvent: jest.fn(() => Promise.resolve()),
  checkNDPRCompliance: jest.fn(() => ({
    compliant: true,
    issues: []
  })),
};

// Mock Device Fingerprint Service
const mockDeviceFingerprintService = {
  generateFingerprint: jest.fn(() => 'device-fingerprint-123'),
  checkDevice: jest.fn(() => ({
    isTrusted: false,
    isNew: true,
    loginCount: 0
  })),
  trackDevice: jest.fn(() => Promise.resolve()),
  checkVelocity: jest.fn(() => ({
    exceeded: false,
    count: 1,
    limit: 10
  })),
};

// Mock Paystack Service
const mockPaystackService = {
  initializeTransaction: jest.fn(() => Promise.resolve({
    success: true,
    data: {
      authorization_url: 'https://checkout.paystack.com/test',
      access_code: 'test-access-code',
      reference: 'test-reference'
    }
  })),
  verifyTransaction: jest.fn(() => Promise.resolve({
    success: true,
    data: {
      status: 'success',
      amount: 10000,
      reference: 'test-reference'
    }
  })),
  verifyBVN: jest.fn(() => Promise.resolve({
    success: true,
    data: {
      first_name: 'Test',
      last_name: 'User',
      dob: '1990-01-01',
      phone: '08012345678'
    }
  })),
};

module.exports = {
  mockRedisService,
  mockEmailService,
  mockSMSService,
  mockMonitoringService,
  mockMFAService,
  mockComplianceService,
  mockDeviceFingerprintService,
  mockPaystackService,
};
