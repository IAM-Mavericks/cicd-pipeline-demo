/**
 * Multi-Step Transaction Flow Service
 * Implements the 7-step transaction process with explicit user confirmations
 * 
 * CRITICAL SECURITY PRINCIPLE:
 * AI has NO autonomous rights to execute transactions.
 * Every step requires explicit user command and confirmation.
 */

const logger = require('../utils/logger');
const crypto = require('crypto');
const User = require('../models/User');
const { PaystackApi } = require('@paystack/paystack-sdk');
require('dotenv').config();

// Initialize Paystack SDK
const paystack = new PaystackApi(process.env.PAYSTACK_SECRET_KEY || 'sk_test_...');

const mockMode = process.env.MOCK_MODE === 'true';

class TransactionFlowService {
  constructor() {
    // In-memory session store (use Redis in production)
    this.sessions = new Map();

    // Session timeout: 3 minutes
    this.SESSION_TIMEOUT = 3 * 60 * 1000;

    // Transaction states
    this.STATES = {
      INITIATED: 'initiated',
      ACCOUNT_SELECTED: 'account_selected',
      RECIPIENT_PROVIDED: 'recipient_provided',
      RECIPIENT_VERIFIED: 'recipient_verified',
      AMOUNT_PROVIDED: 'amount_provided',
      AMOUNT_CONFIRMED: 'amount_confirmed',
      SECURITY_VERIFIED: 'security_verified',
      COMPLETED: 'completed',
      CANCELLED: 'cancelled',
      TIMEOUT: 'timeout'
    };
  }

  /**
   * Step 1: Initiate transaction
   * User says: "Send money to John" or "Transfer 5000"
   */
  initiateTransaction(userId, intent, entities) {
    const sessionId = this.generateSessionId();

    const session = {
      sessionId,
      userId,
      intent,
      state: this.STATES.INITIATED,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      data: {
        recipientName: entities.recipient || null,
        amount: entities.amount || null,
        sourceAccount: null,
        destinationAccount: null,
        transactionType: null, // 'local' or 'international'
        currency: null,
        fee: 0,
        totalDebit: 0,
        verifiedRecipient: null,
        confirmations: {
          accountSelected: false,
          recipientVerified: false,
          amountConfirmed: false,
          securityVerified: false
        }
      },
      steps: []
    };

    this.sessions.set(sessionId, session);
    this.startSessionTimeout(sessionId);

    // Log transaction initiation
    logger.logSecurityEvent({
      eventType: 'transaction_initiated',
      userId,
      sessionId,
      intent,
      severity: 'low'
    });

    return {
      sessionId,
      state: this.STATES.INITIATED,
      nextStep: 'account_selection',
      message: this.getAccountSelectionPrompt(userId)
    };
  }

  /**
   * Step 2: Account Selection
   * AI asks: "Which account would you like to send from?"
   */
  getAccountSelectionPrompt(userId) {
    // In production, fetch user's actual accounts
    const accounts = this.getUserAccounts(userId);

    let message = 'I can help you send money. Which account would you like to use?\n\n';

    accounts.forEach((account, index) => {
      const emoji = this.getCurrencyEmoji(account.currency);
      message += `${index + 1}. ${emoji} ${account.name} (${account.currency}) - Balance: ${this.formatCurrency(account.balance, account.currency)}\n`;
    });

    message += '\nPlease select an account (reply with the number or currency name)';

    return message;
  }

  /**
   * Get currency emoji
   */
  getCurrencyEmoji(currency) {
    const emojis = {
      NGN: '💰',
      USD: '💵',
      EUR: '💶',
      GBP: '💷'
    };
    return emojis[currency] || '💳';
  }

