import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
DOCUMENTS_DIR = DATA_DIR / "documents"
KEYS_DIR = DATA_DIR / "keys"
LEDGER_DIR = DATA_DIR / "ledger"
DB_PATH = DATA_DIR / "tracelock.db"

# Ensure all offline storage directories exist
DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)
KEYS_DIR.mkdir(parents=True, exist_ok=True)
LEDGER_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    PROJECT_NAME: str = "TRACELOCK Cryptographic Attribution Backend"
    VERSION: str = "1.0.0"
    API_VERSION: str = "1.0.0"
    SIH_PROBLEM_STATEMENT: str = "SIH260237"
    
    # Air-Gapped Deployment Flags
    AIR_GAPPED_MODE: bool = True
    ALLOW_CLOUD_KMS: bool = False
    ALLOW_PUBLIC_BLOCKCHAIN: bool = False
    
    # Cryptographic Specifications
    KEM_ALGORITHM: str = "ML-KEM-768"
    ALGORITHM_KEM: str = "NIST FIPS 203 ML-KEM-768"
    KEM_STANDARD: str = "NIST FIPS 203"
    SIGNATURE_ALGORITHM: str = "ML-DSA-65"
    ALGORITHM_SIGNATURE: str = "NIST FIPS 204 ML-DSA-65"
    SIGNATURE_STANDARD: str = "NIST FIPS 204"
    SYMMETRIC_CIPHER: str = "AES-256-GCM"
    ALGORITHM_SYMMETRIC: str = "AES-256-GCM"
    HASH_ALGORITHM: str = "SHA3-256"
    ALGORITHM_HASH: str = "SHA3-256"
    WATERMARK_SCHEME: str = "Invisible Forensic Spread-Spectrum Steganography v2"

    # Database
    DATABASE_PATH: Path = DB_PATH
    DB_PATH: Path = DB_PATH
    LEDGER_DB_PATH: Path = LEDGER_DIR / "ledger.db"

settings = Settings()

