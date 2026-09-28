from fastapi import APIRouter
from pydantic import BaseModel, Field
from app.crypto.pqc import PQCVerifier
from app.core.config import settings

router = APIRouter(prefix="/crypto", tags=["Post-Quantum Cryptography"])

class VerifySignatureRequest(BaseModel):
    public_key_b64: str = Field(..., description="Recipient's ML-DSA-65 public key in base64")
    message: str = Field(..., description="Canonical message string")
    signature_hex: str = Field(..., description="Recipient's ML-DSA-65 signature in hex")

class VerifySignatureResponse(BaseModel):
    is_valid: bool
    algorithm: str = "NIST FIPS 204 ML-DSA-65"
    message: str

@router.post("/verify-signature", response_model=VerifySignatureResponse)
def verify_signature(payload: VerifySignatureRequest):
    is_valid, msg = PQCVerifier.verify_mldsa(
        public_key_b64=payload.public_key_b64,
        message=payload.message.encode("utf-8"),
        signature_hex=payload.signature_hex
    )
    return VerifySignatureResponse(
        is_valid=is_valid,
        algorithm=settings.ALGORITHM_SIGNATURE,
        message=msg
    )

@router.get("/algorithms")
def get_algorithms():
    return {
        "pqc_kem": {
            "standard": "NIST FIPS 203",
            "algorithm": "ML-KEM-768",
            "security_level": "NIST Security Category 3 (128-bit quantum security)",
            "purpose": "Post-Quantum Recipient Key Establishment / Content Key Decapsulation"
        },
        "pqc_signature": {
            "standard": "NIST FIPS 204",
            "algorithm": "ML-DSA-65",
            "security_level": "NIST Security Category 3 (128-bit quantum security)",
            "purpose": "Post-Quantum Recipient Decryption Event Signing & Non-Repudiation"
        },
        "symmetric_cipher": {
            "standard": "NIST SP 800-38D",
            "algorithm": "AES-256-GCM",
            "purpose": "High-throughput Authenticated Document Payload Encryption"
        },
        "hash_function": {
            "standard": "NIST FIPS 202",
            "algorithm": "SHA3-256",
            "purpose": "Ledger Block Hashing, Watermark Checksums, Document Integrity Verification"
        }
    }
