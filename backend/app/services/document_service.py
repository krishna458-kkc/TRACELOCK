import os
import json
import secrets
from pathlib import Path
from typing import List, Optional, Dict, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.config import DOCUMENTS_DIR
from app.storage.database import DocumentDB, RecipientDB
from app.crypto.hashing import sha3_256_hex
from app.crypto.symmetric import SymmetricCipher
from app.crypto.pqc import KEMService, b64_encode, b64_decode
from app.schemas.document import DocumentResponse, DocumentEncryptResponse

class DocumentService:
    def __init__(self, db: Session):
        self.db = db
        DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)

    def upload_document(
        self,
        filename: str,
        content: bytes,
        document_id: Optional[str] = None
    ) -> DocumentResponse:
        """Uploads and registers a sensitive document."""
        doc_hash = sha3_256_hex(content)
        if not document_id:
            # Deterministic prefix or random
            doc_id = f"DOC-{secrets.token_hex(2).upper()}"
        else:
            doc_id = document_id

        # Save plaintext document locally in secure enclave
        clean_id = "".join(c for c in doc_id if c.isalnum() or c in ("-", "_"))
        plaintext_path = DOCUMENTS_DIR / f"{clean_id}_plain.pdf"
        with open(plaintext_path, "wb") as f:
            f.write(content)

        existing = self.db.query(DocumentDB).filter(DocumentDB.document_id == doc_id).first()
        if existing:
            existing.filename = filename
            existing.document_hash = doc_hash
            existing.plaintext_path = str(plaintext_path)
            self.db.commit()
            self.db.refresh(existing)
            return self._to_response(existing)

        doc = DocumentDB(
            document_id=doc_id,
            filename=filename,
            content_type="application/pdf",
            document_hash=doc_hash,
            plaintext_path=str(plaintext_path),
            ciphertext_path=None,
            recipient_encapsulated_keys="{}",
            authorized_recipients="[]",
            is_encrypted=False,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)
        return self._to_response(doc)

    def encrypt_and_distribute(
        self,
        document_id: str,
        recipient_ids: List[str]
    ) -> DocumentEncryptResponse:
        """
        Broadcast-Encrypt, Individually-Decrypt pipeline:
        1. Generates 256-bit AES content-encryption key K_doc.
        2. Encrypts document payload once with K_doc using AES-256-GCM.
        3. For each authorized recipient:
           - Encapsulates key material using recipient's ML-KEM-768 public key (NIST FIPS 203).
           - Wraps K_doc with the resulting shared secret.
        """
        doc = self.db.query(DocumentDB).filter(DocumentDB.document_id == document_id).first()
        if not doc:
            raise ValueError(f"Document {document_id} not found")

        # Read plaintext bytes
        with open(doc.plaintext_path, "rb") as f:
            plaintext = f.read()

        # 1. Generate AES-256 content key K_doc
        k_doc = SymmetricCipher.generate_key()

        # 2. Encrypt payload once
        ciphertext_blob = SymmetricCipher.encrypt(k_doc, plaintext)
        clean_id = "".join(c for c in document_id if c.isalnum() or c in ("-", "_"))
        ciphertext_path = DOCUMENTS_DIR / f"{clean_id}_encrypted.bin"
        with open(ciphertext_path, "wb") as f:
            f.write(ciphertext_blob)

        # 3. For each recipient, perform ML-KEM-768 encapsulation
        recipient_key_packages: Dict[str, Dict[str, str]] = {}
        authorized: List[str] = []

        for rid in recipient_ids:
            rec = self.db.query(RecipientDB).filter(RecipientDB.recipient_id == rid).first()
            if not rec or rec.status != "ACTIVE":
                continue

            kem_pub_bytes = b64_decode(rec.kem_public_key)
            kem_ciphertext, shared_secret = KEMService.encapsulate(kem_pub_bytes)
            
            # Wrap K_doc with shared_secret
            wrapped_k_doc = SymmetricCipher.encrypt(shared_secret, k_doc)

            recipient_key_packages[rid] = {
                "kem_ciphertext": b64_encode(kem_ciphertext),
                "wrapped_content_key": b64_encode(wrapped_k_doc),
            }
            authorized.append(rid)

        doc.ciphertext_path = str(ciphertext_path)
        doc.recipient_encapsulated_keys = json.dumps(recipient_key_packages)
        doc.authorized_recipients = json.dumps(authorized)
        doc.is_encrypted = True
        self.db.commit()
        self.db.refresh(doc)

        return DocumentEncryptResponse(
            document_id=doc.document_id,
            is_encrypted=True,
            authorized_recipients=authorized,
            document_hash=doc.document_hash,
            content_cipher="AES-256-GCM",
            pqc_kem_algorithm="NIST FIPS 203 ML-KEM-768",
            recipient_encapsulations_count=len(authorized),
        )

    def get_document(self, document_id: str) -> Optional[DocumentResponse]:
        doc = self.db.query(DocumentDB).filter(DocumentDB.document_id == document_id).first()
        return self._to_response(doc) if doc else None

    def list_documents(self) -> List[DocumentResponse]:
        records = self.db.query(DocumentDB).all()
        return [self._to_response(d) for d in records]

    def _to_response(self, doc: DocumentDB) -> DocumentResponse:
        auth = json.loads(doc.authorized_recipients) if doc.authorized_recipients else []
        return DocumentResponse(
            document_id=doc.document_id,
            filename=doc.filename,
            content_type=doc.content_type,
            document_hash=doc.document_hash,
            is_encrypted=doc.is_encrypted,
            authorized_recipients=auth,
            created_at=doc.created_at,
        )
