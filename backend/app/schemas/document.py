from pydantic import BaseModel, Field
from typing import List, Optional

class DocumentResponse(BaseModel):
    document_id: str
    filename: str
    content_type: str
    document_hash: str
    is_encrypted: bool
    authorized_recipients: List[str]
    created_at: str

class DocumentEncryptRequest(BaseModel):
    recipient_ids: List[str] = Field(..., json_schema_extra={"example": ["RECIPIENT-021", "RECIPIENT-047", "RECIPIENT-063"]})


class DocumentEncryptResponse(BaseModel):
    document_id: str
    is_encrypted: bool
    authorized_recipients: List[str]
    document_hash: str
    content_cipher: str = "AES-256-GCM"
    pqc_kem_algorithm: str = "NIST FIPS 203 ML-KEM-768"
    recipient_encapsulations_count: int