  /**
   * Handle account selection
   */
  async selectAccount(sessionId, accountChoice) {
    const session = this.getSession(sessionId);
    if (!session) {
      return { error: 'Session expired or invalid' };
    }

    this.updateActivity(sessionId);

    // Validate account choice
    const accounts = this.getUserAccounts(session.userId);
    const selectedAccount = accounts[accountChoice - 1];

    if (!selectedAccount) {
      return {
        error: true,
        message: '❌ Invalid account selection. Please choose a valid account number.'
      };
    }

    // Update session
    session.data.sourceAccount = selectedAccount;
    session.data.currency = selectedAccount.currency;
    session.data.transactionType = selectedAccount.currency === 'NGN' ? 'local' : 'international';
    session.state = this.STATES.ACCOUNT_SELECTED;
    session.data.confirmations.accountSelected = true;

    this.logStep(sessionId, 'account_selected', { account: selectedAccount.name });

    // Build confirmation message
    const transactionTypeMsg = session.data.transactionType === 'local'
      ? 'This will be a local Nigerian transfer.'
      : 'This will be an international transfer.';

    const confirmationMsg = `You've selected your ${selectedAccount.name}.\n${transactionTypeMsg}\n\n`;

    return {
      success: true,
      state: this.STATES.ACCOUNT_SELECTED,
      nextStep: 'recipient_details',
      message: confirmationMsg + this.getRecipientPrompt(session)
    };
  }

  /**
   * Step 3: Request recipient details
   */
  getRecipientPrompt(session) {
    const isLocal = session.data.transactionType === 'local';

    if (isLocal) {
      return '📱 Please provide the recipient\'s 10-digit account number.\n\nYou can type or paste the account number.';
    } else {
      return '🌍 Please provide the recipient\'s international account details:\n\n' +
        '• IBAN or Account Number\n' +
        '• SWIFT/BIC Code\n' +
        '• Bank Name\n' +
        '• Country';
    }
  }

  /**
   * Step 4: Verify recipient account
   */
  async verifyRecipient(sessionId, accountNumber) {
    const session = this.getSession(sessionId);
    if (!session) {
      return { error: 'Session expired or invalid' };
    }

    this.updateActivity(sessionId);

    // Validate account number format
    if (!this.isValidAccountNumber(accountNumber)) {
      return {
        error: true,
        message: '❌ Invalid account number format. Please provide a valid 10-digit account number.'
      };
    }

    // Call bank verification API (mock for now)
    const verificationResult = await this.callBankVerificationAPI(accountNumber);

    if (!verificationResult.success) {
      return {
        error: true,
        message: '❌ Unable to verify account. Please check the account number and try again.'
      };
    }

    // Update session
    session.data.destinationAccount = accountNumber;
    session.data.verifiedRecipient = verificationResult.data;
    session.state = this.STATES.RECIPIENT_PROVIDED;

    this.logStep(sessionId, 'recipient_verified', {
      accountNumber,
      recipientName: verificationResult.data.accountName
    });

    // Display verification results and ask for confirmation
    const message = `✓ Account Verified Successfully\n\n` +
      `📋 Recipient Details:\n` +
      `- Account Number: ${accountNumber}\n` +
      `- Bank Name: ${verificationResult.data.bankName}\n` +
      `- Account Name: ${verificationResult.data.accountName.toUpperCase()}\n\n` +
      `Is this the correct recipient?\n` +
      `Reply 'YES' to continue or 'NO' to enter a different account.`;

    return {
      success: true,
      state: this.STATES.RECIPIENT_PROVIDED,
      nextStep: 'recipient_confirmation',
      verificationData: verificationResult.data,
      message
    };
  }

  /**
   * Handle recipient confirmation
   */
  async confirmRecipient(sessionId, confirmation) {
    const session = this.getSession(sessionId);
    if (!session) {
      return { error: 'Session expired or invalid' };
    }

    this.updateActivity(sessionId);

    const isConfirmed = ['yes', 'y', 'confirm', 'correct', 'proceed'].includes(
      confirmation.toLowerCase().trim()
    );

    if (!isConfirmed) {
      // User wants to re-enter
      session.state = this.STATES.ACCOUNT_SELECTED;
      session.data.destinationAccount = null;
      session.data.verifiedRecipient = null;

      return {
        success: true,
        message: this.getRecipientPrompt(session)
      };
    }

    // Confirmed
    session.state = this.STATES.RECIPIENT_VERIFIED;
    session.data.confirmations.recipientVerified = true;

    this.logStep(sessionId, 'recipient_confirmed', {
      confirmed: true
    });

    return {
      success: true,
      state: this.STATES.RECIPIENT_VERIFIED,
      nextStep: 'amount_request',
      message: this.getAmountPrompt(session)
    };
  }

