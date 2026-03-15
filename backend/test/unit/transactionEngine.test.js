const TransactionEngine = require('../../services/transactionEngine');

describe('TransactionEngine', () => {
  let engine;

  beforeEach(() => {
    engine = TransactionEngine;
  });

  describe('processTransfer', () => {
    it('should process a valid transfer and complete successfully', async () => {
      const params = {
        idempotencyKey: 'unit-test-transfer-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        amount: '1000.50',
        currency: 'NGN',
        description: 'Test transfer',
        metadata: { purpose: 'unit-test' }
      };

      const result = await engine.processTransfer(params);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('transaction');

      const { transaction } = result;
      expect(transaction).toHaveProperty('id');
      expect(transaction).toHaveProperty('type', 'transfer');
      expect(transaction).toHaveProperty('status', engine.transactionStates.COMPLETED);
      expect(transaction).toHaveProperty('from');
      expect(transaction).toHaveProperty('to');
      expect(transaction.from.userId).toBe('user-1');
      expect(transaction.to.userId).toBe('user-2');
      expect(parseFloat(transaction.amount)).toBeCloseTo(1000.5);
      expect(Array.isArray(transaction.steps)).toBe(true);
      expect(transaction.steps.length).toBeGreaterThan(0);
    });

    it('should enforce idempotency for the same idempotencyKey', async () => {
      const params = {
        idempotencyKey: 'unit-test-transfer-idem',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        amount: '5000',
        currency: 'NGN',
        description: 'Idempotent transfer'
      };

      const first = await engine.processTransfer(params);
      const second = await engine.processTransfer(params);

      expect(first.success).toBe(true);
      expect(second).toHaveProperty('fromCache', true);
      expect(second.message).toContain('Duplicate request');
      expect(second.transaction.id).toBe(first.transaction.id);
    });

    it('should fail when amount is less than or equal to zero', async () => {
      const params = {
        idempotencyKey: 'unit-test-transfer-invalid-amount',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        amount: 0,
        currency: 'NGN',
        description: 'Zero amount'
      };

      const result = await engine.processTransfer(params);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Amount must be greater than zero');
    });
  });

  describe('calculateFee', () => {
    it('should apply flat fee for small transfers', () => {
      const result = engine.calculateFee('4000', 'transfer');

      expect(result.amount).toBe('4000');
      expect(result.fee).toBe('10');
      expect(parseFloat(result.netAmount)).toBeCloseTo(3990);
      expect(result.feeBreakdown.flatFee).toBe('10');
    });

    it('should apply percentage fee for larger transfers', () => {
      const result = engine.calculateFee('10000', 'transfer');

      // 0.5% of 10000 = 50
      expect(result.fee).toBe('50');
      expect(parseFloat(result.netAmount)).toBeCloseTo(9950);
      expect(result.feeBreakdown.percentage).toBe('0.5%');
    });

    it('should apply withdrawal fee', () => {
      const result = engine.calculateFee('10000', 'withdrawal');

      // 1% of 10000 = 100
      expect(result.fee).toBe('100');
      expect(parseFloat(result.netAmount)).toBeCloseTo(9900);
      expect(result.feeBreakdown.percentage).toBe('1%');
    });

    it('should apply international fee', () => {
      const result = engine.calculateFee('10000', 'international');

      // 2% of 10000 = 200
      expect(result.fee).toBe('200');
      expect(parseFloat(result.netAmount)).toBeCloseTo(9800);
      expect(result.feeBreakdown.percentage).toBe('2%');
    });
  });

  describe('idempotency cache', () => {
    it('should return null when no cached result exists', () => {
      const cached = engine.checkIdempotency('non-existent-key');
      expect(cached).toBeNull();
    });

    it('should return cached result when present', () => {
      const key = 'cache-key';
      const storedResult = { success: true, foo: 'bar' };

      engine.storeIdempotencyResult(key, storedResult);

      const cached = engine.checkIdempotency(key);
      expect(cached).not.toBeNull();
      expect(cached.fromCache).toBe(true);
      expect(cached.success).toBe(true);
      expect(cached.foo).toBe('bar');
    });
  });

  describe('batchProcess', () => {
    it('should process multiple transfers and aggregate results', async () => {
      const transactions = [
        {
          idempotencyKey: 'batch-1',
          fromUserId: 'user-a',
          toUserId: 'user-b',
          amount: 1000,
          currency: 'NGN',
          description: 'Valid transfer'
        },
        {
          idempotencyKey: 'batch-2',
          fromUserId: 'user-a',
          toUserId: 'user-b',
          amount: 0,
          currency: 'NGN',
          description: 'Invalid transfer'
        }
      ];

      const result = await engine.batchProcess(transactions);

      expect(result.total).toBe(2);
      expect(result.transactions).toHaveLength(2);
      expect(result.successful + result.failed).toBe(2);

      const hasFailure = result.transactions.some(r => r.success === false);
      expect(hasFailure).toBe(true);
    });
  });

  describe('failTransaction', () => {
    it('should build a failed transaction when none is provided', () => {
      const result = engine.failTransaction('TXN_UNIT_TEST', 'Failure reason');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failure reason');
      expect(result.transaction.id).toBe('TXN_UNIT_TEST');
      expect(result.transaction.status).toBe(engine.transactionStates.FAILED);
      expect(result.transaction.failureReason).toBe('Failure reason');
    });
  });

  describe('generateTransactionId', () => {
    it('should generate unique transaction IDs with TXN_ prefix', () => {
      const id1 = engine.generateTransactionId();
      const id2 = engine.generateTransactionId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^TXN_/);
      expect(id2).toMatch(/^TXN_/);
    });
  });
});
