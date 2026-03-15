const ledgerService = require('../services/ledgerService');
const { validationResult } = require('express-validator');
const Decimal = require('decimal.js');

const FX_RATES = {
  'NGN:USD': 1 / 1500,
  'USD:NGN': 1500,
  'NGN:GBP': 1 / 1800,
  'GBP:NGN': 1800,
  'NGN:EUR': 1 / 1700,
  'EUR:NGN': 1700,
};

class TransferController {
  /**
   * Handle money transfer between accounts
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  static async transfer(req, res) {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      fromAccountId,
      toAccountId,
      amount,
      currency,
      reference,
      description,
      metadata = {}
    } = req.body;

    try {
      const result = await ledgerService.executeTransfer({
        fromAccountId,
        toAccountId,
        amount,
        currency,
        reference,
        description,
        metadata: {
          ...metadata,
          userId: req.user?.userId,
          ip: req.ip
        }
      });

      res.status(200).json({
        success: true,
        message: 'Transfer completed successfully',
        data: result
      });
    } catch (error) {
      console.error('Transfer failed:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Transfer failed',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Handle bank transfer from user's wallet to system settlement account
   */
  static async transferToBank(req, res) {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      amount,
      currency,
      recipientAccountNumber,
      recipientBankCode,
      recipientName,
      reference,
      description,
      metadata = {}
    } = req.body;

    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const upperCurrency = (currency || 'NGN').toUpperCase();

      const userAccounts = await ledgerService.getAccountsForUser(userId.toString());
      const fromAccount = userAccounts.find(
        (account) => account.currency === upperCurrency
      );

      if (!fromAccount) {
        return res.status(400).json({
          success: false,
          message: `No wallet found for currency ${upperCurrency}`
        });
      }

      const settlementAccount = await ledgerService.getOrCreateSystemAccount(upperCurrency);

      const result = await ledgerService.executeTransfer({
        fromAccountId: fromAccount.id,
        toAccountId: settlementAccount.id,
        amount,
        currency: upperCurrency,
        reference,
        description,
        metadata: {
          ...metadata,
          userId: userId.toString(),
          ip: req.ip,
          bankTransfer: true,
          recipientAccountNumber,
          recipientBankCode,
          recipientName
        }
      });

      res.status(200).json({
        success: true,
        message: 'Bank transfer completed successfully',
        data: result
      });
    } catch (error) {
      console.error('Bank transfer failed:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Bank transfer failed',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Handle FX conversion between two of the user's accounts
   * Uses system settlement accounts per currency to keep each ledger transfer single-currency.
   */
  static async transferFx(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      fromAccountId,
      toAccountId,
      amount,
      reference,
      description,
      metadata = {}
    } = req.body;

    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userIdStr = userId.toString();

      const amountDecimal = new Decimal(amount);
      if (amountDecimal.lte(0)) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be greater than zero'
        });
      }

      const userAccounts = await ledgerService.getAccountsForUser(userIdStr);
      const fromAccount = userAccounts.find((a) => a.id === Number(fromAccountId));
      const toAccount = userAccounts.find((a) => a.id === Number(toAccountId));

      if (!fromAccount || !toAccount) {
        return res.status(400).json({
          success: false,
          message: 'Both source and destination accounts must belong to the current user'
        });
      }

      const fromCurrency = (fromAccount.currency || '').toUpperCase();
      const toCurrency = (toAccount.currency || '').toUpperCase();

      if (!fromCurrency || !toCurrency) {
        return res.status(400).json({
          success: false,
          message: 'Invalid account currency configuration'
        });
      }

      // Same-currency case: delegate to normal transfer for convenience
      if (fromCurrency === toCurrency) {
        const result = await ledgerService.executeTransfer({
          fromAccountId: fromAccount.id,
          toAccountId: toAccount.id,
          amount: amountDecimal.toFixed(2),
          currency: fromCurrency,
          reference,
          description,
          metadata: {
            ...metadata,
            userId: userIdStr,
            ip: req.ip,
            fxSameCurrency: true
          }
        });

        return res.status(200).json({
          success: true,
          message: 'Transfer completed successfully',
          data: result
        });
      }

      // Cross-currency case: only support NGN <-> FX for now
      if (fromCurrency !== 'NGN' && toCurrency !== 'NGN') {
        return res.status(400).json({
          success: false,
          message: 'Only NGN to/from foreign currency conversions are supported'
        });
      }

      const pairKey = `${fromCurrency}:${toCurrency}`;
      const rate = FX_RATES[pairKey];

      if (!rate) {
        return res.status(400).json({
          success: false,
          message: `Unsupported FX pair ${pairKey}`
        });
      }

      const targetAmountDecimal = amountDecimal.mul(rate);
      const targetAmount = targetAmountDecimal.toFixed(2);
      const fxDirection = `${fromCurrency}->${toCurrency}`;

      // Step 1: move funds from user's source account to system account in source currency
      const systemFrom = await ledgerService.getOrCreateSystemAccount(fromCurrency);
      await ledgerService.executeTransfer({
        fromAccountId: fromAccount.id,
        toAccountId: systemFrom.id,
        amount: amountDecimal.toFixed(2),
        currency: fromCurrency,
        reference,
        description: description || `FX convert ${fxDirection}`,
        metadata: {
          ...metadata,
          userId: userIdStr,
          ip: req.ip,
          fx: true,
          fxDirection,
          fxStep: 'DEBIT_SOURCE',
          fxRate: rate.toString()
        }
      });

      // Step 2: move funds from system account in target currency to user's destination account
      const systemTo = await ledgerService.getOrCreateSystemAccount(toCurrency);
      const transferResult = await ledgerService.executeTransfer({
        fromAccountId: systemTo.id,
        toAccountId: toAccount.id,
        amount: targetAmount,
        currency: toCurrency,
        reference,
        description: description || `FX convert ${fxDirection}`,
        metadata: {
          ...metadata,
          userId: userIdStr,
          ip: req.ip,
          fx: true,
          fxDirection,
          fxStep: 'CREDIT_TARGET',
          fxRate: rate.toString(),
          sourceAmount: amountDecimal.toFixed(2),
          targetAmount
        }
      });

      const updatedFromAccount = await ledgerService.getAccount(fromAccount.id);
      const updatedToAccount = await ledgerService.getAccount(toAccount.id);

      return res.status(200).json({
        success: true,
        message: 'FX conversion completed successfully',
        data: {
          fx: true,
          fxDirection,
          rate: rate.toString(),
          sourceCurrency: fromCurrency,
          targetCurrency: toCurrency,
          sourceAmount: amountDecimal.toFixed(2),
          targetAmount,
          fromAccount: {
            id: updatedFromAccount.id,
            balance: updatedFromAccount.balance,
            availableBalance: updatedFromAccount.available_balance
          },
          toAccount: {
            id: updatedToAccount.id,
            balance: updatedToAccount.balance,
            availableBalance: updatedToAccount.available_balance
          },
          transferResult
        }
      });
    } catch (error) {
      console.error('FX transfer failed:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'FX conversion failed',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

module.exports = TransferController;