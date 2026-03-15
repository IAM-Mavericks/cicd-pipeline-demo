const validator = require('validator');

/**
 * User validation functions
 */
const validateUserRegistration = (data) => {
  const errors = [];

  // Email validation
  if (!data.email || !validator.isEmail(data.email)) {
    errors.push('Valid email is required');
  }

  // Password validation
  if (!data.password || data.password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Name validation
  if (!data.firstName || data.firstName.trim().length < 2) {
    errors.push('First name is required and must be at least 2 characters');
  }

  if (!data.lastName || data.lastName.trim().length < 2) {
    errors.push('Last name is required and must be at least 2 characters');
  }

  // Phone validation
  if (!data.phoneNumber || !validator.isMobilePhone(data.phoneNumber, 'any')) {
    errors.push('Valid phone number is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateUserLogin = (data) => {
  const errors = [];

  if (!data.email || !validator.isEmail(data.email)) {
    errors.push('Valid email is required');
  }

  if (!data.password || data.password.trim().length === 0) {
    errors.push('Password is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Payment validation functions
 */
const validatePaymentData = (data) => {
  const errors = [];

  // Amount validation
  if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
    errors.push('Valid amount is required');
  }

  // Currency validation
  if (!data.currency || !['NGN', 'USD', 'EUR'].includes(data.currency.toUpperCase())) {
    errors.push('Valid currency is required (NGN, USD, EUR)');
  }

  // Recipient validation
  if (!data.recipientId && !data.recipientEmail && !data.recipientAccount) {
    errors.push('Recipient information is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateTransferLimits = (amount, userLimits, userBalance) => {
  const errors = [];

  // Balance check
  if (amount > userBalance) {
    errors.push('Insufficient balance');
  }

  // Single transfer limit
  if (userLimits.singleTransferLimit && amount > userLimits.singleTransferLimit) {
    errors.push(`Amount exceeds single transfer limit of ₦${userLimits.singleTransferLimit.toLocaleString()}`);
  }

  // Daily limit check (would need transaction history in real implementation)
  if (userLimits.dailyTransferLimit) {
    // This would check against today's transactions
    // For now, just validate the limit exists
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Security validation functions
 */
const validatePasswordChange = (data) => {
  const errors = [];

  if (!data.currentPassword || data.currentPassword.trim().length === 0) {
    errors.push('Current password is required');
  }

  if (!data.newPassword || data.newPassword.length < 8) {
    errors.push('New password must be at least 8 characters long');
  }

  if (data.newPassword === data.currentPassword) {
    errors.push('New password must be different from current password');
  }

  if (data.newPassword !== data.confirmPassword) {
    errors.push('Password confirmation does not match');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateMFASetup = (data) => {
  const errors = [];

  if (!data.method || !['sms', 'email', 'app'].includes(data.method)) {
    errors.push('Valid MFA method is required (sms, email, app)');
  }

  if (data.method === 'sms' && (!data.phoneNumber || !validator.isMobilePhone(data.phoneNumber, 'any'))) {
    errors.push('Valid phone number is required for SMS MFA');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Chat validation functions
 */
const validateChatMessage = (message) => {
  const errors = [];

  if (!message || typeof message !== 'string') {
    errors.push('Message must be a string');
  }

  if (message && message.trim().length === 0) {
    errors.push('Message cannot be empty');
  }

  if (message && message.length > 1000) {
    errors.push('Message cannot exceed 1000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * General validation functions
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  // Remove potentially dangerous characters
  return validator.escape(input.trim());
};

const validateObjectId = (id) => {
  return validator.isMongoId(id);
};

const validateAmount = (amount, options = {}) => {
  const { min = 0, max = 10000000, currency = 'NGN' } = options;
  const errors = [];

  if (isNaN(amount) || amount < min) {
    errors.push(`Amount must be at least ${min} ${currency}`);
  }

  if (amount > max) {
    errors.push(`Amount cannot exceed ${max} ${currency}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateDateRange = (startDate, endDate) => {
  const errors = [];

  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();

  if (isNaN(start.getTime())) {
    errors.push('Valid start date is required');
  }

  if (isNaN(end.getTime())) {
    errors.push('Valid end date is required');
  }

  if (start > end) {
    errors.push('Start date cannot be after end date');
  }

  if (end > now) {
    errors.push('End date cannot be in the future');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validatePaymentData,
  validateTransferLimits,
  validatePasswordChange,
  validateMFASetup,
  validateChatMessage,
  sanitizeInput,
  validateObjectId,
  validateAmount,
  validateDateRange
};