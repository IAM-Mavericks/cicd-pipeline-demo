#!/bin/bash

# Compile Circom circuits and generate verification keys
# This script compiles all .circom files in the circuits directory

set -e

CIRCUITS_DIR="$(dirname "$0")/../circuits"
BUILD_DIR="$CIRCUITS_DIR/build"

echo "🔧 Compiling Circom circuits..."

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo "❌ Error: circom compiler not found"
    echo "Install with: cargo install --git https://github.com/iden3/circom.git"
    exit 1
fi

# Create build directory
mkdir -p "$BUILD_DIR"

# Compile age verification circuit
echo "📝 Compiling age_verification.circom..."
circom "$CIRCUITS_DIR/age_verification.circom" \
    --r1cs \
    --wasm \
    --sym \
    --c \
    -o "$BUILD_DIR"

# Compile solvency proof circuit
echo "📝 Compiling solvency_proof.circom..."
circom "$CIRCUITS_DIR/solvency_proof.circom" \
    --r1cs \
    --wasm \
    --sym \
    --c \
    -o "$BUILD_DIR"

echo "✅ Circuit compilation complete!"
echo "📁 Output directory: $BUILD_DIR"
echo ""
echo "Next steps:"
echo "1. Run ./generate_keys.sh to generate proving/verification keys"
echo "2. Run npm test to verify circuit functionality"
