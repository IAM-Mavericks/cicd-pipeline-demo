const express = require('express');
const router = express.Router();
const solvencyController = require('../controllers/solvencyController');
const { authenticateToken } = require('../utils/jwt');

/**
 * Solvency Routes
 * Proof-of-Solvency endpoints
 */

// Global status (publicly accessible for transparency)
router.get('/status', solvencyController.getStatus);

// User-specific inclusion proof (requires authentication)
router.get('/user-proof', authenticateToken, solvencyController.getUserProof);

// Trigger snapshot (for demo purposes)
router.post('/snapshot', authenticateToken, solvencyController.triggerSnapshot);

module.exports = router;