  /**
   * Step 5: Request amount
   */
  getAmountPrompt(session) {
    const account = session.data.sourceAccount;
    const recipient = session.data.verifiedRecipient;

    return `💰 How much would you like to send to ${recipient.accountName}?\n\n` +
      `Available Balance: ${this.formatCurrency(account.balance, account.currency)}\n` +
      `Daily Limit Remaining: ${this.formatCurrency(account.dailyLimit, account.currency)}\n\n` +
      `Please enter the amount (e.g., 5000 or 5,000).`;
  }

  /**
   * Handle amount input and validation
   */
  async validateAmount(sessionId, amount) {
    const session = this.getSession(sessionId);
    if (!session) {
      return { error: 'Session expired or invalid' };
    }

    this.updateActivity(sessionId);

    // Parse amount
    const parsedAmount = this.parseAmount(amount);

    if (parsedAmount <= 0) {
      return {
        error: true,
        message: '❌ Invalid amount. Please enter a valid amount greater than zero.'
      };
    }

    // Validate against balance
    const account = session.data.sourceAccount;
    if (parsedAmount > account.balance) {
      return {
        error: true,
        message: `❌ Insufficient balance. Your available balance is ${this.formatCurrency(account.balance, account.currency)}.`
      };
    }

    // Validate against daily limit
    if (parsedAmount > account.dailyLimit) {
      return {
        error: true,
        message: `❌ Amount exceeds daily transaction limit of ${this.formatCurrency(account.dailyLimit, account.currency)}.`
      };
    }

    // Calculate fee
    const fee = this.calculateTransactionFee(parsedAmount, session.data.transactionType);
    const totalDebit = parsedAmount + fee;

    // Check if total debit is within balance
    if (totalDebit > account.balance) {
      return {
        error: true,
        message: `❌ Insufficient balance for transaction. Amount + Fee = ${this.formatCurrency(totalDebit, account.currency)}, but your balance is ${this.formatCurrency(account.balance, account.currency)}.`
      };
    }

    // Update session
    session.data.amount = parsedAmount;
    session.data.fee = fee;
    session.data.totalDebit = totalDebit;
    session.state = this.STATES.AMOUNT_PROVIDED;

    this.logStep(sessionId, 'amount_provided', {
      amount: parsedAmount,
      fee,
      totalDebit
    });

    // Display transaction summary and request confirmation
    const recipient = session.data.verifiedRecipient;
    const newBalance = account.balance - totalDebit;

    const message = `📊 Transaction Summary:\n\n` +
      `From: ${account.name} (${account.currency})\n` +
      `To: ${recipient.accountName.toUpperCase()} - ${recipient.bankName}\n` +
      `Amount: ${this.formatCurrency(parsedAmount, account.currency)}\n` +
      `Transaction Fee: ${this.formatCurrency(fee, account.currency)}\n` +
      `─────────────────────────\n` +
      `Total Debit: ${this.formatCurrency(totalDebit, account.currency)}\n\n` +
      `Remaining Balance: ${this.formatCurrency(newBalance, account.currency)}\n\n` +
      `Type 'CONFIRM' to proceed with this transaction.\n` +
      `Type 'CANCEL' to abort.`;

    return {
      success: true,
      state: this.STATES.AMOUNT_PROVIDED,
      nextStep: 'amount_confirmation',
      summary: {
        amount: parsedAmount,
        fee,
        totalDebit,
        newBalance
      },
      message
    };
  }

