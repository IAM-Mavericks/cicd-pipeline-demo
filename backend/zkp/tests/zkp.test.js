const { expect } = require('chai');
const proofGenerator = require('../services/proofGenerator');
const proofVerifier = require('../services/proofVerifier');

describe('ZKP Age Verification', function () {
    // Increase timeout for proof generation (can take a few seconds)
    this.timeout(30000);

    describe('Proof Generation', () => {
        it('should generate valid proof for user over 18', async () => {
            // User born on 1995-03-15 (currently 30+ years old)
            const privateData = {
                birthYear: 1995,
                birthMonth: 3,
                birthDay: 15
            };

            const publicData = {
                currentYear: 2026,
                currentMonth: 1,
                currentDay: 22,
                minAge: 18
            };

            const result = await proofGenerator.generateAgeProof(privateData, publicData);

            expect(result).to.have.property('proof');
            expect(result).to.have.property('publicSignals');
            expect(result).to.have.property('proofId');
            expect(result.publicSignals[0]).to.equal('1'); // Should pass (age >= 18)
        });

        it('should generate invalid proof for user under 18', async () => {
            // User born on 2010-06-20 (currently 15 years old)
            const privateData = {
                birthYear: 2010,
                birthMonth: 6,
                birthDay: 20
            };

            const publicData = {
                currentYear: 2026,
                currentMonth: 1,
                currentDay: 22,
                minAge: 18
            };

            const result = await proofGenerator.generateAgeProof(privateData, publicData);

            expect(result).to.have.property('proof');
            expect(result.publicSignals[0]).to.equal('0'); // Should fail (age < 18)
        });

        it('should handle edge case: birthday today', async () => {
            // User turning 18 today
            const privateData = {
                birthYear: 2008,
                birthMonth: 1,
                birthDay: 22
            };

            const publicData = {
                currentYear: 2026,
                currentMonth: 1,
                currentDay: 22,
                minAge: 18
            };

            const result = await proofGenerator.generateAgeProof(privateData, publicData);
            expect(result.publicSignals[0]).to.equal('1'); // Should pass (exactly 18)
        });

        it('should handle edge case: birthday tomorrow', async () => {
            // User turning 18 tomorrow (still 17 today)
            const privateData = {
                birthYear: 2008,
                birthMonth: 1,
                birthDay: 23
            };

            const publicData = {
                currentYear: 2026,
                currentMonth: 1,
                currentDay: 22,
                minAge: 18
            };

            const result = await proofGenerator.generateAgeProof(privateData, publicData);
            expect(result.publicSignals[0]).to.equal('0'); // Should fail (still 17)
        });

        it('should parse date of birth from ISO string', () => {
            const dob = '1995-03-15';
            const parsed = proofGenerator.parseDateOfBirth(dob);

            expect(parsed.birthYear).to.equal(1995);
            expect(parsed.birthMonth).to.equal(3);
            expect(parsed.birthDay).to.equal(15);
        });
    });

    describe('Proof Verification', () => {
        let validProof;

        before(async () => {
            // Generate a valid proof for verification tests
            const privateData = {
                birthYear: 1995,
                birthMonth: 3,
                birthDay: 15
            };

            const publicData = {
                currentYear: 2026,
                currentMonth: 1,
                currentDay: 22,
                minAge: 18
            };

            validProof = await proofGenerator.generateAgeProof(privateData, publicData);
        });

        it('should verify valid proof', async () => {
            const result = await proofVerifier.verifyAgeProof(
                validProof.proof,
                validProof.publicSignals
            );

            expect(result.valid).to.be.true;
            expect(result.ageRequirementMet).to.be.true;
        });

        it('should reject tampered proof', async () => {
            // Tamper with the proof
            const tamperedProof = { ...validProof.proof };
            tamperedProof.pi_a[0] = '0';

            const result = await proofVerifier.verifyAgeProof(
                tamperedProof,
                validProof.publicSignals
            );

            expect(result.valid).to.be.false;
        });

        it('should prevent replay attacks', async () => {
            const usedProofs = new Set();

            // First verification should succeed
            const result1 = await proofVerifier.verifyWithReplayProtection(
                validProof.proof,
                validProof.publicSignals,
                validProof.proofId,
                usedProofs
            );

            expect(result1.valid).to.be.true;
            expect(result1.replayAttack).to.be.false;

            // Second verification with same proof should fail
            const result2 = await proofVerifier.verifyWithReplayProtection(
                validProof.proof,
                validProof.publicSignals,
                validProof.proofId,
                usedProofs
            );

            expect(result2.valid).to.be.false;
            expect(result2.replayAttack).to.be.true;
        });
    });

    describe('Performance', () => {
        it('should generate proof in under 5 seconds', async () => {
            const privateData = {
                birthYear: 1995,
                birthMonth: 3,
                birthDay: 15
            };

            const startTime = Date.now();
            await proofGenerator.generateAgeProof(privateData);
            const duration = Date.now() - startTime;

            expect(duration).to.be.lessThan(5000);
        });

        it('should verify proof in under 1 second', async () => {
            const privateData = {
                birthYear: 1995,
                birthMonth: 3,
                birthDay: 15
            };

            const proof = await proofGenerator.generateAgeProof(privateData);

            const startTime = Date.now();
            await proofVerifier.verifyAgeProof(proof.proof, proof.publicSignals);
            const duration = Date.now() - startTime;

            expect(duration).to.be.lessThan(1000);
        });
    });
});
