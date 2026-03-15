pragma circom 2.1.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/switcher.circom";

/**
 * Proof of Solvency Circuit (Merkle Sum Tree)
 * 
 * This circuit proves that:
 * 1. A user's account (userId, balance) is included in SznPay's Merkle Sum Tree.
 * 2. The total sum of all user balances (liabilities) is exactly as claimed in the root.
 * 3. The total liabilities do not exceed the company's verified reserves.
 * 
 * levels: The height of the Merkle Sum Tree (e.g., 20 levels supports ~1M users)
 */
template SolvencyProof(levels) {
    // --- Private Inputs ---
    signal input userId;
    signal input balance;
    
    // Merkle Path
    signal input pathElements[levels];  // Sibling hashes
    signal input pathIndices[levels];   // 0 if node is left child, 1 if right child
    signal input siblingSums[levels];    // Sibling balances

    // --- Public Inputs ---
    signal input expectedRootHash;
    signal input expectedRootSum;
    signal input totalReserves;

    // 1. Calculate leaf hash
    component leafHasher = Poseidon(2);
    leafHasher.inputs[0] <== userId;
    leafHasher.inputs[1] <== balance;
    signal leafHash <== leafHasher.out;

    // 2. Traversal up the Merkle Sum Tree
    signal currentHash[levels + 1];
    signal currentSum[levels + 1];
    currentHash[0] <== leafHash;
    currentSum[0] <== balance;

    component hashSwitchers[levels];
    component sumSwitchers[levels];
    component hashers[levels];
    
    for (var i = 0; i < levels; i++) {
        // Switcher ensures we order children correctly before hashing
        hashSwitchers[i] = Switcher();
        hashSwitchers[i].sel <== pathIndices[i];
        hashSwitchers[i].L <== currentHash[i];
        hashSwitchers[i].R <== pathElements[i];
        
        sumSwitchers[i] = Switcher();
        sumSwitchers[i].sel <== pathIndices[i];
        sumSwitchers[i].L <== currentSum[i];
        sumSwitchers[i].R <== siblingSums[i];
        
        // Poseidon hasher for parent node (leftHash, leftSum, rightHash, rightSum)
        hashers[i] = Poseidon(4);
        hashers[i].inputs[0] <== hashSwitchers[i].outL;
        hashers[i].inputs[1] <== sumSwitchers[i].outL;
        hashers[i].inputs[2] <== hashSwitchers[i].outR;
        hashers[i].inputs[3] <== sumSwitchers[i].outR;
        
        // Propagate hash and accumulated sum
        currentHash[i + 1] <== hashers[i].out;
        currentSum[i + 1] <== sumSwitchers[i].outL + sumSwitchers[i].outR;
    }

    // 3. Verify consistency with public commitments
    currentHash[levels] === expectedRootHash;
    currentSum[levels] === expectedRootSum;

    // 4. Verify Solvency (Reserves >= Liabilities)
    component solvencyCheck = LessEqThan(64);
    solvencyCheck.in[0] <== expectedRootSum;
    solvencyCheck.in[1] <== totalReserves;
    solvencyCheck.out === 1;
}

// Instantiate with 10 levels (1,024 users capacity)
component main {public [expectedRootHash, expectedRootSum, totalReserves]} = SolvencyProof(10);
