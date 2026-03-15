const snarkjs = require('snarkjs');
const path = require('path');
const fs = require('fs').promises;

/**
 * ZKP Proof Verifier Service
 * Verifies zero-knowledge proofs for multiple circuits
 */
class ProofVerifierService {
    constructor() {
        this.circuits = {
            age: {
                vkeyPath: path.join(__dirname, '../circuits/build/age_verification_vkey.json')
            },
            solvency: {
                vkeyPath: path.join(__dirname, '../circuits/build/solvency_proof_vkey.json')
            }
        };
        this.vkeys = {};
    }

    async _loadVKey(circuitKey) {
        if (!this.vkeys[circuitKey]) {
            const circuit = this.circuits[circuitKey];
            if (!circuit) throw new Error(`Unknown circuit: ${circuitKey}`);

            const vkeyData = await fs.readFile(circuit.vkeyPath, 'utf8');
            this.vkeys[circuitKey] = JSON.parse(vkeyData);
            console.log(`✅ ${circuitKey} verification key loaded`);
        }
        return this.vkeys[circuitKey];
    }

    /**
     * Verify age verification proof
     */
    async verifyAgeProof(proof, publicSignals) {
        const result = await this._verify('age', proof, publicSignals);
        return {
            ...result,
            ageRequirementMet: publicSignals[0] === '1'
        };
    }

    /**
     * Verify solvency proof
     */
    async verifySolvencyProof(proof, publicSignals) {
        const result = await this._verify('solvency', proof, publicSignals);
        // Solvency circuit has no specific output flag, successful verification means:
        // 1. Inclusion proof is valid
        // 2. Sum matches root
        // 3. RootSum <= totalReserves
        return result;
    }

    /**
     * Internal verification logic
     * @private
     */
    async _verify(circuitKey, proof, publicSignals) {
        try {
            console.log(`🔍 Verifying ZK proof for ${circuitKey}...`);
            const startTime = Date.now();

            const vkey = await this._loadVKey(circuitKey);
            const isValid = await snarkjs.plonk.verify(vkey, publicSignals, proof);

            const duration = Date.now() - startTime;
            console.log(`✅ ${circuitKey} proof verified in ${duration}ms - Result: ${isValid}`);

            return {
                valid: isValid,
                verifiedAt: new Date().toISOString(),
                duration
            };
        } catch (error) {
            console.error(`❌ ${circuitKey} verification failed:`, error);
            return {
                valid: false,
                error: error.message,
                verifiedAt: new Date().toISOString()
            };
        }
    }

    /**
     * Verify with replay protection
     */
    async verifyWithReplayProtection(circuitKey, proof, publicSignals, proofId, usedProofs) {
        if (usedProofs.has(proofId)) {
            return {
                valid: false,
                error: 'Proof has already been used (replay attack prevented)',
                replayAttack: true
            };
        }

        const result = await (circuitKey === 'age'
            ? this.verifyAgeProof(proof, publicSignals)
            : this.verifySolvencyProof(proof, publicSignals));

        if (result.valid) {
            usedProofs.add(proofId);
        }

        return {
            ...result,
            replayAttack: false
        };
    }
}

module.exports = new ProofVerifierService();
