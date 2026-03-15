/**
 * ZKP Verification Utility
 * Client-side verification of Zero-Knowledge Proofs for Proof-of-Solvency
 */

import { toast } from 'sonner';

// Lazy-load snarkjs to avoid bloating the initial bundle
let snarkjs: any = null;

async function loadSnarkjs() {
    if (!snarkjs) {
        snarkjs = await import('snarkjs');
    }
    return snarkjs;
}

export interface SolvencyProof {
    proof: any;
    publicSignals: string[];
}

export interface VerificationResult {
    valid: boolean;
    verifiedAt: string;
    duration?: number;
    error?: string;
}

/**
 * Verify a Proof-of-Solvency ZKP on the client side
 * @param proof - The ZKP proof object
 * @param publicSignals - Public signals (expectedRootHash, expectedRootSum, totalReserves)
 * @returns Verification result
 */
export async function verifySolvencyProof(
    proof: any,
    publicSignals: string[]
): Promise<VerificationResult> {
    try {
        const startTime = Date.now();

        // Load snarkjs dynamically
        const snarkjsLib = await loadSnarkjs();

        // Fetch the verification key from the backend
        const vkeyResponse = await fetch(
            `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001'}/zkp/solvency_proof_vkey.json`
        );

        if (!vkeyResponse.ok) {
            throw new Error('Failed to load verification key');
        }

        const vkey = await vkeyResponse.json();

        // Perform verification using snarkjs
        const isValid = await snarkjsLib.plonk.verify(vkey, publicSignals, proof);

        const duration = Date.now() - startTime;

        return {
            valid: isValid,
            verifiedAt: new Date().toISOString(),
            duration
        };
    } catch (error: any) {
        console.error('ZKP Verification failed:', error);
        return {
            valid: false,
            verifiedAt: new Date().toISOString(),
            error: error.message || 'Unknown verification error'
        };
    }
}

/**
 * Verify Merkle Path inclusion (non-cryptographic, for educational purposes)
 * This shows the user how their balance contributes to the root sum
 */
export function verifyMerklePath(
    userId: string,
    balance: number,
    pathElements: string[],
    pathIndices: number[],
    siblingSums: string[],
    expectedRootHash: string,
    expectedRootSum: string
): { valid: boolean; steps: string[] } {
    const steps: string[] = [];

    steps.push(`🔍 Starting Merkle Path Verification for User: ${userId}`);
    steps.push(`💰 Your Balance: ${(balance / 1e8).toFixed(2)} NGN`);
    steps.push(`🌳 Tree Depth: ${pathElements.length} levels`);

    let currentSum = balance;
    steps.push(`📊 Level 0: Sum = ${(currentSum / 1e8).toFixed(2)} NGN`);

    for (let i = 0; i < pathElements.length; i++) {
        const siblingSum = BigInt(siblingSums[i]);
        const direction = pathIndices[i] === 0 ? 'LEFT' : 'RIGHT';

        currentSum = currentSum + Number(siblingSum);
        steps.push(
            `📊 Level ${i + 1}: Adding ${direction} sibling (${(Number(siblingSum) / 1e8).toFixed(2)} NGN) → Sum = ${(currentSum / 1e8).toFixed(2)} NGN`
        );
    }

    const finalSum = currentSum.toString();
    const matches = finalSum === expectedRootSum;

    steps.push(`\n🎯 Expected Root Sum: ${(Number(expectedRootSum) / 1e8).toFixed(2)} NGN`);
    steps.push(`🎯 Calculated Sum: ${(Number(finalSum) / 1e8).toFixed(2)} NGN`);
    steps.push(matches ? '✅ Sums Match!' : '❌ Sums Do Not Match!');

    return {
        valid: matches,
        steps
    };
}

/**
 * Full verification flow: Merkle Path + ZKP
 */
export async function verifyFullSolvencyProof(
    inclusionProof: any,
    zkProof: any,
    publicSignals: string[]
): Promise<{
    merkleValid: boolean;
    zkpValid: boolean;
    steps: string[];
    zkpResult: VerificationResult;
}> {
    // Step 1: Verify Merkle Path (educational)
    const merkleVerification = verifyMerklePath(
        inclusionProof.userId,
        inclusionProof.balance,
        inclusionProof.pathElements,
        inclusionProof.pathIndices,
        inclusionProof.siblingSums,
        publicSignals[0], // expectedRootHash
        publicSignals[1]  // expectedRootSum
    );

    // Step 2: Verify ZKP (cryptographic)
    const zkpResult = await verifySolvencyProof(zkProof, publicSignals);

    return {
        merkleValid: merkleVerification.valid,
        zkpValid: zkpResult.valid,
        steps: merkleVerification.steps,
        zkpResult
    };
}
