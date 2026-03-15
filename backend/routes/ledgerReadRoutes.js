const express = require('express');
const LedgerReadController = require('../controllers/ledgerReadController');

const router = express.Router();

// Get all accounts for the authenticated user
router.get('/accounts', LedgerReadController.getAccountsForCurrentUser);

// Open/create a new account (wallet) for the authenticated user
router.post('/accounts', LedgerReadController.openAccountForCurrentUser);

// Get primary account for the authenticated user (must come before generic :id route)
router.get('/accounts/primary', LedgerReadController.getPrimaryAccountForCurrentUser);

// Get account details by account number (also more specific than :id)
router.get('/accounts/by-number/:accountNumber', LedgerReadController.getAccountByNumber);

// Get basic account details by numeric ID
router.get('/accounts/:id', LedgerReadController.getAccount);

// Get transactions involving an account (paginated)
router.get('/accounts/:id/transactions', LedgerReadController.getAccountTransactions);

module.exports = router;
