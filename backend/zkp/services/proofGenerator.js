const snarkjs = require('snarkjs');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

/**
 * ZKP Proof Generator Service
 * Generates zero-knowledge proofs for multiple circuits
 */
class ProofGeneratorService {
    constructor() {
        this.circuits = {
            age: {
                wasm: path.join(__dirname, '../circuits/build/age_verification_js/age_verification.wasm'),
                zkey: path.join(__dirname, '../circuits/build/age_verification_final.zkey')
            },
            solvency: {
                wasm: path.join(__dirname, '../circuits/build/solvency_proof_js/solvency_proof.wasm'),
                zkey: path.join(__dirname, '../circuits/build/solvency_proof_final.zkey')
            }
        };
    }

    /**
     * Generate age verification proof
     */
    async generateAgeProof(privateData, publicData = {}) {
        const input = {
            birthYear: privateData.birthYear,
            birthMonth: privateData.birthMonth,
            birthDay: privateData.birthDay,
            currentYear: publicData.currentYear || new Date().getFullYear(),
            currentMonth: publicData.currentMonth || new Date().getMonth() + 1,
            currentDay: publicData.currentDay || new Date().getDate(),
            minAge: publicData.minAge || 18
        };

        return this._generateProof('age', input);
    }

    /**
     * Generate solvency inclusion proof
     * @param {Object} proofData - Data from MerkleSumTree.getProof()
     * @param {Object} publicData - { expectedRootHash, expectedRootSum, totalReserves }
     */
    async generateSolvencyProof(proofData, publicData) {
        const input = {
            userId: proofData.userId,
            balance: proofData.balance,
            pathElements: proofData.pathElements,
            pathIndices: proofData.pathIndices,
            siblingSums: proofData.siblingSums,
            expectedRootHash: publicData.expectedRootHash,
            expectedRootSum: publicData.expectedRootSum,
            totalReserves: publicData.totalReserves
        };

        return this._generateProof('solvency', input);
    }

    /**
     * Internal proof generation logic
     * @private
     */
    async _generateProof(circuitKey, input) {
        try {
            const circuit = this.circuits[circuitKey];
            if (!circuit) throw new Error(`Unknown circuit: ${circuitKey}`);

            console.log(`🔐 Generating ZK proof for ${circuitKey}...`);
            const startTime = Date.now();

            const { proof, publicSignals } = await snarkjs.plonk.fullProve(
                input,
                circuit.wasm,
                circuit.zkey
            );

            const duration = Date.now() - startTime;
            console.log(`✅ ${circuitKey} proof generated in ${duration}ms`);

            const proofId = this._generateProofId(proof, publicSignals);

            return {
                proof,
                publicSignals,
                proofId,
                generatedAt: new Date().toISOString(),
                duration
            };
        } catch (error) {
            console.error(`❌ ${circuitKey} proof generation failed:`, error);
            throw new Error(`ZKP proof generation failed: ${error.message}`);
        }
    }

    _generateProofId(proof, publicSignals) {
        const data = JSON.stringify({ proof, publicSignals });
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }

    parseDateOfBirth(dob) {
        const date = typeof dob === 'string' ? new Date(dob) : dob;
        if (isNaN(date.getTime())) throw new Error('Invalid date of birth format');

        return {
            birthYear: date.getFullYear(),
            birthMonth: date.getMonth() + 1,
            birthDay: date.getDate()
        };
    }
}

module.exports = new ProofGeneratorService();
