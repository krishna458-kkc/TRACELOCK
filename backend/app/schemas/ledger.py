from pydantic import BaseModel
from typing import Dict, Any, List, Optional

class LedgerRecordResponse(BaseModel):
    record_id: int
    previous_record_hash: str
    event_hash: str
    event_payload: Dict[str, Any]
    recipient_id: str
    document_id: str
    session_id: str
    watermark_id: str
    signature: str
    public_key_fingerprint: str
    timestamp: str
    record_hash: str

class LedgerValidationResponse(BaseModel):
    is_valid: bool
    status: str
    checked_count: int
    message: str
    errors: List[str]
