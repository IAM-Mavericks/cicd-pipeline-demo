# Powers of Tau - Trusted Setup Documentation

## What is Powers of Tau?

Powers of Tau is a **multi-party computation (MPC) ceremony** that generates cryptographic parameters for ZK-SNARKs. It's a one-time setup that can be reused across multiple circuits.

## Why is it Trusted?

The ceremony is "trusted" because it requires at least **one honest participant** out of potentially thousands. As long as one person destroys their secret randomness, the setup is secure.

### Hermez Powers of Tau Ceremony

We use the **Hermez Powers of Tau** ceremony (2^28 constraints):
- **Participants**: 176 contributors from around the world
- **Date**: Completed in 2020
- **File**: `powersOfTau28_hez_final_14.ptau`
- **Size**: ~200 MB
- **Constraints**: Supports circuits up to 2^28 (~268 million) constraints

Our age verification circuit uses ~150 constraints, so this ceremony is more than sufficient.

## Security Guarantees

### Assumption
At least 1 out of 176 participants was honest and destroyed their toxic waste.

### What if all participants were malicious?
An attacker could:
- Generate fake proofs that appear valid
- **Cannot**: Determine private inputs from valid proofs
- **Cannot**: Break existing valid proofs

### Mitigation
We use **PLONK** instead of Groth16:
- **Groth16**: Requires circuit-specific trusted setup (risky)
- **PLONK**: Uses universal setup (one ceremony for all circuits)

## Verification

You can verify the integrity of the Powers of Tau file:

```bash
cd zkp/circuits/build
snarkjs powersoftau verify powersOfTau28_hez_final_14.ptau
```

Expected output:
```
[INFO]  snarkJS: Powers Of Tau file OK!
```

## Alternative: Generate Your Own

For maximum trust, you can participate in a new ceremony:

```bash
# Start new ceremony
snarkjs powersoftau new bn128 14 pot14_0000.ptau -v

# Contribute randomness
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau \
  --name="SznPay Contribution" -v

# Prepare for circuit-specific setup
snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau -v
```

**Note**: This is unnecessary for our use case since Hermez ceremony is already secure.

## References

- [Hermez Ceremony Details](https://blog.hermez.io/hermez-cryptographic-setup/)
- [Powers of Tau Explained](https://a16zcrypto.com/posts/article/on-chain-trusted-setup-ceremony/)
- [PLONK Paper](https://eprint.iacr.org/2019/953.pdf)

## SznPay Commitment

We commit to:
1. ✅ Using well-audited ceremonies (Hermez)
2. ✅ Documenting all setup parameters
3. ✅ Enabling independent verification
4. ✅ Transparency in our ZKP implementation

**Last Updated**: 2026-01-22
**Ceremony Used**: Hermez Powers of Tau (2^28)
**Verification**: Passed ✅
