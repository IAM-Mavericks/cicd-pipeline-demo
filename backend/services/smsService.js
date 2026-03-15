/**
 * SMS Service
 * Handles SMS delivery for OTP and notifications
 * Supports multiple providers: Twilio, Termii with automatic fallback
 */

class SMSService {
  constructor() {
    this.twilioClient = null;
    this.termiiConfig = null;
    this.primaryProvider = null;
    this.fallbackProvider = null;
    this.isConfigured = false;
    this.initialize();
  }

  /**
   * Initialize SMS providers
   */
  initialize() {
    try {
      // Initialize Twilio
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        try {
          const twilio = require('twilio');
          this.twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          );
          this.primaryProvider = 'twilio';
          console.log('✅ Twilio SMS configured as primary provider');
        } catch (error) {
          console.log('⚠️  Twilio package not installed. Run: npm install twilio');
        }
      }

      // Initialize Termii
      if (process.env.TERMII_API_KEY) {
        this.termiiConfig = {
          apiKey: process.env.TERMII_API_KEY,
          senderId: process.env.TERMII_SENDER_ID || 'SznPay',
          channel: process.env.TERMII_CHANNEL || 'generic'
        };
        
        if (!this.primaryProvider) {
          this.primaryProvider = 'termii';
          console.log('✅ Termii SMS configured as primary provider');
        } else {
          this.fallbackProvider = 'termii';
          console.log('✅ Termii SMS configured as fallback provider');
        }
      }

