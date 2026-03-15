
const request = require('supertest');
const app = require('../app');

describe('Security Hardening Tests', () => {
    test('GET /api/bills/billers should return 401/403 without token', async () => {
        const res = await request(app).get('/api/bills/billers');
        expect([401, 403]).toContain(res.statusCode);
    });

    test('POST /api/bills/airtime should return 401/403 without token', async () => {
        const res = await request(app).post('/api/bills/airtime').send({
            network: 'MTN',
            phoneNumber: '08012345678',
            amount: 100
        });
        expect([401, 403]).toContain(res.statusCode);
    });
});
