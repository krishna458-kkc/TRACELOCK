from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.storage.database import get_db, SessionDB
from app.services.decryption_service import DecryptionService
from app.schemas.session import DecryptRequest, DecryptResponse

router = APIRouter(prefix="/sessions", tags=["Decryption Sessions"])

@router.post("/decrypt", response_model=DecryptResponse, status_code=status.HTTP_201_CREATED)
def decrypt_document(payload: DecryptRequest, db: Session = Depends(get_db)):
    service = DecryptionService(db)
    try:
        return service.process_decryption(payload)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decryption processing failed: {str(e)}")

@router.get("", response_model=List[DecryptResponse])
def list_sessions(db: Session = Depends(get_db)):
    sessions = db.query(SessionDB).order_by(SessionDB.timestamp.desc()).all()
    return [
        DecryptResponse(
            session_id=s.session_id,
            document_id=s.document_id,
            recipient_id=s.recipient_id,
            watermark_id=s.watermark_id,
            watermark_hash=s.watermark_hash,
            document_hash=s.document_hash,
            signature=s.signature,
            public_key_fingerprint="",
            ledger_record_id=s.ledger_record_id,
            status=s.status,
            timestamp=s.timestamp,
            watermarked_pdf_download_url=f"/documents/download/{s.session_id}_decrypted.pdf",
        )
        for s in sessions
    ]

@router.get("/{session_id}", response_model=DecryptResponse)
def get_session(session_id: str, db: Session = Depends(get_db)):
    s = db.query(SessionDB).filter(SessionDB.session_id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")
    return DecryptResponse(
        session_id=s.session_id,
        document_id=s.document_id,
        recipient_id=s.recipient_id,
        watermark_id=s.watermark_id,
        watermark_hash=s.watermark_hash,
        document_hash=s.document_hash,
        signature=s.signature,
        public_key_fingerprint="",
        ledger_record_id=s.ledger_record_id,
        status=s.status,
        timestamp=s.timestamp,
        watermarked_pdf_download_url=f"/documents/download/{s.session_id}_decrypted.pdf",
    )