      // Check if at least one provider is configured
      if (this.primaryProvider) {
        this.isConfigured = true;
      } else {
        console.log('⚠️  SMS service not configured - missing provider credentials');
        console.log('   Set TWILIO_* or TERMII_* environment variables');
      }
    } catch (error) {
      console.error('SMS service initialization error:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Format phone number to international format
   */
  formatPhoneNumber(phoneNumber) {
    // Remove any spaces or special characters
    let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // If starts with 0, replace with +234 (Nigeria)
    if (cleaned.startsWith('0')) {
      cleaned = '+234' + cleaned.substring(1);
    }
    
    // If doesn't start with +, add +234
    if (!cleaned.startsWith('+')) {
      cleaned = '+234' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Send SMS via Twilio
   */
  async sendViaTwilio(phoneNumber, message) {
    try {
      if (!this.twilioClient) {
        throw new Error('Twilio client not initialized');
      }

      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      return {
        success: true,
        provider: 'twilio',
        messageId: result.sid,
        status: result.status
      };
    } catch (error) {
      console.error('Twilio SMS error:', error);
      return {
        success: false,
        provider: 'twilio',
        error: error.message
      };
    }
  }

  /**
   * Send SMS via Termii
   */
  async sendViaTermii(phoneNumber, message) {
    try {
      if (!this.termiiConfig) {
        throw new Error('Termii not configured');
      }

      const axios = require('axios');
      
      const payload = {
        to: phoneNumber,
        from: this.termiiConfig.senderId,
        sms: message,
        type: 'plain',
        channel: this.termiiConfig.channel,
        api_key: this.termiiConfig.apiKey
      };

      const response = await axios.post(
        'https://api.ng.termii.com/api/sms/send',
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.message_id) {
        return {
          success: true,
          provider: 'termii',
          messageId: response.data.message_id,
          status: response.data.message
        };
      } else {
        throw new Error(response.data.message || 'Unknown error');
      }
    } catch (error) {
      console.error('Termii SMS error:', error.response?.data || error.message);
      return {
        success: false,
        provider: 'termii',
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Send SMS with automatic fallback
   */
  async sendSMS(phoneNumber, message) {
    try {
      // Development mode
      if (!this.isConfigured) {
        console.log('='.repeat(60));
        console.log('[DEV MODE] SMS would be sent:');
        console.log(`To: ${phoneNumber}`);
        console.log(`Message: ${message}`);
        console.log('='.repeat(60));
        return {
          success: true,
          dev: true,
          provider: 'development',
          message: 'SMS logged in development mode'
        };
      }

      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      // Try primary provider
      let result;
      if (this.primaryProvider === 'twilio') {
        result = await this.sendViaTwilio(formattedPhone, message);
      } else if (this.primaryProvider === 'termii') {
        result = await this.sendViaTermii(formattedPhone, message);
      }

      // If primary fails and fallback exists, try fallback
      if (!result.success && this.fallbackProvider) {
        console.log(`Primary provider (${this.primaryProvider}) failed, trying fallback (${this.fallbackProvider})`);
        
        if (this.fallbackProvider === 'twilio') {
          result = await this.sendViaTwilio(formattedPhone, message);
        } else if (this.fallbackProvider === 'termii') {
          result = await this.sendViaTermii(formattedPhone, message);
        }
      }

      return result;
    } catch (error) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send OTP SMS
   */
  async sendOTP(phoneNumber, otp, firstName = '') {
    const message = `Hi ${firstName ? firstName + ', ' : ''}Your SznPay verification code is: ${otp}. Valid for 10 minutes. Never share this code.`;
    return await this.sendSMS(phoneNumber, message);
  }

  /**
   * Send transaction alert SMS
   */
  async sendTransactionAlert(phoneNumber, transactionData) {
    const { type, amount, currency, reference } = transactionData;
    const action = type === 'credit' ? 'credited with' : 'debited';
    
    const message = `SznPay: Your account has been ${action} ${currency} ${amount.toLocaleString()}. Ref: ${reference}. If not you, contact support immediately.`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  /**
   * Send login alert SMS
   */
  async sendLoginAlert(phoneNumber, firstName, loginData) {
    const { location, device } = loginData;
    const message = `Hi ${firstName}, new login detected on your SznPay account from ${device} in ${location}. If not you, secure your account immediately.`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  /**
   * Send account locked alert SMS
   */
  async sendAccountLockedAlert(phoneNumber, firstName, reason) {
    const message = `Hi ${firstName}, your SznPay account has been locked due to: ${reason}. Contact support at support@dotpay.ng for assistance.`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  /**
   * Send password reset SMS
   */
  async sendPasswordResetCode(phoneNumber, resetCode, firstName = '') {
    const message = `Hi ${firstName ? firstName + ', ' : ''}Your SznPay password reset code is: ${resetCode}. Valid for 30 minutes. Never share this code.`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  /**
   * Send generic notification SMS
   */
  async sendNotification(phoneNumber, message) {
    // Prepend SznPay branding
    const brandedMessage = `SznPay: ${message}`;
    return await this.sendSMS(phoneNumber, brandedMessage);
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phoneNumber) {
    // Nigerian phone number validation
    const nigerianPattern = /^(\+234|0)[7-9][0-1]\d{8}$/;
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    return nigerianPattern.test(cleaned);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      primaryProvider: this.primaryProvider,
      fallbackProvider: this.fallbackProvider,
      hasFallback: !!this.fallbackProvider,
      developmentMode: !this.isConfigured
    };
  }

  /**
   * Test SMS delivery
   */
  async testSMS(phoneNumber) {
    const testMessage = 'SznPay: This is a test message to verify SMS delivery is working correctly.';
    return await this.sendSMS(phoneNumber, testMessage);
  }

  /**
   * Send bulk SMS (for notifications)
   */
  async sendBulkSMS(recipients, message) {
    const results = [];
    
    for (const recipient of recipients) {
      const result = await this.sendSMS(recipient.phoneNumber, message);
      results.push({
        phoneNumber: recipient.phoneNumber,
        name: recipient.name,
        ...result
      });
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return {
      total: recipients.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Get SMS delivery cost estimate (Termii specific)
   */
  async getCostEstimate(phoneNumber) {
    try {
      if (!this.termiiConfig) {
        return { error: 'Termii not configured' };
      }

      const axios = require('axios');
      const response = await axios.get(
        `https://api.ng.termii.com/api/check/dnd?api_key=${this.termiiConfig.apiKey}&phone_number=${this.formatPhoneNumber(phoneNumber)}`
      );

      return response.data;
    } catch (error) {
      console.error('Cost estimate error:', error);
      return { error: error.message };
    }
  }
}

// Create singleton instance
const smsService = new SMSService();

module.exports = smsService;