  /**
   * Handle amount confirmation
   */
  async confirmAmount(sessionId, confirmation) {
    const session = this.getSession(sessionId);
    if (!session) {
      return { error: 'Session expired or invalid' };
    }

    this.updateActivity(sessionId);

    const isConfirmed = ['confirm', 'yes', 'proceed', 'continue'].includes(
      confirmation.toLowerCase().trim()
    );

    if (!isConfirmed) {
      return {
        error: true,
        message: '❌ Transaction not confirmed. Type \'confirm\' to proceed or \'cancel\' to abort.'
      };
    }

    // Confirmed
    session.state = this.STATES.AMOUNT_CONFIRMED;
    session.data.confirmations.amountConfirmed = true;

    this.logStep(sessionId, 'amount_confirmed', {
      confirmed: true
    });

    return {
      success: true,
      state: this.STATES.AMOUNT_CONFIRMED,
      nextStep: 'security_verification',
      message: this.getSecurityVerificationPrompt(session)
    };
  }

  /**
   * Step 6: Security verification
   */
  getSecurityVerificationPrompt(session) {
    return `🔐 Security Verification Required\n\n` +
      `To complete this transaction, please provide:\n\n` +
      `1. Your 4-digit Transaction PIN\n` +
      `2. OTP (we'll send a code to your registered phone/email)\n\n` +
      `Please enter your 4-digit PIN to continue.`;
  }

  /**
   * Verify transaction PIN
   */
  async verifyPIN(sessionId, pin) {
    const session = this.getSession(sessionId);
    if (!session) {
      return { error: 'Session expired or invalid' };
    }

    this.updateActivity(sessionId);

    // Validate PIN format
    if (!/^\d{4}$/.test(pin)) {
      return {
        error: true,
        message: '❌ Invalid PIN format. Please enter a 4-digit PIN.'
      };
    }

    // Verify PIN (mock for now)
    const pinValid = await this.validateUserPIN(session.userId, pin);

    if (!pinValid) {
      // Log failed attempt
      logger.logSecurityEvent({
        eventType: 'pin_verification_failed',
        userId: session.userId,
        sessionId,
        severity: 'medium'
      });

      return {
        error: true,
        message: '❌ Incorrect PIN. Please try again.'
      };
    }

    // PIN verified, send OTP
    const otpSent = await this.sendOTP(session.userId);

    if (!otpSent) {
      return {
        error: true,
        message: '❌ Failed to send OTP. Please try again.'
      };
    }

    this.logStep(sessionId, 'pin_verified', { success: true });

    return {
      success: true,
      message: `✅ PIN verified.\n\n` +
        `📱 We've sent a 6-digit OTP to your registered phone number ending in ***${this.maskPhone(session.userId)}.\n\n` +
        `Please enter the OTP to complete the transaction.`
    };
  }

  /**
   * Verify OTP
   */
  async verifyOTP(sessionId, otp) {
    const session = this.getSession(sessionId);
    if (!session) {
      return { error: 'Session expired or invalid' };
    }

    this.updateActivity(sessionId);

    // Validate OTP format
    if (!/^\d{6}$/.test(otp)) {
      return {
        error: true,
        message: '❌ Invalid OTP format. Please enter a 6-digit code.'
      };
    }

    // Verify OTP (mock for now)
    const otpValid = await this.validateOTP(session.userId, otp);

    if (!otpValid) {
      // Log failed attempt
      logger.logSecurityEvent({
        eventType: 'otp_verification_failed',
        userId: session.userId,
        sessionId,
        severity: 'medium'
      });

      return {
        error: true,
        message: '❌ Incorrect OTP. Please try again or request a new code.'
      };
    }

    // OTP verified
    session.state = this.STATES.SECURITY_VERIFIED;
    session.data.confirmations.securityVerified = true;

    this.logStep(sessionId, 'security_verified', { success: true });

    return {
      success: true,
      state: this.STATES.SECURITY_VERIFIED,
      nextStep: 'transaction_execution',
      message: '✅ Security verification complete. Processing transaction...'
    };
  }

  /**
   * Step 7: Execute transaction
   */
  async executeTransaction(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) {
      return { error: 'Session expired or invalid' };
    }

    // Verify all confirmations
    const confirmations = session.data.confirmations;
    if (!confirmations.accountSelected || !confirmations.recipientVerified ||
      !confirmations.amountConfirmed || !confirmations.securityVerified) {
      return {
        error: true,
        message: '❌ Transaction cannot be executed. Not all security steps completed.'
      };
    }

    this.updateActivity(sessionId);

    // Generate transaction reference
    const transactionRef = this.generateTransactionReference();

