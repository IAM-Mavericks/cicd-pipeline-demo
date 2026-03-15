const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

jest.setTimeout(60000);

describe('KYC ZKP Integration', () => {
    let token;
    let userId;

    beforeAll(async () => {
        // Setup test user
        const userPayload = {
            email: 'test-zkp-kyc@example.com',
            password: 'Password123!',
            firstName: 'Test',
            lastName: 'User',
            phoneNumber: '+2348000000001'
        };

        // Clean up if exists
        await User.deleteOne({ email: userPayload.email });

        // Create user (bypassing auth controller for speed in test setup)
        const user = new User(userPayload);
        await user.save();
        userId = user._id;

        // Generate token
        token = jwt.sign({ userId, email: user.email }, process.env.JWT_SECRET);
    });

    afterAll(async () => {
        await User.deleteOne({ _id: userId });
    });

    describe('POST /api/kyc/verify-bvn-zkp', () => {
        it('should verify BVN and generate a ZKP age proof', async () => {
            const response = await request(app)
                .post('/api/kyc/verify-bvn-zkp')
                .set('Authorization', `Bearer ${token}`)
                .send({ bvn: '22334455667' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.ageVerified).toBe(true);
            expect(response.body.data.zkpProofId).toBeDefined();

            // Verify database state
            const updatedUser = await User.findById(userId);
            expect(updatedUser.kyc.ageVerified).toBe(true);
            expect(updatedUser.kyc.zkpProofId).toBeDefined();
            expect(updatedUser.kyc.tier).toBe(2);

            // CRITICAL PRIVACY CHECK: DOB must NOT be stored
            expect(updatedUser.dateOfBirth).toBeUndefined();
        });

        it('should return error if BVN is missing', async () => {
            const response = await request(app)
                .post('/api/kyc/verify-bvn-zkp')
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/kyc/privacy-status', () => {
        it('should return the correct privacy and KYC status', async () => {
            const response = await request(app)
                .get('/api/kyc/privacy-status')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.kycTier).toBe(2);
            expect(response.body.data.privacyLevel).toBe('MAXIMUM (Zero-Knowledge)');
        });
    });
});
