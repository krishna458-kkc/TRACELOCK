from pydantic import BaseModel, Field
from typing import Optional

class DecryptRequest(BaseModel):
    document_id: str = Field(..., json_schema_extra={"example": "DOC-A71F"})
    recipient_id: str = Field(..., json_schema_extra={"example": "RECIPIENT-047"})
    custom_session_id: Optional[str] = Field(None, json_schema_extra={"example": "SES-8F29A1"})
    custom_watermark_id: Optional[str] = Field(None, json_schema_extra={"example": "WM-72C9E41B"})


class DecryptResponse(BaseModel):
    session_id: str
    document_id: str
    recipient_id: str
    watermark_id: str
    watermark_hash: str
    document_hash: str
    signature: str
    public_key_fingerprint: str
    ledger_record_id: int
    status: str
    timestamp: str
    watermarked_pdf_download_url: Optional[str] = None
