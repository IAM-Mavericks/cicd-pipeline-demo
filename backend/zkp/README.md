# ZKP Infrastructure

This directory contains Zero-Knowledge Proof circuits and services for privacy-preserving identity verification.

## 🔐 What is ZKP?

Zero-Knowledge Proofs allow SznPay to verify user claims (like age or identity) **without storing sensitive data**. This is NDPR/POPIA compliant by design.

## 📁 Directory Structure

```
zkp/
├── circuits/           # Circom circuit definitions
│   ├── age_verification.circom
│   └── build/         # Compiled circuits (generated)
├── scripts/           # Build and setup scripts
│   ├── compile_circuits.sh
│   └── generate_keys.sh
├── services/          # Node.js proof generation/verification
│   ├── proofGenerator.js
│   └── proofVerifier.js
└── tests/             # Test suite
    └── zkp.test.js
```

## 🚀 Setup Instructions

### Prerequisites

1. **Install Rust** (required for Circom compiler):
```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
source $HOME/.cargo/env
```

2. **Install Circom**:
```bash
cargo install --git https://github.com/iden3/circom.git
```

3. **Install snarkjs** (globally):
```bash
npm install -g snarkjs
```

4. **Install Node dependencies**:
```bash
cd /Users/Shared/SznPay/workspace/sznpay-backend
npm install
```

### Build Circuits

1. **Compile circuits**:
```bash
./zkp/scripts/compile_circuits.sh
```

2. **Generate proving/verification keys**:
```bash
./zkp/scripts/generate_keys.sh
```

This will download the Powers of Tau ceremony file (~200MB) and generate PLONK keys.

## 🧪 Testing

Run the ZKP test suite:
```bash
npm test zkp/tests/zkp.test.js
```

Expected output:
- ✅ All tests pass
- ⏱️ Proof generation: <5 seconds
- ⏱️ Proof verification: <1 second

## 🔑 How It Works

### Age Verification Example

**Problem**: Prove user is 18+ without revealing their date of birth.

**Solution**:
1. User provides DOB privately (never stored)
2. Circuit generates mathematical proof: `age >= 18`
3. Backend verifies proof (no DOB needed)
4. Database stores: `{ ageVerified: true }` (no DOB!)

**Privacy Guarantee**: Even if database is breached, attacker cannot determine user's age.

## 📊 Circuit Details

### `age_verification.circom`

**Private Inputs** (never revealed):
- `birthYear`, `birthMonth`, `birthDay`

**Public Inputs** (verifiable):
- `currentYear`, `currentMonth`, `currentDay`
- `minAge` (default: 18)

**Output**:
- `isValid`: 1 if age ≥ minAge, 0 otherwise

**Constraints**: ~150 R1CS constraints (very efficient)

## 🛡️ Security Features

1. **Replay Protection**: Each proof has unique ID, used only once
2. **PLONK Setup**: Universal trusted setup (no per-circuit ceremony)
3. **Memory Safety**: Private data cleared after proof generation
4. **Audit Trail**: All verifications logged with timestamps

## 📈 Performance Benchmarks

| Operation | Server | Browser (WASM) |
|-----------|--------|----------------|
| Proof Generation | ~2s | ~4s |
| Proof Verification | ~100ms | ~200ms |
| Circuit Compilation | ~5s | N/A |

## 🔄 Integration with KYC

See `implementation_plan.md` for full integration details.

**Quick Integration**:
```javascript
const proofGenerator = require('./zkp/services/proofGenerator');
const proofVerifier = require('./zkp/services/proofVerifier');

// Generate proof
const dob = '1995-03-15'; // From BVN API
const privateData = proofGenerator.parseDateOfBirth(dob);
const { proof, publicSignals, proofId } = await proofGenerator.generateAgeProof(privateData);

// Verify proof
const result = await proofVerifier.verifyAgeProof(proof, publicSignals);
if (result.valid && result.ageRequirementMet) {
  // User is 18+, approve KYC
}
```

## 📚 Resources

- [Circom Documentation](https://docs.circom.io/)
- [snarkjs GitHub](https://github.com/iden3/snarkjs)
- [ZKP Compliance Report](../brain/ZKP_COMPLIANCE_REPORT.md)
