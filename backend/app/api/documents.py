import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.storage.database import get_db
from app.services.document_service import DocumentService
from app.schemas.document import DocumentResponse, DocumentEncryptRequest, DocumentEncryptResponse
from app.core.config import DOCUMENTS_DIR

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    document_id: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF documents are supported in this prototype.")
    
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=413, detail="File exceeds maximum allowed size (50MB)")

    service = DocumentService(db)
    return service.upload_document(
        filename=file.filename,
        content=content,
        document_id=document_id
    )

@router.get("", response_model=List[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    service = DocumentService(db)
    return service.list_documents()

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: str, db: Session = Depends(get_db)):
    service = DocumentService(db)
    doc = service.get_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document '{document_id}' not found")
    return doc

@router.post("/{document_id}/encrypt", response_model=DocumentEncryptResponse)
def encrypt_document(
    document_id: str,
    payload: DocumentEncryptRequest,
    db: Session = Depends(get_db)
):
    service = DocumentService(db)
    try:
        return service.encrypt_and_distribute(document_id, payload.recipient_ids)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Encryption failed: {str(e)}")

@router.get("/download/{filename}")
def download_document(filename: str):
    # Sanitize filename
    clean_name = os.path.basename(filename)
    file_path = DOCUMENTS_DIR / clean_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=file_path, filename=clean_name, media_type="application/pdf")
