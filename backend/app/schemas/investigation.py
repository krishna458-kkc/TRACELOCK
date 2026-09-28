from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class EvidenceHop(BaseModel):
    step: int
    title: str
    status: str
    details: str
    cryptographic_proof: Optional[str] = None

class InvestigationResponse(BaseModel):
    investigation_id: str
    filename: str
    leaked_doc_hash: str
    overall_status: str  # CRYPTOGRAPHICALLY VERIFIED or VERIFICATION FAILED
    watermark_extracted: bool
    watermark_id: Optional[str] = None
    watermark_integrity_valid: bool
    watermark_layer: Optional[str] = None
    
    # Attribution
    attributed_recipient_id: Optional[str] = None
    attributed_recipient_name: Optional[str] = None
    attributed_recipient_role: Optional[str] = None
    session_id: Optional[str] = None
    decryption_timestamp: Optional[str] = None
    
    # Cryptographic Proofs
    signature_verified: bool
    signature_algorithm: str = "NIST FIPS 204 ML-DSA-65"
    recipient_dsa_fingerprint: Optional[str] = None
    ledger_verified: bool
    ledger_record_id: Optional[int] = None
    ledger_record_hash: Optional[str] = None
    ledger_prev_hash: Optional[str] = None
    
    # Evidence Chain
    evidence_chain: List[EvidenceHop] = []
    timestamp: str
