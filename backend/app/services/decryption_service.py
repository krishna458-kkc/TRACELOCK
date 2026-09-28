import os
import json
import secrets
from pathlib import Path
from typing import Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.config import DOCUMENTS_DIR
from app.storage.database import DocumentDB, RecipientDB, SessionDB
from app.crypto.symmetric import SymmetricCipher
from app.crypto.pqc import KEMService, PQCSigner, b64_decode
from app.crypto.key_manager import key_vault
from app.watermark.generator import build_forensic_payload, generate_watermark_id
from app.watermark.embedder import embed_watermark_in_pdf
from app.ledger.models import DecryptionEvent
from app.ledger.chain import OfflinePermissionedLedger
from app.schemas.session import DecryptRequest, DecryptResponse

class DecryptionService:
    def __init__(self, db: Session, ledger: Optional[OfflinePermissionedLedger] = None):
        self.db = db
        self.ledger = ledger or OfflinePermissionedLedger()

    def process_decryption(self, req: DecryptRequest) -> DecryptResponse:
        """
        Executes complete individual decryption pipeline:
        1. Access Authorization Check
        2. Post-Quantum ML-KEM-768 Decapsulation of Content Key
        3. AES-256-GCM Payload Decryption
        4. Dynamic Forensic Watermark Generation (Session- & Recipient-Bound)
        5. Canonical Decryption Event Creation
        6. Recipient ML-DSA-65 Digital Signature Generation
        7. Immutable Offline Ledger Block Commitment
        8. Multi-Layer Steganographic Invisible Watermark Embedding
        """
        # 1. Fetch document and recipient
        doc = self.db.query(DocumentDB).filter(DocumentDB.document_id == req.document_id).first()
        if not doc:
            raise ValueError(f"Document {req.document_id} not found")
        if not doc.is_encrypted:
            raise ValueError(f"Document {req.document_id} is not encrypted")

        rec = self.db.query(RecipientDB).filter(RecipientDB.recipient_id == req.recipient_id).first()
        if not rec:
            raise ValueError(f"Recipient {req.recipient_id} not registered")
        if rec.status != "ACTIVE":
            raise PermissionError(f"Recipient {req.recipient_id} is REVOKED or INACTIVE")

        authorized = json.loads(doc.authorized_recipients or "[]")
        if req.recipient_id not in authorized:
            raise PermissionError(f"Recipient {req.recipient_id} is not authorized for document {req.document_id}")

        # 2. Extract recipient's KEM package
        key_packages = json.loads(doc.recipient_encapsulated_keys or "{}")
        rec_package = key_packages.get(req.recipient_id)
        if not rec_package:
            raise ValueError(f"Encapsulated key material missing for recipient {req.recipient_id}")

        kem_ciphertext = b64_decode(rec_package["kem_ciphertext"])
        wrapped_content_key = b64_decode(rec_package["wrapped_content_key"])

        # 3. Retrieve recipient's private keys from secure local vault (emulating hardware HSM)
        kem_private_key = key_vault.get_kem_private_key(req.recipient_id)
        dsa_private_key = key_vault.get_dsa_private_key(req.recipient_id)
        if not kem_private_key or not dsa_private_key:
            raise RuntimeError(f"Cryptographic keypair missing in enclave vault for {req.recipient_id}")

        # Decapsulate shared secret using NIST FIPS 203 ML-KEM-768
        shared_secret = KEMService.decapsulate(kem_private_key, kem_ciphertext)
        
        # Unwrap AES-256 content key K_doc
        k_doc = SymmetricCipher.decrypt(shared_secret, wrapped_content_key)

        # 4. Decrypt document ciphertext using AES-256-GCM
        with open(doc.ciphertext_path, "rb") as f:
            encrypted_payload = f.read()
        decrypted_pdf_bytes = SymmetricCipher.decrypt(k_doc, encrypted_payload)

        # 5. Generate unique forensic identity
        session_id = req.custom_session_id or f"SES-{secrets.token_hex(3).upper()}"
        watermark_id = req.custom_watermark_id or generate_watermark_id()
        timestamp = datetime.now(timezone.utc).isoformat()

        payload_dict, payload_json, payload_hash = build_forensic_payload(
            document_id=doc.document_id,
            recipient_id=rec.recipient_id,
            session_id=session_id,
            document_hash=doc.document_hash,
            watermark_id=watermark_id,
            timestamp=timestamp,
        )

        # 6. Create Canonical Decryption Event & Sign with Recipient's ML-DSA-65 Key
        event_id = f"EVT-{secrets.token_hex(4).upper()}"
        event = DecryptionEvent(
            event_id=event_id,
            document_id=doc.document_id,
            document_hash=doc.document_hash,
            recipient_id=rec.recipient_id,
            session_id=session_id,
            watermark_id=watermark_id,
            watermark_hash=payload_hash,
            timestamp=timestamp,
        )

        canonical_bytes = event.canonical_json().encode("utf-8")
        recipient_signature = PQCSigner.sign_mldsa(dsa_private_key, canonical_bytes)

        # 7. Commit to Offline Permissioned Ledger
        ledger_record = self.ledger.record_decryption_event(
            event=event,
            signature=recipient_signature,
            public_key_fingerprint=rec.dsa_fingerprint,
        )

        # 8. Embed Invisible Watermark into Decrypted PDF
        watermarked_pdf = embed_watermark_in_pdf(
            pdf_bytes=decrypted_pdf_bytes,
            payload_json=payload_json,
            recipient_signature=recipient_signature,
        )

        # Save watermarked PDF file locally for download or investigation demo
        watermarked_filename = f"{session_id}_decrypted.pdf"
        watermarked_path = DOCUMENTS_DIR / watermarked_filename
        with open(watermarked_path, "wb") as f:
            f.write(watermarked_pdf)

        # 9. Store Decryption Session record
        session_record = SessionDB(
            session_id=session_id,
            document_id=doc.document_id,
            recipient_id=rec.recipient_id,
            watermark_id=watermark_id,
            watermark_hash=payload_hash,
            document_hash=doc.document_hash,
            timestamp=timestamp,
            signature=recipient_signature,
            ledger_record_id=ledger_record.record_id,
            status="CRYPTOGRAPHICALLY_VERIFIED",
        )
        self.db.add(session_record)
        self.db.commit()
        self.db.refresh(session_record)

        return DecryptResponse(
            session_id=session_id,
            document_id=doc.document_id,
            recipient_id=rec.recipient_id,
            watermark_id=watermark_id,
            watermark_hash=payload_hash,
            document_hash=doc.document_hash,
            signature=recipient_signature,
            public_key_fingerprint=rec.dsa_fingerprint,
            ledger_record_id=ledger_record.record_id,
            status="CRYPTOGRAPHICALLY_VERIFIED",
            timestamp=timestamp,
            watermarked_pdf_download_url=f"/documents/download/{watermarked_filename}",
        )
