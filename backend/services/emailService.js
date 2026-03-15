/**
 * Email Service
 * Handles all email communications including OTP, notifications, and alerts
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initialize();
  }

  /**
   * Initialize email transporter
   */
  initialize() {
    try {
      const emailConfig = {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      };

      // Only configure if credentials are provided
      if (emailConfig.auth.user && emailConfig.auth.pass) {
        this.transporter = nodemailer.createTransport(emailConfig);
        this.isConfigured = true;
        console.log('✅ Email service configured');
      } else {
        console.log('⚠️  Email service not configured - missing credentials');
      }
    } catch (error) {
      console.error('Email service initialization error:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send email
   */
  async sendEmail(to, subject, html, text = null) {
    try {
      if (!this.isConfigured) {
        console.log('[DEV MODE] Email would be sent to:', to);
        console.log('Subject:', subject);
        console.log('Content:', text || html);
        return { success: true, dev: true };
      }

      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'SznPay'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        text: text || this.stripHTML(html)
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('Email sending error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Strip HTML tags
   */
  stripHTML(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Send OTP Email
   */
  async sendOTP(email, otp, firstName = '') {
    const subject = 'Your SznPay Verification Code';
    const html = this.getOTPTemplate(otp, firstName);
    
    return await this.sendEmail(email, subject, html);
  }

  /**
   * Send Welcome Email
   */
  async sendWelcomeEmail(email, firstName, accountNumber) {
    const subject = 'Welcome to SznPay! 🎉';
    const html = this.getWelcomeTemplate(firstName, accountNumber);
    
    return await this.sendEmail(email, subject, html);
  }

  /**
   * Send Transaction Alert
   */
  async sendTransactionAlert(email, transactionData) {
    const { type, amount, currency, recipient, narration, reference, timestamp } = transactionData;
    const subject = `Transaction Alert: ${currency} ${amount.toLocaleString()} ${type}`;
    const html = this.getTransactionAlertTemplate(transactionData);
    
    return await this.sendEmail(email, subject, html);
  }

  /**
   * Send Login Alert
   */
  async sendLoginAlert(email, firstName, loginData) {
    const { ipAddress, location, device, timestamp } = loginData;
    const subject = 'New Login to Your SznPay Account';
    const html = this.getLoginAlertTemplate(firstName, loginData);
    
    return await this.sendEmail(email, subject, html);
  }

  /**
   * Send Password Reset Email
   */
  async sendPasswordReset(email, firstName, resetToken, expiryMinutes = 30) {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your SznPay Password';
    const html = this.getPasswordResetTemplate(firstName, resetLink, expiryMinutes);
    
    return await this.sendEmail(email, subject, html);
  }

  /**
   * Send Account Locked Alert
   */
  async sendAccountLockedAlert(email, firstName, reason) {
    const subject = 'Important: Your SznPay Account Has Been Locked';
    const html = this.getAccountLockedTemplate(firstName, reason);
    
    return await this.sendEmail(email, subject, html);
  }

  /**
   * Send Suspicious Activity Alert
   */
  async sendSuspiciousActivityAlert(email, firstName, activityDetails) {
    const subject = '⚠️ Suspicious Activity Detected on Your Account';
    const html = this.getSuspiciousActivityTemplate(firstName, activityDetails);
    
    return await this.sendEmail(email, subject, html);
  }

  /**
   * OTP Email Template
   */
  getOTPTemplate(otp, firstName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Verification Code</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName || 'there'},</p>
            <p>Your SznPay verification code is:</p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            
            <p>This code will expire in <strong>10 minutes</strong>.</p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> Never share this code with anyone. SznPay will never ask for your code via phone or email.
            </div>
            
            <p>If you didn't request this code, please ignore this email or contact our support team immediately.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} SznPay. All rights reserved.</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Welcome Email Template
   */
  getWelcomeTemplate(firstName, accountNumber) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .account-info { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .feature-box { background: white; border-left: 4px solid #667eea; padding: 15px; margin: 10px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to SznPay!</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Welcome to the future of banking! Your account has been successfully created.</p>
            
            <div class="account-info">
              <h3>Your Account Details:</h3>
              <p><strong>Account Number:</strong> ${accountNumber}</p>
              <p><strong>Account Type:</strong> SznPay Wallet</p>
            </div>
            
            <h3>What You Can Do:</h3>
            <div class="feature-box">
              💸 <strong>Send Money:</strong> Transfer to any Nigerian bank instantly
            </div>
            <div class="feature-box">
              💡 <strong>Pay Bills:</strong> Electricity, cable TV, airtime, and data
            </div>
            <div class="feature-box">
              🤖 <strong>AI Banking:</strong> Chat with our AI in English or Pidgin
            </div>
            <div class="feature-box">
              🔐 <strong>Secure:</strong> Multi-factor authentication and biometric protection
            </div>
            
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'https://dotpay.ng'}" class="button">Get Started</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} SznPay. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Transaction Alert Template
   */
  getTransactionAlertTemplate(transactionData) {
    const { type, amount, currency, recipient, narration, reference, balance, timestamp } = transactionData;
    const typeEmoji = type === 'credit' ? '💵' : '💸';
    const typeText = type === 'credit' ? 'Credited' : 'Debited';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${type === 'credit' ? '#10b981' : '#ef4444'}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .transaction-details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${typeEmoji} Account ${typeText}</h1>
          </div>
          <div class="content">
            <p>A transaction has been completed on your account.</p>
            
            <div class="transaction-details">
              <div class="detail-row">
                <span><strong>Amount:</strong></span>
                <span>${currency} ${amount.toLocaleString()}</span>
              </div>
              <div class="detail-row">
                <span><strong>Type:</strong></span>
                <span>${typeText}</span>
              </div>
              ${recipient ? `
              <div class="detail-row">
                <span><strong>Recipient:</strong></span>
                <span>${recipient}</span>
              </div>
              ` : ''}
              ${narration ? `
              <div class="detail-row">
                <span><strong>Narration:</strong></span>
                <span>${narration}</span>
              </div>
              ` : ''}
              <div class="detail-row">
                <span><strong>Reference:</strong></span>
                <span>${reference}</span>
              </div>
              <div class="detail-row">
                <span><strong>Time:</strong></span>
                <span>${new Date(timestamp).toLocaleString()}</span>
              </div>
              ${balance !== undefined ? `
              <div class="detail-row">
                <span><strong>Balance:</strong></span>
                <span><strong>${currency} ${balance.toLocaleString()}</strong></span>
              </div>
              ` : ''}
            </div>
            
            <p style="color: #666; font-size: 14px;">If you didn't authorize this transaction, please contact support immediately.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DotPay. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Login Alert Template
   */
  getLoginAlertTemplate(firstName, loginData) {
    const { ipAddress, location, device, timestamp } = loginData;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .login-details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 New Login Detected</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>We detected a new login to your SznPay account.</p>
            
            <div class="login-details">
              <p><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
              <p><strong>Device:</strong> ${device}</p>
              <p><strong>Location:</strong> ${location}</p>
              <p><strong>IP Address:</strong> ${ipAddress}</p>
            </div>
            
            <div class="alert-box">
              <strong>⚠️ Was this you?</strong><br>
              If you recognize this login, you can safely ignore this email.<br>
              If you don't recognize this activity, please secure your account immediately.
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DotPay. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Password Reset Template
   */
  getPasswordResetTemplate(firstName, resetLink, expiryMinutes) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔑 Reset Your Password</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>We received a request to reset your SznPay account password.</p>
            
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            
            <p>This link will expire in <strong>${expiryMinutes} minutes</strong>.</p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong><br>
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </div>
            
            <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:<br>
            ${resetLink}</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DotPay. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Account Locked Template
   */
  getAccountLockedTemplate(firstName, reason) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .alert-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Account Locked</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            
            <div class="alert-box">
              <h3>Your account has been temporarily locked</h3>
              <p><strong>Reason:</strong> ${reason}</p>
            </div>
            
            <p>For your security, we've temporarily restricted access to your SznPay account.</p>
            
            <h3>What to do next:</h3>
            <ol>
              <li>Contact our support team at support@dotpay.ng</li>
              <li>Verify your identity</li>
              <li>Follow the instructions to unlock your account</li>
            </ol>
            
            <p>We're here to help 24/7.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DotPay. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Suspicious Activity Template
   */
  getSuspiciousActivityTemplate(firstName, activityDetails) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Security Alert</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            
            <div class="alert-box">
              <h3>Suspicious Activity Detected</h3>
              <p>${activityDetails}</p>
            </div>
            
            <p>Our security system detected unusual activity on your account.</p>
            
            <h3>Immediate Actions:</h3>
            <ol>
              <li>Review your recent transactions</li>
              <li>Change your password immediately</li>
              <li>Enable two-factor authentication if not already active</li>
              <li>Contact support if you notice unauthorized activity</li>
            </ol>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DotPay. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
