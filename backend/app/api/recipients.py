from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.storage.database import get_db
from app.services.recipient_service import RecipientService
from app.schemas.recipient import RecipientCreate, RecipientResponse, RecipientIdentity

router = APIRouter(prefix="/recipients", tags=["Recipients"])

@router.post("", response_model=RecipientResponse, status_code=status.HTTP_201_CREATED)
def create_recipient(payload: RecipientCreate, db: Session = Depends(get_db)):
    service = RecipientService(db)
    return service.create_recipient(payload)

@router.get("", response_model=List[RecipientResponse])
def list_recipients(db: Session = Depends(get_db)):
    service = RecipientService(db)
    return service.list_recipients()

@router.get("/{recipient_id}", response_model=RecipientResponse)
def get_recipient(recipient_id: str, db: Session = Depends(get_db)):
    service = RecipientService(db)
    rec = service.get_recipient(recipient_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Recipient '{recipient_id}' not found")
    return rec

@router.post("/{recipient_id}/authorize", response_model=RecipientResponse)
def authorize_recipient(recipient_id: str, db: Session = Depends(get_db)):
    service = RecipientService(db)
    rec = service.authorize_recipient(recipient_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Recipient '{recipient_id}' not found")
    return rec

@router.post("/{recipient_id}/revoke", response_model=RecipientResponse)
def revoke_recipient(recipient_id: str, db: Session = Depends(get_db)):
    service = RecipientService(db)
    rec = service.revoke_recipient(recipient_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Recipient '{recipient_id}' not found")
    return rec

@router.get("/{recipient_id}/identity", response_model=RecipientIdentity)
def get_recipient_identity(recipient_id: str, db: Session = Depends(get_db)):
    service = RecipientService(db)
    identity = service.get_identity(recipient_id)
    if not identity:
        raise HTTPException(status_code=404, detail=f"Recipient '{recipient_id}' not found")
    return identity
