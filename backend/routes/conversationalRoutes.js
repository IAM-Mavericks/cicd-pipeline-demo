/**
 * Conversational Banking Routes
 * API endpoints for AI-powered conversational banking
 */

const express = require('express');
const router = express.Router();
const conversationalController = require('../controllers/conversationalBankingController');
const { authenticateToken } = require('../utils/jwt');

const DEV_AUTH_BYPASS_ENABLED = process.env.CONVERSATIONAL_DEV_AUTH === 'true';

// Development mode bypass middleware
const devAuthMiddleware = (req, res, next) => {
  if (!DEV_AUTH_BYPASS_ENABLED) {
    return authenticateToken(req, res, next);
  }

  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      success: false,
      error: 'Conversational dev auth bypass is disabled outside development environments.'
    });
  }

  // In development, create a mock user if no valid token
  if (!req.user) {
    req.user = {
      id: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439011',
      email: 'demo@sznpay.com',
      role: 'user'
    };
  }

  next();
};

/**
 * @route   POST /api/conversational/process
 * @desc    Process natural language banking command
 * @access  Private (Dev mode: auto-authenticated)
 * @body    { message: string, sessionId?: string }
 */
router.post('/process', devAuthMiddleware, conversationalController.processCommand.bind(conversationalController));

/**
 * @route   POST /api/conversational/execute
 * @desc    Execute confirmed transaction
 * @access  Private (Dev mode: auto-authenticated)
 * @body    { sessionId: string, authCode: string, biometricToken?: string }
 */
router.post('/execute', devAuthMiddleware, conversationalController.executeTransaction.bind(conversationalController));

/**
 * @route   GET /api/conversational/health
 * @desc    Health check for conversational banking service
 * @access  Public
 */
router.get('/health', conversationalController.healthCheck.bind(conversationalController));

module.exports = router;
