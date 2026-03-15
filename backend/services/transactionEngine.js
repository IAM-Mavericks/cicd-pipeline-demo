/**
 * Transaction Processing Engine
 * Handles financial transactions with ACID properties
 * Implements idempotency, rollback mechanisms, and decimal precision
 */

const Decimal = require('decimal.js'); // For precise financial calculations

class TransactionEngine {
  constructor() {
    // Configure Decimal for financial precision
    Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });
    
    this.transactionStates = {
      PENDING: 'pending',
      PROCESSING: 'processing',
      COMPLETED: 'completed',
      FAILED: 'failed',
      REVERSED: 'reversed'
    };

    this.idempotencyCache = new Map(); // In production, use Redis
    this.idempotencyTTL = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Process a transfer transaction with full ACID compliance
   * @param {Object} params - Transaction parameters
   * @returns {Promise<Object>}
   */
  async processTransfer(params) {
    const {
      idempotencyKey,
      fromUserId,
      toUserId,
      amount,
      currency = 'NGN',
      description,
      metadata = {}
    } = params;

    // Check idempotency
    const existingResult = this.checkIdempotency(idempotencyKey);
    if (existingResult) {
      return existingResult;
    }

    // Generate transaction ID
    const transactionId = this.generateTransactionId();
    const timestamp = new Date().toISOString();

    // Use Decimal for precise calculations
    const transferAmount = new Decimal(amount);

    // Validate amount
    if (transferAmount.lte(0)) {
      return this.failTransaction(transactionId, 'Amount must be greater than zero');
    }

    try {
      // Step 1: Create transaction record (PENDING)
      const transaction = {
        id: transactionId,
        idempotencyKey,
        type: 'transfer',
        status: this.transactionStates.PENDING,
        from: {
          userId: fromUserId,
          balanceBefore: null,
          balanceAfter: null
        },
        to: {
          userId: toUserId,
          balanceBefore: null,
          balanceAfter: null
        },
        amount: transferAmount.toString(),
        currency,
        description,
        metadata,
        createdAt: timestamp,
        updatedAt: timestamp,
        steps: []
      };

      // Step 2: Lock accounts (prevent concurrent modifications)
      await this.lockAccounts([fromUserId, toUserId]);
      transaction.steps.push({ step: 'accounts_locked', timestamp: new Date().toISOString() });

      // Step 3: Verify sender balance
      const senderBalance = await this.getAccountBalance(fromUserId, currency);
      transaction.from.balanceBefore = senderBalance.toString();

      if (new Decimal(senderBalance).lt(transferAmount)) {
        await this.unlockAccounts([fromUserId, toUserId]);
        return this.failTransaction(transactionId, 'Insufficient balance', transaction);
      }

      // Step 4: Get receiver balance
      const receiverBalance = await this.getAccountBalance(toUserId, currency);
      transaction.to.balanceBefore = receiverBalance.toString();

      // Step 5: Update transaction status to PROCESSING
      transaction.status = this.transactionStates.PROCESSING;
      transaction.steps.push({ step: 'processing_started', timestamp: new Date().toISOString() });

      // Step 6: Debit sender account
      const newSenderBalance = new Decimal(senderBalance).minus(transferAmount);
      await this.updateAccountBalance(fromUserId, currency, newSenderBalance.toString());
      transaction.from.balanceAfter = newSenderBalance.toString();
      transaction.steps.push({ step: 'sender_debited', timestamp: new Date().toISOString() });

      // Step 7: Credit receiver account
      const newReceiverBalance = new Decimal(receiverBalance).plus(transferAmount);
      await this.updateAccountBalance(toUserId, currency, newReceiverBalance.toString());
      transaction.to.balanceAfter = newReceiverBalance.toString();
      transaction.steps.push({ step: 'receiver_credited', timestamp: new Date().toISOString() });

      // Step 8: Mark transaction as COMPLETED
      transaction.status = this.transactionStates.COMPLETED;
      transaction.completedAt = new Date().toISOString();
      transaction.steps.push({ step: 'completed', timestamp: new Date().toISOString() });

      // Step 9: Unlock accounts
      await this.unlockAccounts([fromUserId, toUserId]);
      transaction.steps.push({ step: 'accounts_unlocked', timestamp: new Date().toISOString() });

      // Step 10: Store idempotency result
      this.storeIdempotencyResult(idempotencyKey, {
        success: true,
        transaction
      });

      // Step 11: Trigger post-transaction events
      await this.triggerPostTransactionEvents(transaction);

      return {
        success: true,
        transaction,
        message: 'Transfer completed successfully'
      };

    } catch (error) {
      // Rollback on error
      console.error('Transaction error:', error);
      
      try {
        await this.rollbackTransaction(transaction);
        await this.unlockAccounts([fromUserId, toUserId]);
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
        // Alert admin - critical error
        await this.alertCriticalError(transaction, rollbackError);
      }

      return this.failTransaction(transactionId, error.message, transaction);
    }
  }

  /**
   * Rollback a failed transaction
   * @param {Object} transaction - Transaction to rollback
   */
  async rollbackTransaction(transaction) {
    if (!transaction || transaction.status === this.transactionStates.COMPLETED) {
      return;
    }

    const completedSteps = transaction.steps.map(s => s.step);

    // Reverse operations in reverse order
    if (completedSteps.includes('receiver_credited')) {
      // Reverse credit
      const amount = new Decimal(transaction.amount);
      const currentBalance = await this.getAccountBalance(transaction.to.userId, transaction.currency);
      const reversedBalance = new Decimal(currentBalance).minus(amount);
      await this.updateAccountBalance(transaction.to.userId, transaction.currency, reversedBalance.toString());
    }

    if (completedSteps.includes('sender_debited')) {
      // Reverse debit
      const amount = new Decimal(transaction.amount);
      const currentBalance = await this.getAccountBalance(transaction.from.userId, transaction.currency);
      const reversedBalance = new Decimal(currentBalance).plus(amount);
      await this.updateAccountBalance(transaction.from.userId, transaction.currency, reversedBalance.toString());
    }

    transaction.status = this.transactionStates.REVERSED;
    transaction.reversedAt = new Date().toISOString();
    transaction.steps.push({ step: 'rolled_back', timestamp: new Date().toISOString() });

    console.log('✅ Transaction rolled back:', transaction.id);
  }

  /**
   * Check idempotency key
   * @param {string} key - Idempotency key
   * @returns {Object|null}
   */
  checkIdempotency(key) {
    if (!key) return null;

    const cached = this.idempotencyCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.idempotencyTTL) {
      return {
        ...cached.result,
        fromCache: true,
        message: 'Duplicate request - returning cached result'
      };
    }

    return null;
  }

  /**
   * Store idempotency result
   * @param {string} key - Idempotency key
   * @param {Object} result - Result to cache
   */
  storeIdempotencyResult(key, result) {
    if (!key) return;

    this.idempotencyCache.set(key, {
      result,
      timestamp: Date.now()
    });

    // Auto-cleanup after TTL
    const timeout = setTimeout(() => {
      this.idempotencyCache.delete(key);
    }, this.idempotencyTTL);

    if (typeof timeout.unref === 'function') {
      timeout.unref();
    }
  }

  /**
   * Lock accounts for transaction
   * @param {Array<string>} userIds - User IDs to lock
   */
  async lockAccounts(userIds) {
    // In production, use database row-level locking or Redis locks
    console.log('🔒 Locking accounts:', userIds);
    // Mock implementation
    return true;
  }

  /**
   * Unlock accounts
   * @param {Array<string>} userIds - User IDs to unlock
   */
  async unlockAccounts(userIds) {
    console.log('🔓 Unlocking accounts:', userIds);
    // Mock implementation
    return true;
  }

  /**
   * Get account balance
   * @param {string} userId - User ID
   * @param {string} currency - Currency code
   * @returns {Promise<string>} - Balance as string (for precision)
   */
  async getAccountBalance(userId, currency) {
    // In production, query database
    // Mock implementation
    return '1000000.00'; // ₦1,000,000
  }

  /**
   * Update account balance
   * @param {string} userId - User ID
   * @param {string} currency - Currency code
   * @param {string} newBalance - New balance (string for precision)
   */
  async updateAccountBalance(userId, currency, newBalance) {
    // In production, update database with optimistic locking
    console.log(`💰 Updated balance for ${userId}: ${newBalance} ${currency}`);
    return true;
  }

  /**
   * Generate unique transaction ID
   * @returns {string}
   */
  generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `TXN_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Fail transaction
   * @param {string} transactionId - Transaction ID
   * @param {string} reason - Failure reason
   * @param {Object} transaction - Transaction object
   * @returns {Object}
   */
  failTransaction(transactionId, reason, transaction = null) {
    const failedTransaction = transaction || {
      id: transactionId,
      status: this.transactionStates.FAILED
    };

    failedTransaction.status = this.transactionStates.FAILED;
    failedTransaction.failureReason = reason;
    failedTransaction.failedAt = new Date().toISOString();

    return {
      success: false,
      error: reason,
      transaction: failedTransaction
    };
  }

  /**
   * Trigger post-transaction events
   * @param {Object} transaction - Completed transaction
   */
  async triggerPostTransactionEvents(transaction) {
    // Send notifications
    console.log('📧 Sending transaction notifications...');
    
    // Update analytics
    console.log('📊 Updating analytics...');
    
    // Trigger webhooks
    console.log('🔗 Triggering webhooks...');
    
    // Log for compliance
    console.log('📋 Logging for compliance...');
  }

  /**
   * Alert critical error
   * @param {Object} transaction - Failed transaction
   * @param {Error} error - Error object
   */
  async alertCriticalError(transaction, error) {
    console.error('🚨 CRITICAL ERROR - Manual intervention required');
    console.error('Transaction:', transaction);
    console.error('Error:', error);
    
    // In production:
    // - Send alert to admin
    // - Log to monitoring system (Sentry, etc.)
    // - Create incident ticket
  }

  /**
   * Calculate transaction fee
   * @param {string} amount - Transaction amount
   * @param {string} type - Transaction type
   * @returns {Object}
   */
  calculateFee(amount, type = 'transfer') {
    const amt = new Decimal(amount);
    let feePercentage = new Decimal(0);
    let flatFee = new Decimal(0);

    // Fee structure (example - adjust based on business model)
    switch (type) {
      case 'transfer':
        if (amt.lte(5000)) {
          flatFee = new Decimal(10); // ₦10 for transfers ≤ ₦5,000
        } else {
          feePercentage = new Decimal(0.5); // 0.5% for larger transfers
        }
        break;
      case 'withdrawal':
        feePercentage = new Decimal(1); // 1% withdrawal fee
        break;
      case 'international':
        feePercentage = new Decimal(2); // 2% international fee
        break;
    }

    const percentageFee = amt.times(feePercentage).dividedBy(100);
    const totalFee = percentageFee.plus(flatFee);
    const netAmount = amt.minus(totalFee);

    return {
      amount: amt.toString(),
      fee: totalFee.toString(),
      netAmount: netAmount.toString(),
      feeBreakdown: {
        percentage: feePercentage.toString() + '%',
        percentageFee: percentageFee.toString(),
        flatFee: flatFee.toString()
      }
    };
  }

  /**
   * Batch process multiple transactions
   * @param {Array} transactions - Array of transactions
   * @returns {Promise<Object>}
   */
  async batchProcess(transactions) {
    const results = {
      total: transactions.length,
      successful: 0,
      failed: 0,
      transactions: []
    };

    for (const txn of transactions) {
      try {
        const result = await this.processTransfer(txn);
        results.transactions.push(result);
        
        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
        }
      } catch (error) {
        results.failed++;
        results.transactions.push({
          success: false,
          error: error.message,
          transaction: txn
        });
      }
    }

    return results;
  }
}

module.exports = new TransactionEngine();
