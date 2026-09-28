from fastapi import APIRouter, HTTPException, status
from typing import List
from app.ledger.chain import OfflinePermissionedLedger
from app.ledger.validator import LedgerValidator
from app.schemas.ledger import LedgerRecordResponse, LedgerValidationResponse

router = APIRouter(prefix="/ledger", tags=["Offline Permissioned Ledger"])

@router.get("", response_model=List[LedgerRecordResponse])
def get_ledger_records():
    ledger = OfflinePermissionedLedger()
    records = ledger.get_all_records()
    return [
        LedgerRecordResponse(
            record_id=r.record_id,
            previous_record_hash=r.previous_record_hash,
            event_hash=r.event_hash,
            event_payload=r.event_payload,
            recipient_id=r.recipient_id,
            document_id=r.document_id,
            session_id=r.session_id,
            watermark_id=r.watermark_id,
            signature=r.signature,
            public_key_fingerprint=r.public_key_fingerprint,
            timestamp=r.timestamp,
            record_hash=r.record_hash,
        )
        for r in records
    ]

@router.get("/{record_id}", response_model=LedgerRecordResponse)
def get_ledger_record(record_id: int):
    ledger = OfflinePermissionedLedger()
    r = ledger.get_record(record_id)
    if not r:
        raise HTTPException(status_code=404, detail=f"Ledger record #{record_id} not found")
    return LedgerRecordResponse(
        record_id=r.record_id,
        previous_record_hash=r.previous_record_hash,
        event_hash=r.event_hash,
        event_payload=r.event_payload,
        recipient_id=r.recipient_id,
        document_id=r.document_id,
        session_id=r.session_id,
        watermark_id=r.watermark_id,
        signature=r.signature,
        public_key_fingerprint=r.public_key_fingerprint,
        timestamp=r.timestamp,
        record_hash=r.record_hash,
    )

@router.post("/validate", response_model=LedgerValidationResponse)
def validate_ledger():
    validator = LedgerValidator()
    result = validator.validate_chain(verify_signatures=True)
    return LedgerValidationResponse(
        is_valid=result.is_valid,
        status="VALID" if result.is_valid else "CORRUPTED",
        checked_count=result.checked_count,
        message=result.message,
        errors=result.errors,
    )
