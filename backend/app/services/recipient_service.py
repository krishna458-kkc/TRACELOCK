from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.storage.database import RecipientDB
from app.crypto.key_manager import key_vault
from app.schemas.recipient import RecipientCreate, RecipientResponse, RecipientIdentity

class RecipientService:
    def __init__(self, db: Session):
        self.db = db

    def create_recipient(self, data: RecipientCreate) -> RecipientResponse:
        # Check if already exists
        existing = self.db.query(RecipientDB).filter(RecipientDB.recipient_id == data.recipient_id).first()
        if existing:
            return self._to_response(existing)

        # Generate ML-KEM-768 & ML-DSA-65 keypair in local secure vault
        key_meta = key_vault.generate_and_store_keys(data.recipient_id)

        rec = RecipientDB(
            recipient_id=data.recipient_id,
            name=data.name,
            role=data.role,
            status="ACTIVE",
            dsa_public_key=key_meta["dsa_public_key"],
            dsa_fingerprint=key_meta["fingerprint"],
            kem_public_key=key_meta["kem_public_key"],
            kem_fingerprint=key_meta["kem_fingerprint"],
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        self.db.add(rec)
        self.db.commit()
        self.db.refresh(rec)
        return self._to_response(rec)

    def get_recipient(self, recipient_id: str) -> Optional[RecipientResponse]:
        rec = self.db.query(RecipientDB).filter(RecipientDB.recipient_id == recipient_id).first()
        return self._to_response(rec) if rec else None

    def list_recipients(self) -> List[RecipientResponse]:
        records = self.db.query(RecipientDB).all()
        return [self._to_response(r) for r in records]

    def authorize_recipient(self, recipient_id: str) -> Optional[RecipientResponse]:
        rec = self.db.query(RecipientDB).filter(RecipientDB.recipient_id == recipient_id).first()
        if not rec:
            return None
        rec.status = "ACTIVE"
        rec.revoked_at = None
        self.db.commit()
        self.db.refresh(rec)
        return self._to_response(rec)

    def revoke_recipient(self, recipient_id: str) -> Optional[RecipientResponse]:
        rec = self.db.query(RecipientDB).filter(RecipientDB.recipient_id == recipient_id).first()
        if not rec:
            return None
        rec.status = "REVOKED"
        rec.revoked_at = datetime.now(timezone.utc).isoformat()
        self.db.commit()
        self.db.refresh(rec)
        return self._to_response(rec)

    def get_identity(self, recipient_id: str) -> Optional[RecipientIdentity]:
        rec = self.db.query(RecipientDB).filter(RecipientDB.recipient_id == recipient_id).first()
        if not rec:
            return None
        return RecipientIdentity(
            recipient_id=rec.recipient_id,
            name=rec.name,
            role=rec.role,
            status=rec.status,
            dsa_fingerprint=rec.dsa_fingerprint,
            kem_fingerprint=rec.kem_fingerprint,
            dsa_public_key=rec.dsa_public_key,
            kem_public_key=rec.kem_public_key,
        )

    def _to_response(self, rec: RecipientDB) -> RecipientResponse:
        return RecipientResponse(
            recipient_id=rec.recipient_id,
            name=rec.name,
            role=rec.role,
            status=rec.status,
            dsa_fingerprint=rec.dsa_fingerprint,
            kem_fingerprint=rec.kem_fingerprint,
            dsa_public_key=rec.dsa_public_key,
            kem_public_key=rec.kem_public_key,
            created_at=rec.created_at,
            revoked_at=rec.revoked_at,
        )
