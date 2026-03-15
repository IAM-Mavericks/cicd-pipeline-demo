const express = require('express');
const router = express.Router();
const kycController = require('../controllers/kycController');

/**
 * KYC & Privacy Routes (ZKP Integration)
 */

// POST /api/kyc/verify-bvn-zkp
// body: { bvn: string }
router.post('/kyc/verify-bvn-zkp', kycController.verifyBvnAgeZkp);

// GET /api/kyc/privacy-status
router.get('/kyc/privacy-status', kycController.getPrivacyStatus);

module.exports = router;
