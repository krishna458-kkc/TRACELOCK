from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from typing import Optional
from app.storage.database import get_db
from app.services.investigation_service import ForensicInvestigationService
from app.schemas.investigation import InvestigationResponse

router = APIRouter(prefix="/investigation", tags=["Forensic Investigation"])

@router.post("/analyze", response_model=InvestigationResponse, status_code=status.HTTP_200_OK)
async def analyze_leaked_document(
    file: UploadFile = File(...),
    investigation_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF documents are supported for forensic investigation.")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File exceeds maximum allowed size (50MB)")

    service = ForensicInvestigationService(db)
    try:
        return service.analyze_leaked_document(
            filename=file.filename,
            pdf_bytes=content,
            investigation_id=investigation_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forensic investigation failed: {str(e)}")

@router.get("/{investigation_id}", response_model=InvestigationResponse)
def get_investigation(investigation_id: str, db: Session = Depends(get_db)):
    service = ForensicInvestigationService(db)
    inv = service.get_investigation(investigation_id)
    if not inv:
        raise HTTPException(status_code=404, detail=f"Investigation '{investigation_id}' not found")
    return inv
