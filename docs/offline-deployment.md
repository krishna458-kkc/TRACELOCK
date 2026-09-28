# TRACELOCK Offline & Air-Gapped Deployment Guide
**Problem Statement SIH260237 — SCIF & Isolated Enclave Operation**

---

## 1. Air-Gapped Operational Compliance

TRACELOCK is designed to run in sensitive compartmentalized information facilities (SCIF) with physical and logical air gaps:
- **No Internet Access Required**: All dependencies can be packaged into wheel files or offline bundle archives.
- **Zero Cloud KMS Calls**: Key generation, decapsulation, and digital signing are executed within the local cryptographic enclave.
- **Zero External Blockchain / RPC Calls**: The permissioned tamper-evident ledger resides locally on disk without connecting to public Ethereum, Bitcoin, or third-party web3 providers.
- **Zero Remote Tracking**: Watermarking, extraction, and verification occur entirely in memory and local secure storage.

---

## 2. Packaging for Air-Gapped Enclaves

### 2.1 Pre-packaging Python Wheels (Internet-connected workstation)
```bash
# 1. Download all required wheels to an offline directory
mkdir tracelock-wheels
pip download -r backend/requirements.txt -d tracelock-wheels/

# 2. Package frontend static assets
pnpm build
```

### 2.2 Transfer to Air-Gapped Target via One-Way Data Diode
Transfer the code repository and `tracelock-wheels/` folder to the air-gapped system.

### 2.3 Installation inside Air-Gapped Enclave
```bash
# 1. Install wheels without internet
pip install --no-index --find-links=tracelock-wheels/ -r backend/requirements.txt

# 2. Start TRACELOCK Backend
python backend/run.py
```

---

## 3. Storage & Enclave Isolation Structure

All sensitive data generated at runtime is strictly confined to `backend/data/`:
- `data/documents/`: Plaintext source files and encrypted AES-256-GCM ciphertexts.
- `data/keys/`: Recipient post-quantum keypairs (simulating hardware token vaults). File permissions should be restricted to `0600` (read/write by application process only).
- `data/ledger/`: Append-only SQLite hash-chained database (`ledger.db`).
- `data/tracelock.db`: Operational relational metadata database.

---

## 4. Verification in Air-Gapped Environment

Once deployed inside the enclave, verify full functionality by running:
```bash
# Verify health endpoint flags
curl http://127.0.0.1:8000/health

# Run complete self-test
python -m pytest backend/tests -v
```
If all 10 tests pass, the enclave is mathematically sound and ready for operational use.
