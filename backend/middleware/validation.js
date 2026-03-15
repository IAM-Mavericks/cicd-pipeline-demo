/**
 * Request Validation Middleware
 * Comprehensive input validation and sanitization
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
};

/**
 * Registration Validation Rules
 */
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s-']+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s-']+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('phoneNumber')
    .matches(/^(\+234|0)[7-9][0-1]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
    .custom((value) => {
      const age = (new Date() - new Date(value)) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 18) {
        throw new Error('You must be at least 18 years old to register');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Login Validation Rules
 */
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

/**
 * Transfer Validation Rules
 */
const validateTransfer = [
  body('recipientAccountNumber')
    .matches(/^\d{10}$/)
    .withMessage('Account number must be exactly 10 digits'),
  
  body('amount')
    .isFloat({ min: 1, max: 1000000 })
    .withMessage('Amount must be between ₦1 and ₦1,000,000')
    .custom((value) => {
      if (value % 1 !== 0 && value.toString().split('.')[1]?.length > 2) {
        throw new Error('Amount cannot have more than 2 decimal places');
      }
      return true;
    }),
  
  body('currency')
    .optional()
    .isIn(['NGN', 'USD', 'GBP', 'EUR'])
    .withMessage('Currency must be one of: NGN, USD, GBP, EUR'),
  
  body('narration')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Narration cannot exceed 200 characters')
    .matches(/^[a-zA-Z0-9\s.,!?-]*$/)
    .withMessage('Narration contains invalid characters'),
  
  body('pin')
    .matches(/^\d{4}$/)
    .withMessage('PIN must be exactly 4 digits'),
  
  handleValidationErrors
];

/**
 * Bill Payment Validation Rules
 */
const validateBillPayment = [
  body('provider')
    .notEmpty()
    .withMessage('Provider is required')
    .isIn(['IKEDC', 'EKEDC', 'AEDC', 'PHED', 'IBEDC', 'DSTV', 'GOTV', 'StarTimes', 'MTN', 'GLO', 'AIRTEL', '9MOBILE'])
    .withMessage('Invalid provider'),
  
  body('customerNumber')
    .notEmpty()
    .withMessage('Customer number is required')
    .isLength({ min: 5, max: 20 })
    .withMessage('Customer number must be between 5 and 20 characters'),
  
  body('amount')
    .isFloat({ min: 100, max: 100000 })
    .withMessage('Amount must be between ₦100 and ₦100,000'),
  
  body('pin')
    .matches(/^\d{4}$/)
    .withMessage('PIN must be exactly 4 digits'),
  
  handleValidationErrors
];

/**
 * Airtime Purchase Validation Rules
 */
const validateAirtimePurchase = [
  body('network')
    .isIn(['MTN', 'GLO', 'AIRTEL', '9MOBILE'])
    .withMessage('Invalid network provider'),
  
  body('phoneNumber')
    .matches(/^(\+234|0)[7-9][0-1]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  
  body('amount')
    .isFloat({ min: 50, max: 10000 })
    .withMessage('Amount must be between ₦50 and ₦10,000'),
  
  handleValidationErrors
];

/**
 * OTP Validation Rules
 */
const validateOTP = [
  body('otp')
    .matches(/^\d{6}$/)
    .withMessage('OTP must be exactly 6 digits'),
  
  handleValidationErrors
];

/**
 * PIN Validation Rules
 */
const validatePIN = [
  body('pin')
    .matches(/^\d{4}$/)
    .withMessage('PIN must be exactly 4 digits'),
  
  handleValidationErrors
];

/**
 * Account Number Validation
 */
const validateAccountNumber = [
  param('accountNumber')
    .matches(/^\d{10}$/)
    .withMessage('Account number must be exactly 10 digits'),
  
  handleValidationErrors
];

/**
 * Transaction ID Validation
 */
const validateTransactionId = [
  param('transactionId')
    .isMongoId()
    .withMessage('Invalid transaction ID'),
  
  handleValidationErrors
];

/**
 * Date Range Validation
 */
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (req.query.startDate && new Date(endDate) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Pagination Validation
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

/**
 * Password Change Validation
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Sanitize Request Body
 * Remove any potentially harmful characters
 */
const sanitizeRequest = (req, res, next) => {
  // Remove any null bytes
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(/\0/g, '');
      }
    });
  }
  
  next();
};

module.exports = {
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validateTransfer,
  validateBillPayment,
  validateAirtimePurchase,
  validateOTP,
  validatePIN,
  validateAccountNumber,
  validateTransactionId,
  validateDateRange,
  validatePagination,
  validatePasswordChange,
  sanitizeRequest
};
