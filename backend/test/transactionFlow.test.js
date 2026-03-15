const { TransactionFlowService } = require('../services/transactionFlowService');

// Mock external dependencies
jest.mock('../utils/logger', () => ({
  logSecurityEvent: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
}));

jest.mock('@paystack/paystack-sdk', () => ({
  PaystackApi: jest.fn().mockImplementation(() => ({
    transaction: {
      initialize: jest.fn().mockResolvedValue({ status: true, data: { reference: 'ref_123' } })
    }
  }))
}));

jest.mock('../models/User', () => ({
  findOne: jest.fn()
}));

describe('TransactionFlowService', () => {
  let service;
  let mockSession;
  const userId = 'user_123';

  beforeEach(() => {
    service = new TransactionFlowService();
    // Mock internal methods to isolate logic
    service.getUserAccounts = jest.fn().mockReturnValue([
      { name: 'Savings Account', currency: 'NGN', balance: 50000, dailyLimit: 100000, accountNumber: '1234567890' },
      { name: 'Current Account', currency: 'USD', balance: 1000, dailyLimit: 5000, accountNumber: '0987654321' }
    ]);
    service.callBankVerificationAPI = jest.fn().mockResolvedValue({
      success: true,
      data: { accountName: 'John Doe', bankName: 'GTBank' }
    });
    service.validateUserPIN = jest.fn().mockResolvedValue(true);
    service.sendOTP = jest.fn().mockResolvedValue(true);
    service.validateOTP = jest.fn().mockResolvedValue(true);
    service.processTransaction = jest.fn().mockResolvedValue({
      success: true,
      newBalance: 45000
    });
  });

  describe('initiateTransaction', () => {
    test('should start a new session', () => {
      const result = service.initiateTransaction(userId, 'Send money', {});
      expect(result.sessionId).toBeDefined();
      expect(result.state).toBe(service.STATES.INITIATED);
      expect(service.sessions.has(result.sessionId)).toBe(true);
    });
  });

  describe('selectAccount', () => {
    test('should select valid account', async () => {
      const initInfo = service.initiateTransaction(userId, 'Send money', {});
      const result = await service.selectAccount(initInfo.sessionId, 1);

      expect(result.success).toBe(true);
      expect(result.state).toBe(service.STATES.ACCOUNT_SELECTED);

      const session = service.getSession(initInfo.sessionId);
      expect(session.data.sourceAccount.currency).toBe('NGN');
    });

    test('should reject invalid account choice', async () => {
      const initInfo = service.initiateTransaction(userId, 'Send money', {});
      const result = await service.selectAccount(initInfo.sessionId, 99);

      expect(result.error).toBe(true);
    });
  });

  describe('verifyRecipient', () => {
    test('should verify valid account number', async () => {
      const initInfo = service.initiateTransaction(userId, 'Send money', {});
      await service.selectAccount(initInfo.sessionId, 1);

      const result = await service.verifyRecipient(initInfo.sessionId, '0123456789');

      expect(result.success).toBe(true);
      expect(result.verificationData.accountName).toBe('John Doe');
    });
  });

  describe('validateAmount', () => {
    test('should reject amount significantly greater than balance', async () => {
      const initInfo = service.initiateTransaction(userId, 'Send money', {});
      await service.selectAccount(initInfo.sessionId, 1); // Balance 50000
      await service.verifyRecipient(initInfo.sessionId, '0123456789');

      const result = await service.validateAmount(initInfo.sessionId, '60000');

      expect(result.error).toBe(true);
      expect(result.message).toContain('Insufficient balance');
    });

    test('should accept valid amount', async () => {
      const initInfo = service.initiateTransaction(userId, 'Send money', {});
      await service.selectAccount(initInfo.sessionId, 1); // Balance 50000
      await service.verifyRecipient(initInfo.sessionId, '0123456789');

      const result = await service.validateAmount(initInfo.sessionId, '5000');

      expect(result.success).toBe(true);
      expect(result.nextStep).toBe('amount_confirmation');
    });
  });
});
