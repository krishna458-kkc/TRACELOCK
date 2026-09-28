from pydantic import BaseModel, Field
from typing import Optional, List

class RecipientCreate(BaseModel):
    recipient_id: str = Field(..., json_schema_extra={"example": "RECIPIENT-047"})
    name: str = Field(..., json_schema_extra={"example": "Cdr. R. Iyer"})
    role: str = Field(..., json_schema_extra={"example": "Chief Tactical Officer / Directorate of Naval Operations"})


class RecipientResponse(BaseModel):
    recipient_id: str
    name: str
    role: str
    status: str
    dsa_fingerprint: str
    kem_fingerprint: str
    dsa_public_key: str
    kem_public_key: str
    created_at: str
    revoked_at: Optional[str] = None

class RecipientIdentity(BaseModel):
    recipient_id: str
    name: str
    role: str
    status: str
    dsa_fingerprint: str
    kem_fingerprint: str
    dsa_public_key: str
    kem_public_key: str
    key_type_kem: str = "NIST FIPS 203 ML-KEM-768"
    key_type_dsa: str = "NIST FIPS 204 ML-DSA-65"
    security_level: str = "NIST Security Category 3 (128-bit quantum secure)"
