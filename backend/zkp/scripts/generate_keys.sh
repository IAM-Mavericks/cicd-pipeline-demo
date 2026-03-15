#!/bin/bash

# Generate PLONK proving and verification keys
# Uses Powers of Tau ceremony for trusted setup

set -e

CIRCUITS_DIR="$(dirname "$0")/../circuits"
BUILD_DIR="$CIRCUITS_DIR/build"
PTAU_FILE="$BUILD_DIR/powersOfTau28_hez_final_14.ptau"

echo "🔑 Generating ZKP keys using PLONK..."

# Check if snarkjs is installed
if ! command -v snarkjs &> /dev/null; then
    echo "❌ Error: snarkjs not found"
    echo "Install with: npm install -g snarkjs"
    exit 1
fi

# Download Powers of Tau if not exists
if [ ! -f "$PTAU_FILE" ]; then
    echo "📥 Downloading Powers of Tau ceremony file..."
    curl -L -o "$PTAU_FILE" https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_14.ptau
fi

# Generate PLONK setup for age verification
echo "🔐 Generating PLONK setup for age_verification..."
snarkjs plonk setup \
    "$BUILD_DIR/age_verification.r1cs" \
    "$PTAU_FILE" \
    "$BUILD_DIR/age_verification_final.zkey"

# Export verification key
echo "📤 Exporting verification key..."
snarkjs zkey export verificationkey \
    "$BUILD_DIR/age_verification_final.zkey" \
    "$BUILD_DIR/age_verification_vkey.json"

# Generate Solidity verifier (for future blockchain integration)
echo "📜 Generating Solidity verifier contract..."
snarkjs zkey export solidityverifier \
    "$BUILD_DIR/age_verification_final.zkey" \
    "$BUILD_DIR/AgeVerificationVerifier.sol"

# Generate PLONK setup for solvency proof
echo "🔐 Generating PLONK setup for solvency_proof..."
snarkjs plonk setup \
    "$BUILD_DIR/solvency_proof.r1cs" \
    "$PTAU_FILE" \
    "$BUILD_DIR/solvency_proof_final.zkey"

# Export verification key
echo "📤 Exporting solvency verification key..."
snarkjs zkey export verificationkey \
    "$BUILD_DIR/solvency_proof_final.zkey" \
    "$BUILD_DIR/solvency_proof_vkey.json"

# Generate Solidity verifier
echo "📜 Generating Solvency Solidity verifier contract..."
snarkjs zkey export solidityverifier \
    "$BUILD_DIR/solvency_proof_final.zkey" \
    "$BUILD_DIR/SolvencyVerifier.sol"

echo "✅ Key generation complete!"
echo "📁 Verification key: $BUILD_DIR/age_verification_vkey.json"
echo "📁 Proving key: $BUILD_DIR/age_verification_final.zkey"
