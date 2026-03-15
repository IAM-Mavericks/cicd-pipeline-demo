 const express = require('express');
 const request = require('supertest');

 jest.mock('../../models/User', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

 jest.mock('../../models/Transaction', () => ({
  find: jest.fn(),
  countDocuments: jest.fn()
}));

 jest.mock('../../models/FraudCase', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

 const User = require('../../models/User');
 const Transaction = require('../../models/Transaction');
 const FraudCase = require('../../models/FraudCase');
 const adminRoutes = require('../../routes/adminRoutes');
 const { generateToken } = require('../../utils/jwt');
 const complianceService = require('../../services/complianceService');

describe('Admin Routes - Users', () => {
  let app;
  let adminToken;
  let userToken;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutes);

    adminToken = generateToken({
      userId: 'admin-1',
      email: 'admin@example.com',
      role: 'admin'
    });

    userToken = generateToken({
      userId: 'user-1',
      email: 'user@example.com',
      role: 'user'
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const authGet = (url, token = adminToken) => {
    return request(app)
      .get(url)
      .set('Authorization', `Bearer ${token}`);
  };

  const authPost = (url, body = {}, token = adminToken) => {
    return request(app)
      .post(url)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  };

  it('should reject unauthorized access without token', async () => {
    const res = await request(app).get('/api/admin/users');

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('errorCode', 'NO_TOKEN');
  });

  it('should reject non-admin user with 403', async () => {
    const res = await authGet('/api/admin/users', userToken);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('errorCode', 'INSUFFICIENT_PERMISSIONS');
  });

  it('should list users with filters and pagination', async () => {
    const mockUsers = [
      {
        _id: '1',
        email: 'user1@example.com',
        firstName: 'User',
        lastName: 'One',
        status: 'active',
        role: 'user'
      }
    ];

    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockUsers)
    };

    User.find.mockReturnValue(mockQuery);
    User.countDocuments.mockResolvedValue(1);

    const res = await authGet('/api/admin/users?page=1&limit=10&status=active&role=user&search=user1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('items');
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items).toHaveLength(1);
    expect(User.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'active', role: 'user' }));
  });

  it('should lock a user account and log compliance event', async () => {
    const lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    const mockUser = {
      _id: 'user-123',
      status: 'suspended',
      security: { lockedUntil }
    };

    User.findByIdAndUpdate.mockResolvedValue(mockUser);
    const logSpy = jest.spyOn(complianceService, 'logComplianceEvent').mockResolvedValue({});

    const res = await authPost('/api/admin/users/user-123/lock', {
      reason: 'suspected fraud',
      durationMinutes: 30
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('id', mockUser._id);
    expect(res.body.data).toHaveProperty('status', 'suspended');
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({ status: 'suspended' }),
      { new: true }
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ACCOUNT_LOCKED', userId: mockUser._id })
    );
  });

  it('should return 404 when locking non-existent user', async () => {
    User.findByIdAndUpdate.mockResolvedValue(null);

    const res = await authPost('/api/admin/users/unknown/lock', {
      reason: 'test'
    });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error', 'User not found');
  });

  it('should unlock a user account and log compliance event', async () => {
    const mockUser = {
      _id: 'user-456',
      status: 'active',
      security: { lockedUntil: null }
    };

    User.findByIdAndUpdate.mockResolvedValue(mockUser);
    const logSpy = jest.spyOn(complianceService, 'logComplianceEvent').mockResolvedValue({});

    const res = await authPost('/api/admin/users/user-456/unlock');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('id', mockUser._id);
    expect(res.body.data).toHaveProperty('status', 'active');
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'user-456',
      expect.objectContaining({ status: 'active' }),
      { new: true }
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ACCOUNT_UNLOCKED', userId: mockUser._id })
    );
  });

  it('should list transactions with filters and pagination', async () => {
    const mockTransactions = [
      {
        transactionId: 'TXN_1',
        amount: '1500.00',
        status: 'completed',
        type: 'transfer'
      }
    ];

    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockTransactions)
    };

    Transaction.find.mockReturnValue(mockQuery);
    Transaction.countDocuments.mockResolvedValue(1);

    const res = await authGet('/api/admin/transactions?status=completed&type=transfer&userId=user-1&riskLevel=high&amlStatus=review&manualReview=true&hasRedFlags=true&search=TXN_1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('items');
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items).toHaveLength(1);

    expect(Transaction.find).toHaveBeenCalled();
    const filterArg = Transaction.find.mock.calls[0][0];
    expect(filterArg).toEqual(expect.objectContaining({
      status: 'completed',
      type: 'transfer',
      'security.riskLevel': 'high',
      'compliance.amlStatus': 'review',
      'compliance.manualReviewRequired': true,
      'compliance.redFlags.0': { $exists: true }
    }));
  });

  it('should apply numeric filters for amount and risk score', async () => {
    const mockTransactions = [];

    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockTransactions)
    };

    Transaction.find.mockReturnValue(mockQuery);
    Transaction.countDocuments.mockResolvedValue(0);

    const res = await authGet('/api/admin/transactions?minAmount=1000&maxAmount=5000&minRiskScore=10&maxRiskScore=80');

    expect(res.status).toBe(200);
    const filterArg = Transaction.find.mock.calls[0][0];
    expect(filterArg.$and).toBeDefined();
    expect(filterArg.$and[1]).toHaveProperty('$expr');
  });

  it('should list fraud cases with filters and pagination', async () => {
    const mockCases = [
      {
        _id: 'case-1',
        transactionId: 'TXN_123',
        status: 'open',
        riskLevel: 'high',
        source: 'manual'
      }
    ];

    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockCases)
    };

    FraudCase.find.mockReturnValue(mockQuery);
    FraudCase.countDocuments.mockResolvedValue(1);

    const res = await authGet('/api/admin/fraud/cases?status=open&transactionId=TXN_123&userId=user-1&riskLevel=high&source=manual');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data.items).toHaveLength(1);

    expect(FraudCase.find).toHaveBeenCalledWith(expect.objectContaining({
      status: 'open',
      transactionId: 'TXN_123',
      userId: 'user-1',
      riskLevel: 'high',
      source: 'manual'
    }));
  });

  it('should create a fraud case', async () => {
    const mockCase = {
      _id: 'case-2',
      transactionId: 'TXN_456',
      status: 'open'
    };

    FraudCase.create.mockResolvedValue(mockCase);

    const payload = {
      transactionId: 'TXN_456',
      userId: 'user-1',
      riskScore: 80,
      riskLevel: 'high',
      flags: [{ type: 'velocity_exceeded', severity: 'high' }],
      source: 'manual',
      notes: 'Manual review started'
    };

    const res = await authPost('/api/admin/fraud/cases', payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('_id', 'case-2');
    expect(FraudCase.create).toHaveBeenCalledWith(expect.objectContaining({
      transactionId: 'TXN_456',
      riskScore: 80,
      riskLevel: 'high'
    }));
  });

  it('should require transactionId when creating fraud case', async () => {
    const res = await authPost('/api/admin/fraud/cases', {});

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error', 'transactionId is required');
  });

  it('should update a fraud case', async () => {
    const mockCase = {
      _id: 'case-3',
      status: 'closed',
      notes: 'Resolved',
      assignedTo: 'analyst-1'
    };

    FraudCase.findByIdAndUpdate.mockResolvedValue(mockCase);

    const res = await request(app)
      .patch('/api/admin/fraud/cases/case-3')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'closed',
        notes: 'Resolved',
        assignedTo: 'analyst-1'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('_id', 'case-3');
    expect(FraudCase.findByIdAndUpdate).toHaveBeenCalledWith(
      'case-3',
      expect.objectContaining({ status: 'closed', notes: 'Resolved', assignedTo: 'analyst-1' }),
      { new: true }
    );
  });

  it('should return 404 when updating missing fraud case', async () => {
    FraudCase.findByIdAndUpdate.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/admin/fraud/cases/unknown')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'closed' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error', 'Fraud case not found');
  });

  it('should return KYC summary', async () => {
    // totalUsers, tier1, tier2, tier3, bvnVerified, addressVerified, utilityBillVerified
    User.countDocuments
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(60)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(20);

    const res = await authGet('/api/admin/compliance/kyc-summary');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('totalUsers', 100);
    expect(res.body.data.tiers).toEqual({ tier1: 60, tier2: 30, tier3: 10 });
    expect(res.body.data.verification).toEqual({
      bvnVerified: 50,
      addressVerified: 40,
      utilityBillVerified: 20
    });
  });

  it('should return AML summary', async () => {
    // totalTransactions, amlClear, amlReview, amlFlagged, amlReported,
    // reportedToNFIU, manualReviewRequired, highRiskTransactions
    Transaction.countDocuments
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(400)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(15)
      .mockResolvedValueOnce(25);

    const res = await authGet('/api/admin/compliance/aml-summary');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('totalTransactions', 500);
    expect(res.body.data.amlStatus).toEqual({
      clear: 400,
      review: 50,
      flagged: 30,
      reported: 20
    });
    expect(res.body.data.flags).toEqual({
      reportedToNFIU: 10,
      manualReviewRequired: 15,
      highRiskTransactions: 25
    });
  });

  it('should generate SAR report', async () => {
    const mockReport = { reportType: 'SAR', summary: { totalTransactions: 5 } };
    const sarSpy = jest
      .spyOn(complianceService, 'generateComplianceReport')
      .mockResolvedValue(mockReport);

    const res = await authGet('/api/admin/compliance/sar-report?startDate=2025-01-01&endDate=2025-02-01&reportType=SAR');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toEqual(mockReport);
    expect(sarSpy).toHaveBeenCalledWith(
      expect.objectContaining({ reportType: 'SAR' })
    );
  });
});
