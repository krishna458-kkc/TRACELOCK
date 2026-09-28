# TRACELOCK Air-Gapped Backend Prototype
**Smart India Hackathon 2026 — Problem Statement SIH260237**  
*Broadcast-Encrypt, Individually-Decrypt Forensic Attribution Architecture*

---

## 1. System Overview

TRACELOCK addresses the fundamental vulnerability of sensitive document broadcast distribution:
When an encrypted document is distributed to authorized recipients, conventional individual decryption yields visually identical copies. If leaked, all authorized recipients are equally plausible suspects.

TRACELOCK solves this through:
1. **Broadcast-Encrypt, Individually-Decrypt Pipeline**: The document payload is encrypted once using symmetric authenticated encryption (**AES-256-GCM**), while individual recipient access is governed by **NIST FIPS 203 ML-KEM-768** key encapsulation.
2. **Invisible Forensic Watermarking**: At the moment of recipient decryption, a dynamic, session- and recipient-bound forensic payload is generated and invisibly embedded into the document across structural metadata and steganographic zero-width character streams.
3. **Post-Quantum Decryption Attestation**: The recipient's own **NIST FIPS 204 ML-DSA-65** private signing key creates a cryptographic digital signature over the canonical decryption event.
4. **Offline Permissioned Tamper-Evident Ledger**: The signed event is recorded into a local sequential hash-linked ledger (SHA3-256 blocks), ensuring tamper-evident non-repudiation without external network dependency.
5. **Cryptographic Attribution Engine**: When a leaked document is submitted, the system extracts the invisible watermark, looks up the corresponding ledger block, verifies the ML-DSA-65 signature, audits ledger continuity, and establishes indisputable forensic attribution.

---

## 2. Technology & Security Standard Alignment

| Component | Standard / Technology | Implementation Status |
| :--- | :--- | :--- |
| **Key Establishment (KEM)** | NIST FIPS 203 (ML-KEM-768) | **IMPLEMENTED** (Compiled C library `pqcrypto`) |
| **Digital Signatures (DSA)** | NIST FIPS 204 (ML-DSA-65) | **IMPLEMENTED** (Compiled C library `pqcrypto`) |
| **Symmetric Payload Cipher** | NIST SP 800-38D (AES-256-GCM) | **IMPLEMENTED** (`cryptography.hazmat`) |
| **Cryptographic Hashing** | NIST FIPS 202 (SHA3-256) | **IMPLEMENTED** (Standard library hashlib) |
| **Steganographic Watermarking**| Multi-Layer Metadata & Zero-Width Stream | **IMPLEMENTED** (`pypdf` + custom codec) |
| **Ledger Architecture** | Offline Tamper-Evident SHA3 Hash-Chain | **IMPLEMENTED** (SQLite append-only) |
| **Key Storage** | Local Secure Enclave Key Vault | **SIMULATED** (Software vault emulating hardware HSMs) |
| **Multi-Node Distributed DLT** | Multi-replica consensus / RAFT / PBFT | **PLANNED / FUTURE ROADMAP** |

---

## 3. Directory Layout

```
backend/
├── app/
│   ├── api/                 # REST Endpoints
│   │   ├── health.py        # Enclave health and crypto parameters
│   │   ├── documents.py     # Document upload & broadcast encryption
│   │   ├── recipients.py    # Recipient registration & authorization
│   │   ├── sessions.py      # Individual decryption session endpoints
│   │   ├── investigation.py # Forensic leak ingestion & attribution
│   │   ├── ledger.py        # Ledger block querying and audit
│   │   └── crypto.py        # PQC signature verification endpoints
│   ├── core/
│   │   └── config.py        # Air-gapped paths & security constants
│   ├── crypto/
│   │   ├── hashing.py       # SHA3-256 & SHA-256 cryptographic hashing
│   │   ├── key_manager.py   # Secure enclave key vault (HSM emulation)
│   │   ├── pqc.py           # ML-KEM-768 & ML-DSA-65 wrappers
│   │   └── symmetric.py     # AES-256-GCM payload encryption
│   ├── ledger/
│   │   ├── chain.py         # Sequential hash-chain append engine
│   │   ├── models.py        # DecryptionEvent & LedgerRecord schemas
│   │   ├── storage.py       # Append-only SQLite persistence layer
│   │   └── validator.py     # Comprehensive tamper & audit engine
│   ├── schemas/             # Pydantic request & response models
│   ├── services/            # Business & cryptographic services
│   ├── storage/             # SQLite database and ORM tables
│   ├── watermark/           # Dynamic forensic watermarking pipeline
│   │   ├── embedder.py      # Multi-layer invisible PDF embedder
│   │   ├── extractor.py     # Multi-layer forensic extractor
│   │   ├── generator.py     # Payload structure & checksum generator
│   │   └── verifier.py      # Payload integrity verifier
│   └── main.py              # FastAPI application & startup seeder
├── tests/                   # Pytest automated test suite
├── requirements.txt         # Offline dependencies
└── run.py                   # Local Uvicorn runner
```

---

## 4. Quick Start

### 4.1 Prerequisites
- Python 3.10+ (tested on Python 3.14.7)
- Virtual environment or local Python environment

### 4.2 Installation
```bash
cd backend
pip install -r requirements.txt
```

### 4.3 Running the Server
```bash
python run.py
```
Server starts on `http://127.0.0.1:8000`.  
Interactive OpenAPI documentation is accessible at `http://127.0.0.1:8000/docs`.

### 4.4 Running Automated Tests
```bash
python -m pytest tests -v
```
All 10 unit and integration tests validate offline without external network access.
