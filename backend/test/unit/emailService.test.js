/**
 * Email Service Unit Tests
 */

describe('EmailService', () => {
  let emailService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the module to get a fresh instance
    jest.resetModules();
    emailService = require('../../services/emailService');
  });

  describe('sendOTP', () => {
    it('should send OTP email successfully', async () => {
      const result = await emailService.sendOTP('test@example.com', '123456', 'John');
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    it('should work without firstName', async () => {
      const result = await emailService.sendOTP('test@example.com', '123456');
      
      expect(result).toHaveProperty('success');
      expect(result.success).toBe(true);
    });

    it('should handle 6-digit OTP', async () => {
      const result = await emailService.sendOTP('test@example.com', '999888');
      
      expect(result.success).toBe(true);
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with account number', async () => {
      const result = await emailService.sendWelcomeEmail(
        'test@example.com',
        'John',
        '1234567890'
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('sendTransactionAlert', () => {
    it('should send transaction alert for debit', async () => {
      const transactionData = {
        type: 'debit',
        amount: 5000,
        currency: 'NGN',
        reference: 'TXN123456',
        timestamp: new Date()
      };

      const result = await emailService.sendTransactionAlert(
        'test@example.com',
        transactionData
      );
      
      expect(result.success).toBe(true);
    });

    it('should send transaction alert for credit', async () => {
      const transactionData = {
        type: 'credit',
        amount: 10000,
        currency: 'NGN',
        recipient: 'John Doe',
        narration: 'Salary payment',
        reference: 'TXN789012',
        balance: 50000,
        timestamp: new Date()
      };

      const result = await emailService.sendTransactionAlert(
        'test@example.com',
        transactionData
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('sendLoginAlert', () => {
    it('should send login alert with device info', async () => {
      const loginData = {
        ipAddress: '192.168.1.1',
        location: 'Lagos, Nigeria',
        device: 'Chrome on Windows',
        timestamp: new Date()
      };

      const result = await emailService.sendLoginAlert(
        'test@example.com',
        'John',
        loginData
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email with token', async () => {
      const result = await emailService.sendPasswordReset(
        'test@example.com',
        'John',
        'reset-token-123',
        30
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('sendAccountLockedAlert', () => {
    it('should send account locked alert', async () => {
      const result = await emailService.sendAccountLockedAlert(
        'test@example.com',
        'John',
        'Too many failed login attempts'
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('sendSuspiciousActivityAlert', () => {
    it('should send suspicious activity alert', async () => {
      const result = await emailService.sendSuspiciousActivityAlert(
        'test@example.com',
        'John',
        'Login from unusual location'
      );
      
      expect(result.success).toBe(true);
    });
  });

  describe('stripHTML', () => {
    it('should remove HTML tags from text', () => {
      const html = '<p>Hello <strong>World</strong></p>';
      const result = emailService.stripHTML(html);
      
      expect(result).toBe('Hello World');
    });

    it('should handle text without HTML', () => {
      const text = 'Plain text';
      const result = emailService.stripHTML(text);
      
      expect(result).toBe('Plain text');
    });
  });

  describe('Template Generation', () => {
    it('should generate OTP template', () => {
      const template = emailService.getOTPTemplate('123456', 'John');
      
      expect(template).toContain('123456');
      expect(template).toContain('John');
      expect(template).toContain('10 minutes');
    });

    it('should generate welcome template', () => {
      const template = emailService.getWelcomeTemplate('John', '1234567890');
      
      expect(template).toContain('John');
      expect(template).toContain('1234567890');
      expect(template).toContain('Welcome');
    });

    it('should generate transaction alert template', () => {
      const data = {
        type: 'debit',
        amount: 5000,
        currency: 'NGN',
        reference: 'TXN123',
        timestamp: new Date()
      };
      const template = emailService.getTransactionAlertTemplate(data);
      
      expect(template).toContain('5,000');
      expect(template).toContain('TXN123');
      expect(template).toContain('Debited');
    });
  });
});
