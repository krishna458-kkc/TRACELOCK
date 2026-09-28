# TRACELOCK Security Model
**Problem Statement SIH260237 — Cryptographic Integrity & Threat Mitigation**

---

## 1. Threat Model & Adversarial Assumptions

| Threat Scenario | Conventional System Vulnerability | TRACELOCK Defense Mechanism |
| :--- | :--- | :--- |
| **Untrusted / Rogue Administrator** | Administrators can modify audit logs or database tables to frame or exonerate suspects. | Decryption events are signed by the **recipient's own private ML-DSA-65 key**. Administrators do not possess recipient private keys and cannot forge valid signatures. |
| **Post-Quantum Adversary (Harvest Now, Decrypt Later)** | Classical RSA/ECDSA/Diffie-Hellman encryption compromised by future quantum computers (Shor's Algorithm). | All key establishment uses **NIST FIPS 203 ML-KEM-768** and all signatures use **NIST FIPS 204 ML-DSA-65**, offering 128-bit post-quantum security margin. |
| **Watermark Stripping / Scrubbing** | Attackers use PDF metadata strippers to eliminate standard `/Author` or `/Title` fields. | Multi-layer watermarking: even if `/TL_WM_FORENSIC` metadata is cleared, the zero-width steganographic stream (`\u200B\u200C...`) embedded in first-page annotations and stream objects persists and is recoverable. |
| **Ledger History Modification** | Attacker tampers with a historical database record or removes an incriminating block. | Sequential SHA3-256 block linking: altering any record invalidates the block hash and breaks the cryptographic link with all subsequent blocks. The validator immediately flags the tampering. |
| **Recipient Deniability (Repudiation)** | Suspect claims "the server simply generated that session record without my knowledge." | Non-repudiation: Decryption requires the recipient's private ML-DSA-65 key to sign the canonical event before decryption payload is delivered. |

---

## 2. Cryptographic Algorithms & Parameters

### 2.1 Key Encapsulation (ML-KEM-768)
- Standard: NIST FIPS 203
- Public Key Size: 1,184 bytes
- Secret Key Size: 2,400 bytes
- Ciphertext Size: 1,088 bytes
- Shared Secret Size: 32 bytes (256-bit high-entropy key)
- Security Category: NIST Level 3 (equivalent to AES-192 against classical and AES-128 against quantum)

### 2.2 Digital Signatures (ML-DSA-65)
- Standard: NIST FIPS 204
- Public Verification Key Size: 1,952 bytes
- Private Signing Key Size: 4,032 bytes
- Signature Size: 3,309 bytes
- Security Category: NIST Level 3

### 2.3 Symmetric Encryption (AES-256-GCM)
- Standard: NIST SP 800-38D
- Key Size: 256 bits
- Nonce Size: 96 bits (12 bytes, cryptographically randomized per encryption)
- Tag Size: 128 bits (16 bytes authenticated tag)

### 2.4 Hashing (SHA3-256)
- Standard: NIST FIPS 202
- Digest Size: 256 bits (32 bytes)
- Keccak permutation sponge construction

---

## 3. Strict Boundary Rules

1. **Zero Cloud Dependencies**: The system executes without network access, AWS KMS, Azure Key Vault, Google Cloud KMS, or public blockchains.
2. **Key Isolation**: Private keys are strictly confined to the local recipient vault and never transmitted over REST APIs, returned in responses, or stored in frontend bundles.
3. **No Man-in-the-Middle Admin Signatures**: The server never signs on behalf of the recipient. The recipient's token produces the signature over the canonical decryption event.
