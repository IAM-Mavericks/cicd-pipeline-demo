/**
 * SMS Service Unit Tests
 */

describe('SMSService', () => {
  let smsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    smsService = require('../../services/smsService');
  });

  describe('formatPhoneNumber', () => {
    it('should format phone number starting with 0', () => {
      const result = smsService.formatPhoneNumber('08012345678');
      expect(result).toBe('+2348012345678');
    });

    it('should format phone number without prefix', () => {
      const result = smsService.formatPhoneNumber('8012345678');
      expect(result).toBe('+2348012345678');
    });

    it('should keep already formatted number', () => {
      const result = smsService.formatPhoneNumber('+2348012345678');
      expect(result).toBe('+2348012345678');
    });

    it('should handle phone with spaces', () => {
      const result = smsService.formatPhoneNumber('0801 234 5678');
      expect(result).toBe('+2348012345678');
    });

    it('should handle phone with hyphens', () => {
      const result = smsService.formatPhoneNumber('0801-234-5678');
      expect(result).toBe('+2348012345678');
    });
  });

  describe('isValidPhoneNumber', () => {
    it('should validate correct Nigerian phone numbers', () => {
      expect(smsService.isValidPhoneNumber('08012345678')).toBe(true);
      expect(smsService.isValidPhoneNumber('09012345678')).toBe(true);
      expect(smsService.isValidPhoneNumber('+2348012345678')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(smsService.isValidPhoneNumber('1234567')).toBe(false);
      expect(smsService.isValidPhoneNumber('0701234567')).toBe(false); // Not Nigerian prefix
      expect(smsService.isValidPhoneNumber('invalid')).toBe(false);
    });
  });

  describe('sendOTP', () => {
    it('should send OTP SMS successfully', async () => {
      const result = await smsService.sendOTP('08012345678', '123456', 'John');
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    it('should work without firstName', async () => {
      const result = await smsService.sendOTP('08012345678', '123456');
      
      expect(result.success).toBe(true);
    });
  });

  describe('sendTransactionAlert', () => {
    it('should send transaction alert for debit', async () => {
      const transactionData = {
        type: 'debit',
        amount: 5000,
        currency: 'NGN',
        reference: 'TXN123456'
      };

      const result = await smsService.sendTransactionAlert(
        '08012345678',
        transactionData
      );
      
      expect(result.success).toBe(true);
    });

    it('should send transaction alert for credit', async () => {
      const transactionData = {
        type: 'credit',
        amount: 10000,
        currency: 'NGN',
        reference: 'TXN789012'
      };

      const result = await smsService.sendTransactionAlert(
        '08012345678',
        transactionData
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('sendLoginAlert', () => {
    it('should send login alert', async () => {
      const loginData = {
        location: 'Lagos, Nigeria',
        device: 'Chrome on Windows'
      };

      const result = await smsService.sendLoginAlert(
        '08012345678',
        'John',
        loginData
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('sendAccountLockedAlert', () => {
    it('should send account locked alert', async () => {
      const result = await smsService.sendAccountLockedAlert(
        '08012345678',
        'John',
        'Too many failed login attempts'
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('sendPasswordResetCode', () => {
    it('should send password reset code', async () => {
      const result = await smsService.sendPasswordResetCode(
        '08012345678',
        'ABC123',
        'John'
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('sendNotification', () => {
    it('should send generic notification', async () => {
      const result = await smsService.sendNotification(
        '08012345678',
        'Your transaction is being processed'
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return service status', () => {
      const status = smsService.getStatus();
      
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('primaryProvider');
      expect(status).toHaveProperty('fallbackProvider');
      expect(status).toHaveProperty('hasFallback');
      expect(status).toHaveProperty('developmentMode');
    });
  });

  describe('sendBulkSMS', () => {
    it('should send bulk SMS to multiple recipients', async () => {
      const recipients = [
        { phoneNumber: '08012345678', name: 'John' },
        { phoneNumber: '09012345678', name: 'Jane' }
      ];

      const result = await smsService.sendBulkSMS(recipients, 'Test message');
      
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('successful');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('results');
      expect(result.total).toBe(2);
      expect(result.results.length).toBe(2);
    });

    it('should handle empty recipient list', async () => {
      const result = await smsService.sendBulkSMS([], 'Test message');
      
      expect(result.total).toBe(0);
      expect(result.results.length).toBe(0);
    });
  });
});
