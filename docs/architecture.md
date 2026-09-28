# TRACELOCK Architecture Specification
**Problem Statement SIH260237 — Sensitive Document Broadcast & Forensic Attribution**

---

## 1. Architectural Philosophy

Conventional DRM and document security systems fail in broadcast models where multiple authorized users decrypt visually identical documents. If a leaked copy surfaces, server logs are insufficient evidence because server administrators or compromised root accounts can forge access logs.

TRACELOCK introduces an **independently auditable cryptographic pipeline** that bridges individual decryption with irreversible non-repudiation:
1. **Zero-Trust Broadcast Encryption**: A document payload is encrypted once under a symmetric key $K_{doc}$ using AES-256-GCM. The key $K_{doc}$ is encapsulated separately for each authorized recipient using their individual post-quantum public key (**ML-KEM-768**, NIST FIPS 203).
2. **Dynamic In-Enclave Watermarking**: At the moment of recipient decryption, the recipient's secure enclave decrypts $K_{doc}$, recovers the PDF, dynamically generates a unique forensic watermark, and embeds it invisibly into the decrypted file.
3. **Recipient-Signed Attestation**: The recipient's own private post-quantum signing key (**ML-DSA-65**, NIST FIPS 204) signs the canonical decryption event record.
4. **Offline Permissioned Tamper-Evident Ledger**: The signed event is appended to a local SHA3-256 hash-linked sequential ledger.
5. **Deterministic Forensic Attribution**: When a leaked copy is discovered, investigators extract the forensic watermark, look up the ledger entry, verify the recipient's ML-DSA-65 signature, validate the ledger continuity, and produce cryptographically indisputable attribution.

---

## 2. Dual Pipeline Dataflow

### Pipeline A: Secure Broadcast Distribution & Decryption
```
Plaintext PDF
      │
      ▼
Generate K_doc (AES-256)
      │
      ├───► Encrypt Document (AES-256-GCM) ──► Ciphertext Blob
      │
      └───► For each Recipient R_i:
               ML-KEM-768 Encapsulation(pk_i) ──► (Ciphertext_i, SharedSecret_i)
               Wrap K_doc with SharedSecret_i  ──► WrappedKey_i
               Package: {Ciphertext_i, WrappedKey_i}

[ RECIPIENT DECRYPTION EVENT ]
      │
      ▼
Recipient R_i decapsulates SharedSecret_i with ML-KEM private key
      │
Unwraps K_doc & Decrypts PDF Payload
      │
Generate Unique Watermark (WID, SID, RID, Nonce, SHA3 Checksum)
      │
Generate Canonical DecryptionEvent Record
      │
Recipient Signs Event with Own Private ML-DSA-65 Key
      │
Commit Event & Signature to Offline Permissioned Ledger (Block #N)
      │
Embed Invisible Forensic Watermark into Decrypted PDF
      │
Output Watermarked PDF to Recipient
```

### Pipeline B: Forensic Investigation & Attribution
```
Leaked PDF Ingestion
      │
      ▼
Compute SHA3-256 Document Hash
      │
Multi-Layer Forensic Watermark Extraction:
  - Layer 1: PDF Document Metadata Dictionary (/TL_WM_FORENSIC)
  - Layer 2: Document Catalog Dictionary (/TraceLockForensic)
  - Layer 3: Steganographic Zero-Width Annotation Stream (\u200B\u200C...)
      │
Recover Payload: {wid, did, rid, sid, dh, ts, n, chk}
      │
Verify SHA3-256 Watermark Checksum
      │
Query Offline Permissioned Ledger by Watermark ID
      │
Retrieve Block #{N}: Event Payload, Recipient ID, ML-DSA-65 Signature
      │
Retrieve Recipient Public Verification Key
      │
Verify NIST FIPS 204 ML-DSA-65 Signature on Canonical Event
      │
Audit Full Ledger Hash Chain Continuity (Genesis to Head)
      │
Produce Cryptographic Attribution Report:
  Status: CRYPTOGRAPHICALLY VERIFIED
  Attributed Recipient: Cdr. R. Iyer (RECIPIENT-047)
  Decryption Session: SES-8F29A1
  Evidence Chain: 7 Hops Fully Validated
```

---

## 3. Implementation Status Matrix

- **IMPLEMENTED**:
  - NIST FIPS 203 ML-KEM-768 key establishment and decapsulation.
  - NIST FIPS 204 ML-DSA-65 digital signature generation and verification.
  - Multi-recipient broadcast encryption with AES-256-GCM payload encryption.
  - Multi-layer invisible PDF steganographic watermarking.
  - Canonical decryption event hashing and signing.
  - Offline permissioned tamper-evident hash-linked ledger in SQLite.
  - End-to-end automated test suite verifying all 14 pipeline stages.
- **SIMULATED**:
  - Secure hardware token / HSM: In this prototype, recipient private keys are isolated in a local filesystem vault (`backend/data/keys/`) rather than physical smartcards or PKCS#11 hardware security modules.
- **PLANNED / FUTURE**:
  - Distributed multi-node consensus (RAFT / PBFT) across air-gapped validator nodes.
  - Hardware HSM (YubiKey / Nitrokey / PKCS#11) integration for recipient private keys.
  - Support for multi-format containers (DOCX, PPTX, MP4).
