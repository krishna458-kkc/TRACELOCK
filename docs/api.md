# TRACELOCK REST API Specification
**Problem Statement SIH260237 — Air-Gapped Backend Endpoints**

Base URL: `http://127.0.0.1:8000`

---

## 1. System Health & Crypto Info

### `GET /health`
Returns enclave runtime status, confirming absence of cloud KMS and public blockchain dependencies.
- **Response `200 OK`**:
```json
{
  "status": "HEALTHY",
  "system": "TRACELOCK Cryptographic Attribution Backend",
  "version": "1.0.0",
  "air_gapped_enclave": true,
  "cloud_kms_dependency": false,
  "public_blockchain_dependency": false,
  "crypto_algorithms": {
    "key_establishment": "NIST FIPS 203 ML-KEM-768",
    "digital_signatures": "NIST FIPS 204 ML-DSA-65",
    "content_cipher": "AES-256-GCM",
    "cryptographic_hash": "SHA3-256"
  },
  "ledger_blocks_committed": 4,
  "timestamp": "2026-09-28T16:21:03.290574+00:00"
}
```

---

## 2. Recipient Management

### `POST /recipients`
Registers a new recipient and provisions their post-quantum ML-KEM-768 and ML-DSA-65 keypair inside the enclave vault.
- **Request Body**:
```json
{
  "recipient_id": "RECIPIENT-047",
  "name": "Cdr. R. Iyer",
  "role": "Chief Tactical Officer / Directorate of Naval Operations"
}
```
- **Response `201 Created`**: Returns public key information and fingerprints only. Private keys are never returned.

### `GET /recipients`
Lists all registered recipients and their cryptographic authorization status.

### `POST /recipients/{recipient_id}/authorize`
Activates or re-authorizes a recipient token.

### `POST /recipients/{recipient_id}/revoke`
Revokes recipient access, preventing further document decryptions.

---

## 3. Document Broadcast & Encryption

### `POST /documents`
Uploads a sensitive PDF document into the air-gapped enclave.
- **Form Data**:
  - `file`: PDF binary data (max 50MB)
  - `document_id`: Optional custom ID (e.g. `DOC-A71F`)

### `POST /documents/{document_id}/encrypt`
Broadcast-encrypts the document for the specified list of authorized recipients.
- **Request Body**:
```json
{
  "recipient_ids": ["RECIPIENT-021", "RECIPIENT-047", "RECIPIENT-063"]
}
```
- **Response `200 OK`**:
```json
{
  "document_id": "DOC-A71F",
  "is_encrypted": true,
  "authorized_recipients": ["RECIPIENT-021", "RECIPIENT-047", "RECIPIENT-063"],
  "document_hash": "49ff4425b7d51aa2422f6508c9c349c754ed356bfbd6b4c6049864b4bc2b236d",
  "content_cipher": "AES-256-GCM",
  "pqc_kem_algorithm": "NIST FIPS 203 ML-KEM-768",
  "recipient_encapsulations_count": 3
}
```

---

## 4. Decryption Sessions & In-Enclave Watermarking

### `POST /sessions/decrypt`
Executes individual decryption under the recipient's identity:
1. Verifies authorization.
2. Decapsulates content key with recipient's ML-KEM-768 private key.
3. Decrypts AES-256-GCM payload.
4. Generates dynamic session-bound forensic watermark.
5. Signs canonical event with recipient's ML-DSA-65 private key.
6. Commits block to offline permissioned ledger.
7. Embeds invisible watermark into PDF.
- **Request Body**:
```json
{
  "document_id": "DOC-A71F",
  "recipient_id": "RECIPIENT-047",
  "custom_session_id": "SES-8F29A1",
  "custom_watermark_id": "WM-72C9E41B"
}
```
- **Response `201 Created`**: Contains session metadata, ledger block ID, and watermarked document download URL.

---

## 5. Forensic Investigation & Attribution

### `POST /investigation/analyze`
Submits a suspected leaked PDF for automated multi-layer forensic extraction and cryptographic attribution.
- **Form Data**:
  - `file`: Leaked PDF document
- **Response `200 OK`**:
```json
{
  "investigation_id": "INV-A1B2C3",
  "filename": "leaked_brief.pdf",
  "leaked_doc_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "overall_status": "CRYPTOGRAPHICALLY VERIFIED",
  "watermark_extracted": true,
  "watermark_id": "WM-72C9E41B",
  "watermark_integrity_valid": true,
  "watermark_layer": "Layer 1: PDF Document Metadata Dictionary",
  "attributed_recipient_id": "RECIPIENT-047",
  "attributed_recipient_name": "Cdr. R. Iyer",
  "attributed_recipient_role": "Chief Tactical Officer / Directorate of Naval Operations",
  "session_id": "SES-8F29A1",
  "decryption_timestamp": "2026-09-28T14:32:17Z",
  "signature_verified": true,
  "signature_algorithm": "NIST FIPS 204 ML-DSA-65",
  "recipient_dsa_fingerprint": "9a38f4d1e2b5c78a...",
  "ledger_verified": true,
  "ledger_record_id": 1,
  "ledger_record_hash": "bca761f9c063d7dd...",
  "evidence_chain": [
    { "step": 1, "title": "Document Ingestion & Hash Generation", "status": "VERIFIED", ... },
    { "step": 2, "title": "Forensic Watermark Extraction", "status": "VERIFIED", ... },
    { "step": 3, "title": "Watermark Payload Integrity", "status": "VERIFIED", ... },
    { "step": 4, "title": "Offline Ledger Search", "status": "VERIFIED", ... },
    { "step": 5, "title": "Post-Quantum Signature Verification", "status": "VERIFIED", ... },
    { "step": 6, "title": "Ledger Tamper Audit", "status": "VERIFIED", ... },
    { "step": 7, "title": "Cryptographic Attribution", "status": "VERIFIED", ... }
  ]
}
```

---

## 6. Offline Ledger Audit

### `GET /ledger`
Lists all committed blocks in the sequential hash chain.

### `POST /ledger/validate`
Walks the entire ledger from Genesis to Head, checking previous hash links, block content integrity, and recipient signatures. Returns `VALID` or flags any tampering.
