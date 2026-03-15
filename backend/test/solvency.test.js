const isMock = process.env.ZKP_MOCK !== 'false';

if (isMock) {
    jest.mock('../zkp/services/proofGenerator', () => ({
        generateSolvencyProof: jest.fn().mockResolvedValue({
            proof: { pi_a: ['1'], pi_b: [['1', '1'], ['1', '1']], pi_c: ['1'] },
            publicSignals: ['1'],
            proofId: 'mock-proof-id',
            generatedAt: new Date().toISOString()
        }),
        generateAgeProof: jest.fn().mockResolvedValue({
            proof: { pi_a: [], pi_b: [], pi_c: [] },
            publicSignals: ['1'],
            proofId: 'mock-age-proof-id'
        }),
        parseDateOfBirth: jest.fn().mockReturnValue({ birthYear: 1995, birthMonth: 3, birthDay: 15 }),
        circuits: {
            solvency: { wasm: 'mock', zkey: 'mock' }
        }
    }));
}

const jwt = require('jsonwebtoken');
const request = require('supertest');
const proofGenerator = require('../zkp/services/proofGenerator');


jest.setTimeout(60000);

describe('Proof of Solvency Integration', () => {
    let testUser;
    let token;

    beforeAll(async () => {
        // Connect to MongoDB if not already connected
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mavenpay');
        }

        // Run migrations if needed
        const LedgerMigrations = require('../services/ledgerMigrations');
        await LedgerMigrations.runMigrations();

        // Setup test user in MongoDB
        testUser = await User.create({
            email: `solvency_test_${Date.now()}@example.com`,
            phoneNumber: `234${Math.floor(Math.random() * 1000000000)}`,
            password: 'password123',
            firstName: 'Solvency',
            lastName: 'Tester'
        });

        token = jwt.sign({ id: testUser._id }, process.env.JWT_SECRET || 'your_jwt_secret_here');

        // Setup test accounts in Postgres
        // 1. System Account (Reserves)
        const sysAccount = await ledgerService.getOrCreateSystemAccount('NGN');

        // Add reserves manually for testing
        await postgresService.query(
            "UPDATE accounts SET balance = 10000, available_balance = 10000 WHERE id = $1",
            [sysAccount.id]
        );

        // 2. User Account (Liability)
        await ledgerService.createAccount({
            userId: testUser._id.toString(),
            accountNumber: `ACC_${Date.now()}`,
            currency: 'NGN',
            type: 'LIABILITY',
            name: 'Primary Account'
        });

        // Add balance for user
        await postgresService.query(
            "UPDATE accounts SET balance = 100, available_balance = 100 WHERE user_id = $1",
            [testUser._id.toString()]
        );
    });

    afterAll(async () => {
        await User.deleteMany({ email: /solvency_test/ });
        await postgresService.query("DELETE FROM accounts WHERE user_id = $1", [testUser._id.toString()]);
        // Keep system account for other tests if necessary
        await mongoose.connection.close();
    });

    describe('GET /api/solvency/status', () => {
        it('should return global solvency status with reserve ratio > 1', async () => {
            const response = await request(app).get('/api/solvency/status');

            if (response.status !== 200) {
                console.log('Error Response:', response.body);
            }

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(parseFloat(response.body.data.reserveRatio)).toBeGreaterThan(1);
            expect(response.body.data.verificationStatus).toBe('MATHEMATICALLY_VERIFIED');
        });
    });

    describe('GET /api/solvency/user-proof', () => {
        it('should return valid inclusion proof for authenticated user', async () => {
            // Trigger snapshot first to ensure it's up to date
            await solvencyService.generateSnapshot();

            const response = await request(app)
                .get('/api/solvency/user-proof')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.inclusionProof).toBeDefined();
            expect(response.body.data.zkProof).toBeDefined();
            expect(response.body.data.inclusionProof.userId).toBeDefined();

            // Verify the balance matches (100 in our test)
            // Note: In smallest unit it's 100 * 1e8
            expect(response.body.data.inclusionProof.balance).toBe((100 * 1e8).toString());
        });
    });

    describe('Mathematical Soundness', () => {
        it('should fail if liabilities exceed reserves', async () => {
            // 1. Set liabilities > reserves
            await postgresService.query(
                "UPDATE accounts SET balance = 50000 WHERE user_id = $1",
                [testUser._id.toString()]
            );

            // 2. Generate snapshot
            await solvencyService.generateSnapshot();

            // 3. Status should indicate reserve ratio < 1
            const response = await request(app).get('/api/solvency/status');
            expect(parseFloat(response.body.data.reserveRatio)).toBeLessThan(1);

            // Note: The ZKP would actually fail verification if we tried to prove solvency now, 
            // but the Status endpoint just reports the numbers. Inclusion proofs still work.
        });
    });
});
