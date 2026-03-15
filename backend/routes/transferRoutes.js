const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const TransferController = require('../controllers/transferController');
const { authenticateToken } = require('../utils/jwt');

// Validate internal ledger transfer request (between ledger accounts by ID)
const validateTransfer = [
  body('fromAccountId').isInt().withMessage('Valid fromAccountId is required'),
  body('toAccountId').isInt().withMessage('Valid toAccountId is required'),
  body('amount').isDecimal({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('reference').optional().isString(),
  body('description').optional().isString(),
  body('metadata').optional().isObject()
];

// Validate bank transfer request (user wallet -> system settlement account)
const validateBankTransfer = [
  body('amount').isDecimal({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('currency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('recipientAccountNumber').isString().notEmpty().withMessage('Recipient account number is required'),
  body('recipientBankCode').isString().notEmpty().withMessage('Recipient bank code is required'),
  body('recipientName').optional().isString(),
  body('reference').optional().isString(),
  body('description').optional().isString(),
  body('metadata').optional().isObject()
];

// Validate FX conversion request (between two of the user's accounts with different currencies)
const validateFxTransfer = [
  body('fromAccountId').isInt().withMessage('Valid fromAccountId is required'),
  body('toAccountId').isInt().withMessage('Valid toAccountId is required'),
  body('amount').isDecimal({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('reference').optional().isString(),
  body('description').optional().isString(),
  body('metadata').optional().isObject()
];

// Protected routes - require authentication
router.post('/transfer', authenticateToken, validateTransfer, TransferController.transfer);
router.post('/transfer/bank', authenticateToken, validateBankTransfer, TransferController.transferToBank);
router.post('/transfer/fx', authenticateToken, validateFxTransfer, TransferController.transferFx);

module.exports = router;