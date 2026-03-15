# ZKP Setup Guide

## Quick Start (For Development)

### 1. Install Circom Compiler

**Option A: Using Cargo (Recommended)**
```bash
# Install Rust if not already installed
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
source $HOME/.cargo/env

# Install Circom
cargo install --git https://github.com/iden3/circom.git
```

**Option B: Download Pre-built Binary (macOS)**
```bash
# Download latest release
curl -L https://github.com/iden3/circom/releases/download/v2.1.6/circom-macos-amd64 -o circom
chmod +x circom
sudo mv circom /usr/local/bin/
```

Verify installation:
```bash
circom --version
# Should output: circom compiler 2.1.6
```

### 2. Install snarkjs Globally

```bash
npm install -g snarkjs@latest
```

Verify:
```bash
snarkjs --version
# Should output: snarkjs@0.7.x
```

### 3. Compile Circuits

```bash
cd /Users/Shared/SznPay/workspace/sznpay-backend
./zkp/scripts/compile_circuits.sh
```

Expected output:
```
🔧 Compiling Circom circuits...
📝 Compiling age_verification.circom...
✅ Circuit compilation complete!
```

### 4. Generate Keys

```bash
./zkp/scripts/generate_keys.sh
```

This will:
- Download Powers of Tau file (~200MB, one-time)
- Generate PLONK proving key
- Export verification key
- Generate Solidity verifier contract

**⏱️ Expected time**: 2-3 minutes

### 5. Run Tests

```bash
npm test zkp/tests/zkp.test.js
```

Expected results:
```
✓ should generate valid proof for user over 18
✓ should generate invalid proof for user under 18
✓ should verify valid proof
✓ should prevent replay attacks
✓ should generate proof in under 5 seconds
```

---

## Troubleshooting

### Error: "circom: command not found"

**Solution**: Add Cargo bin to PATH
```bash
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Error: "Cannot find module 'snarkjs'"

**Solution**: Install dependencies
```bash
cd /Users/Shared/SznPay/workspace/sznpay-backend
npm install
```

### Error: "Powers of Tau download failed"

**Solution**: Manual download
```bash
cd zkp/circuits/build
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau
```

### Slow Proof Generation (>10 seconds)

**Possible causes**:
1. Running on low-powered device
2. Circuit not optimized
3. Using Groth16 instead of PLONK

**Solution**: Ensure using PLONK (already configured in scripts)

---

## Production Deployment Checklist

- [ ] Compile circuits with `--O2` optimization flag
- [ ] Store verification keys in secure location (not in git)
- [ ] Implement proof caching to avoid regeneration
- [ ] Set up monitoring for proof generation times
- [ ] Configure rate limiting on proof endpoints
- [ ] Enable proof replay protection in production DB
- [ ] Document trusted setup parameters
- [ ] Perform security audit of circuits

---

## Next Steps

After setup is complete:

1. **Test the full flow**:
   ```bash
   npm test zkp/tests/zkp.test.js
   ```

2. **Integrate with KYC** (Phase 3.2):
   - Modify `/routes/kyc.js`
   - Add ZKP proof generation step
   - Update database schema for `zkpProofId`

3. **Build Privacy Dashboard** (Phase 3.4):
   - Create `/pages/Privacy.tsx`
   - Show ZKP verification status
   - Display proof-of-solvency

---

## Architecture Overview

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │ DOB (private)
       ▼
┌─────────────────────┐
│  Proof Generator    │
│  (Backend Service)  │
│                     │
│  Input: DOB         │
│  Output: ZK Proof   │
└──────┬──────────────┘
       │ Proof + Public Signals
       ▼
┌─────────────────────┐
│  Proof Verifier     │
│  (Backend Service)  │
│                     │
│  Verifies: age≥18   │
│  Stores: ageVerified│
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│    Database         │
│                     │
│  ✅ ageVerified     │
│  ❌ NO DOB stored   │
└─────────────────────┘
```

**Privacy Guarantee**: Even with full database access, an attacker cannot determine the user's date of birth.
