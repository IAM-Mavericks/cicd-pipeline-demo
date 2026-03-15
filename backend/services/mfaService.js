/**
 * Multi-Factor Authentication Service
 * Handles SMS OTP, Email OTP, and TOTP (Authenticator App)
 * Implements adaptive authentication based on risk
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const twilio = require('twilio');
const nodemailer = require('nodemailer');
require('dotenv').config();

class MFAService {
  constructor() {
    this.otpExpiry = 10 * 60 * 1000; // 10 minutes
    this.maxAttempts = 3;
    this.otpStorage = new Map(); // In production, use Redis
  }

  /**
   * Generate SMS/Email OTP
   * @param {string} userId - User ID
   * @param {string} type - 'sms' or 'email'
   * @returns {Object} - OTP details
   */
  async generateOTP(userId, type = 'sms') {
    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + this.otpExpiry;

    // Store OTP (in production, use Redis with TTL)
    const otpKey = `${userId}_${type}`;
    this.otpStorage.set(otpKey, {
      code: otp,
      expiresAt,
      attempts: 0,
      type,
      createdAt: Date.now()
    });

    return {
      success: true,
      otp, // In production, don't return this - send via SMS/Email
      expiresAt,
      message: `OTP sent to your ${type}`
    };
  }

  /**
   * Verify SMS/Email OTP
   * @param {string} userId - User ID
   * @param {string} code - OTP code
   * @param {string} type - 'sms' or 'email'
   * @returns {Object} - Verification result
   */
  async verifyOTP(userId, code, type = 'sms') {
    const otpKey = `${userId}_${type}`;
    const otpData = this.otpStorage.get(otpKey);

    if (!otpData) {
      return {
        success: false,
        error: 'No OTP found. Please request a new one.'
      };
    }

    // Check if expired
    if (Date.now() > otpData.expiresAt) {
      this.otpStorage.delete(otpKey);
      return {
        success: false,
        error: 'OTP has expired. Please request a new one.'
      };
    }

    // Check max attempts
    if (otpData.attempts >= this.maxAttempts) {
      this.otpStorage.delete(otpKey);
      return {
        success: false,
        error: 'Maximum attempts exceeded. Please request a new OTP.'
      };
    }

    // Verify code
    if (otpData.code !== code) {
      otpData.attempts++;
      this.otpStorage.set(otpKey, otpData);

      return {
        success: false,
        error: `Invalid OTP. ${this.maxAttempts - otpData.attempts} attempts remaining.`
      };
    }

    // Success - remove OTP
    this.otpStorage.delete(otpKey);

    return {
      success: true,
      message: 'OTP verified successfully'
    };
  }

  /**
   * Generate TOTP secret for authenticator app
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @returns {Object} - Secret and QR code
   */
  async generateTOTPSecret(userId, email) {
    const secret = speakeasy.generateSecret({
      name: `SznPay (${email})`,
      issuer: 'SznPay',
      length: 32
    });

    // Generate QR code for easy scanning
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return {
      success: true,
      secret: secret.base32, // Store this in user's database
      qrCode: qrCodeUrl,
      manualEntry: secret.base32,
      message: 'Scan QR code with your authenticator app'
    };
  }

  /**
   * Verify TOTP code from authenticator app
   * @param {string} secret - User's TOTP secret
   * @param {string} token - 6-digit code from app
   * @returns {Object} - Verification result
   */
  verifyTOTP(secret, token) {
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps before/after for clock drift
    });

    if (verified) {
      return {
        success: true,
        message: 'Authenticator code verified'
      };
    }

    return {
      success: false,
      error: 'Invalid authenticator code'
    };
  }

  /**
   * Determine if MFA is required based on risk assessment
   * @param {Object} context - Request context
   * @returns {Object} - MFA requirement decision
   */
  async assessMFARequirement(context) {
    const {
      userId,
      action,
      amount,
      deviceFingerprint,
      ipAddress,
      location,
      userHistory
    } = context;

    let riskScore = 0;
    const riskFactors = [];

    // High-value transaction
    if (amount && amount > 100000) {
      riskScore += 30;
      riskFactors.push('High transaction amount');
    }

    // New device
    if (deviceFingerprint && !userHistory?.trustedDevices?.includes(deviceFingerprint)) {
      riskScore += 25;
      riskFactors.push('Unrecognized device');
    }

    // New location
    if (location && !this.isKnownLocation(location, userHistory?.locations)) {
      riskScore += 20;
      riskFactors.push('Unusual location');
    }

    // Unusual time
    const hour = new Date().getHours();
    if (hour < 6 || hour > 23) {
      riskScore += 15;
      riskFactors.push('Unusual time of day');
    }

    // Sensitive action
    const sensitiveActions = ['transfer', 'withdrawal', 'settings_change', 'add_beneficiary'];
    if (sensitiveActions.includes(action)) {
      riskScore += 20;
      riskFactors.push('Sensitive operation');
    }

    // Determine MFA requirement
    let mfaRequired = false;
    let mfaMethod = 'none';

    if (riskScore >= 50) {
      mfaRequired = true;
      mfaMethod = 'totp'; // Require authenticator app for high risk
    } else if (riskScore >= 30) {
      mfaRequired = true;
      mfaMethod = 'sms'; // SMS OTP for medium risk
    }

    return {
      mfaRequired,
      mfaMethod,
      riskScore,
      riskLevel: riskScore >= 50 ? 'high' : riskScore >= 30 ? 'medium' : 'low',
      riskFactors,
      message: mfaRequired
        ? `Additional verification required (${mfaMethod.toUpperCase()})`
        : 'No additional verification needed'
    };
  }

  /**
   * Check if location is known
   * @param {Object} location - Current location
   * @param {Array} knownLocations - User's known locations
   * @returns {boolean}
   */
  isKnownLocation(location, knownLocations = []) {
    if (!knownLocations.length) return false;

    // Simple city/country check
    return knownLocations.some(known =>
      known.city === location.city && known.country === location.country
    );
  }

  /**
   * Send OTP via SMS (integration point)
   * @param {string} phoneNumber - Phone number
   * @param {string} otp - OTP code
   * @returns {Promise<Object>}
   */
  async sendSMS(phoneNumber, otp) {
    // TODO: Integrate with SMS gateway (Twilio, Termii, etc.)
    const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    try {
      const message = await client.messages.create({
        body: `SznPay Verification Code: ${otp}. Do not share this code.`,
        to: phoneNumber, // Text this number
        from: process.env.TWILIO_PHONE_NUMBER, // From a valid Twilio number
      });

      console.log(`📱 SMS sent to ${phoneNumber}: ${message.sid}`);
      return {
        success: true,
        message: `OTP sent to ${phoneNumber}`
      };
    } catch (error) {
      console.error('Twilio SMS Error:', error);
      // Fallback for dev/mock
      return { success: false, error: 'Failed to send SMS' };
    }
  }

  /**
   * Send OTP via Email (integration point)
   * @param {string} email - Email address
   * @param {string} otp - OTP code
   * @returns {Promise<Object>}
   */
  async sendEmail(email, otp) {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.sendgrid.net',
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER || process.env.SMTP_USER,
        pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS,
      },
    });

    try {
      const info = await transporter.sendMail({
        from: '"SznPay Security" <security@sznpay.com>', // sender address
        to: email, // list of receivers
        subject: "Verification Code", // Subject line
        text: `Your SznPay verification code is: ${otp}`, // plain text body
        html: `<b>Your SznPay verification code is: ${otp}</b>`, // html body
      });

      console.log(`📧 Email sent to ${email}: ${info.messageId}`);
      return {
        success: true,
        message: `OTP sent to ${email}`
      };
    } catch (error) {
      console.error('Nodemailer Error:', error);
      return { success: false, error: 'Failed to send email' };
    }
  }

  /**
   * Generate backup codes for account recovery
   * @param {string} userId - User ID
   * @returns {Array<string>} - Backup codes
   */
  generateBackupCodes(count = 10) {
    const codes = [];

    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }

    return codes;
  }

  /**
   * Verify backup code
   * @param {string} userId - User ID
   * @param {string} code - Backup code
   * @param {Array} userBackupCodes - User's backup codes from database
   * @returns {Object}
   */
  verifyBackupCode(userId, code, userBackupCodes) {
    const codeIndex = userBackupCodes.findIndex(c => c.code === code && !c.used);

    if (codeIndex === -1) {
      return {
        success: false,
        error: 'Invalid or already used backup code'
      };
    }

    // Mark code as used (update in database)
    return {
      success: true,
      codeIndex,
      message: 'Backup code verified. Please set up MFA again.',
      remainingCodes: userBackupCodes.filter(c => !c.used).length - 1
    };
  }
}

module.exports = new MFAService();