    // Execute transaction (mock for now)
    const result = await this.processTransaction({
      transactionRef,
      userId: session.userId,
      sourceAccount: session.data.sourceAccount.accountNumber,
      destinationAccount: session.data.destinationAccount,
      amount: session.data.amount,
      fee: session.data.fee,
      currency: session.data.currency,
      recipientName: session.data.verifiedRecipient.accountName,
      recipientBank: session.data.verifiedRecipient.bankName
    });

    if (!result.success) {
      // Transaction failed
      logger.logSecurityEvent({
        eventType: 'transaction_failed',
        userId: session.userId,
        sessionId,
        transactionRef,
        error: result.error,
        severity: 'high'
      });

      return {
        error: true,
        message: `❌ Transaction failed: ${result.error}\n\nYour account has not been debited. Please try again or contact support.`
      };
    }

    // Transaction successful
    session.state = this.STATES.COMPLETED;
    session.completedAt = Date.now();

    this.logStep(sessionId, 'transaction_completed', {
      transactionRef,
      success: true
    });

    // Generate receipt
    const receipt = this.generateReceipt(session, transactionRef, result);

    // Clear session after successful completion
    this.clearSession(sessionId);

    return {
      success: true,
      state: this.STATES.COMPLETED,
      transactionRef,
      receipt,
      message: receipt
    };
  }

  /**
   * Generate transaction receipt
   */
  generateReceipt(session, transactionRef, result) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Africa/Lagos'
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Africa/Lagos'
    });

    return `✅ Transaction Successful!\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📄 TRANSACTION RECEIPT\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Reference: ${transactionRef}\n` +
      `Date: ${dateStr} - ${timeStr}\n\n` +
      `From Account: ${session.data.sourceAccount.name}\n` +
      `Account Number: ${this.maskAccountNumber(session.data.sourceAccount.accountNumber)}\n\n` +
      `To: ${session.data.verifiedRecipient.accountName.toUpperCase()}\n` +
      `Bank: ${session.data.verifiedRecipient.bankName}\n` +
      `Account: ${session.data.destinationAccount}\n\n` +
      `Amount Sent: ${this.formatCurrency(session.data.amount, session.data.currency)}\n` +
      `Transaction Fee: ${this.formatCurrency(session.data.fee, session.data.currency)}\n` +
      `Total Debited: ${this.formatCurrency(session.data.totalDebit, session.data.currency)}\n\n` +
      `New Balance: ${this.formatCurrency(result.newBalance, session.data.currency)}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Would you like to:\n` +
      `• Download receipt (PDF)\n` +
      `• Share receipt via email\n` +
      `• Make another transaction\n` +
      `• Return to main menu`;
  }

  /**
   * Cancel transaction
   */
  cancelTransaction(sessionId, reason = 'user_cancelled') {
    const session = this.getSession(sessionId);
    if (!session) {
      return { error: 'Session expired or invalid' };
    }

    session.state = this.STATES.CANCELLED;
    session.cancelledAt = Date.now();
    session.cancellationReason = reason;

    this.logStep(sessionId, 'transaction_cancelled', { reason });

    this.clearSession(sessionId);

    return {
      success: true,
      message: '❌ Transaction cancelled. No charges have been made to your account.'
    };
  }

  /**
   * Helper: Get session
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Check if session has timed out
    const now = Date.now();
    if (now - session.lastActivity > this.SESSION_TIMEOUT) {
      this.handleSessionTimeout(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Helper: Update last activity
   */
  updateActivity(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  /**
   * Helper: Start session timeout
   */
  startSessionTimeout(sessionId) {
    setTimeout(() => {
      const session = this.sessions.get(sessionId);
      if (session && session.state !== this.STATES.COMPLETED &&
        session.state !== this.STATES.CANCELLED) {
        this.handleSessionTimeout(sessionId);
      }
    }, this.SESSION_TIMEOUT);
  }

  /**
   * Helper: Handle session timeout
   */
  handleSessionTimeout(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.state = this.STATES.TIMEOUT;
      session.timeoutAt = Date.now();

      logger.logSecurityEvent({
        eventType: 'transaction_timeout',
        userId: session.userId,
        sessionId,
        severity: 'low'
      });

      this.clearSession(sessionId);
    }
  }

  /**
   * Helper: Log step
   */
  logStep(sessionId, step, data) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.steps.push({
        step,
        timestamp: Date.now(),
        data
      });
    }
  }

  /**
   * Helper: Clear session
   */
  clearSession(sessionId) {
    // In production, archive to database before clearing
    this.sessions.delete(sessionId);
  }

  /**
   * Helper: Generate session ID
   */
  generateSessionId() {
    return `TXN_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Helper: Generate transaction reference
   */
  generateTransactionReference() {
    return `MVP${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Helper: Format currency
   */
  formatCurrency(amount, currency) {
    const symbols = {
      NGN: '₦',
      USD: '$',
      EUR: '€',
      GBP: '£'
    };

    const symbol = symbols[currency] || currency;
    return `${symbol}${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  /**
   * Helper: Parse amount
   */
  parseAmount(amountStr) {
    // Remove commas and currency symbols
    const cleaned = amountStr.replace(/[,₦$€£]/g, '').trim();
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
  }

  /**
   * Helper: Mask account number
   */
  maskAccountNumber(accountNumber) {
    if (!accountNumber) return '****';
    return accountNumber.slice(0, 3) + '****' + accountNumber.slice(-3);
  }

  /**
   * Helper: Mask phone number
   */
  async maskPhone(userId) {
    try {
      const user = await User.findById(userId).select('phoneNumber');
      if (!user || !user.phoneNumber) return '****';
      return user.phoneNumber.slice(-4);
    } catch (error) {
      return '****';
    }
  }

  /**
   * Helper: Validate account number
   */
  isValidAccountNumber(accountNumber) {
    // Nigerian account numbers are typically 10 digits
    return /^\d{10}$/.test(accountNumber);
  }

  /**
   * Helper: Calculate transaction fee
   */
  calculateTransactionFee(amount, transactionType) {
    // Mock fee calculation
    if (transactionType === 'local') {
      // Local: ₦10 + 0.5%
      return 10 + (amount * 0.005);
    } else {
      // International: $5 + 1%
      return 5 + (amount * 0.01);
    }
  }

  /**
   * Get user accounts from database
   */
  async getUserAccounts(userId) {
    try {
      const user = await User.findById(userId).select('accounts');
      if (!user || !user.accounts || user.accounts.length === 0) {
        return [];
      }
      return user.accounts.map(acc => ({
        ...acc.toObject(),
        balance: parseFloat(acc.balance),
        dailyLimit: this.getDailyLimit(acc.type, user.kyc?.tier || 1) // Implement limit logic
      }));
    } catch (error) {
      logger.error(`Error fetching accounts for user ${userId}:`, error);
      return [];
    }
  }

  getDailyLimit(accountType, kycTier) {
    const limits = {
      1: { savings: 50000, current: 100000 },
      2: { savings: 200000, current: 500000 },
      3: { savings: 5000000, current: 10000000 }
    };
    return limits[kycTier]?.[accountType] || 50000;
  }

  /**
   * Call bank verification API with Paystack toggle
   */
  async callBankVerificationAPI(accountNumber, bankCode = '058') { // Assume GTBank or require bankCode
    if (mockMode) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            data: {
              accountNumber,
              accountName: 'John Adebayo Okonkwo',
              bankName: 'Guaranty Trust Bank (GTBank)',
              bankCode: '058'
            }
          });
        }, 1000);
      });
    }

    try {
      // Real Paystack verification requires bank_code; for partial, assume or error
      const response = await paystack.verification.resolveAccountNumber({
        account_number: accountNumber,
        bank_code: bankCode
      });
      return {
        success: true,
        data: {
          accountNumber,
          accountName: response.data.account_name,
          bankName: response.data.bank_name || 'Unknown Bank',
          bankCode
        }
      };
    } catch (error) {
      logger.error('Paystack verification error:', error);
      return {
        success: false,
        error: 'Bank verification failed. Please check account details.'
      };
    }
  }

  /**
   * Validate user PIN from database
   */
  async validateUserPIN(userId, pin) {
    try {
      const user = await User.findById(userId).select('security.transactionPin');
      if (!user || !user.security.transactionPin) {
        return false;
      }
      const isValid = await user.comparePin(pin);
      if (!isValid) {
        logger.logSecurityEvent({
          eventType: 'pin_verification_failed',
          userId,
          severity: 'medium'
        });
      }
      return isValid;
    } catch (error) {
      logger.error(`PIN validation error for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Generate and store OTP
   */
  async sendOTP(userId, method = 'sms') {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      await User.findByIdAndUpdate(userId, {
        'security.pendingOtp': { code: otp, expires, method }
      });

      console.log(`[OTP] Generated for user ${userId} via ${method}: ${otp}`);
      // In production, send via Twilio/Nexmo for SMS or Nodemailer for email
      return true;
    } catch (error) {
      logger.error(`OTP generation error for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Validate OTP from database
   */
  async validateOTP(userId, otp) {
    try {
      const user = await User.findById(userId).select('security.pendingOtp');
      if (!user || !user.security.pendingOtp ||
        user.security.pendingOtp.expires < new Date() ||
        user.security.pendingOtp.code !== otp) {
        return false;
      }

      // Clear OTP after successful validation
      await User.findByIdAndUpdate(userId, { 'security.pendingOtp': null });

      logger.logSecurityEvent({
        eventType: 'otp_verified',
        userId,
        severity: 'low'
      });

      return true;
    } catch (error) {
      logger.error(`OTP validation error for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Process transaction - debit account balance
   */
  async processTransaction(transactionData) {
    try {
      const user = await User.findById(transactionData.userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const account = user.accounts.find(a => a.accountNumber === transactionData.sourceAccount);
      if (!account) {
        return { success: false, error: 'Source account not found' };
      }

      const currentBalance = parseFloat(account.balance);
      const totalDebit = parseFloat(transactionData.amount) + parseFloat(transactionData.fee);

      if (currentBalance < totalDebit) {
        return { success: false, error: 'Insufficient balance' };
      }

      // Debit account
      account.balance = (currentBalance - totalDebit).toFixed(2);
      await user.save();

      // In production, call Paystack/Flutterwave for transfer, log to transactions collection
      if (!mockMode) {
        try {
          // 1. Create Transfer Recipient
          const recipientResponse = await paystack.transfer.recipient.create({
            type: 'nuban',
            name: transactionData.recipientName,
            account_number: transactionData.destinationAccount,
            bank_code: '058', // In a real app, pass this from verification step
            currency: transactionData.currency
          });

          if (!recipientResponse.status) {
            throw new Error('Failed to create transfer recipient: ' + recipientResponse.message);
          }

          const recipientCode = recipientResponse.data.recipient_code;

          // 2. Initiate Transfer
          const transferResponse = await paystack.transfer.initiate({
            source: 'balance',
            reason: `Transfer to ${transactionData.recipientName}`,
            amount: transactionData.amount * 100, // Paystack uses kobo
            recipient: recipientCode,
            reference: transactionData.transactionRef
          });

          if (!transferResponse.status) {
            throw new Error('Transfer initiation failed: ' + transferResponse.message);
          }

          logger.info(`Real transfer initiated: ${transactionData.transactionRef} - paystack_ref: ${transferResponse.data.reference}`);
        } catch (paystackError) {
          // Rollback balance if transfer fails
          account.balance = currentBalance.toFixed(2);
          await user.save();
          throw paystackError;
        }
      }

      logger.logSecurityEvent({
        eventType: 'transaction_completed',
        userId: transactionData.userId,
        transactionRef: transactionData.transactionRef,
        amount: transactionData.amount,
        severity: 'low'
      });

      return {
        success: true,
        transactionId: transactionData.transactionRef,
        newBalance: account.balance
      };
    } catch (error) {
      logger.error('Transaction processing error:', error);
      return { success: false, error: 'Transaction failed due to server error' };
    }
  }
}

const service = new TransactionFlowService();
service.TransactionFlowService = TransactionFlowService;
module.exports = service;
