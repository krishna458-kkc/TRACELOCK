import os
import json
from datetime import datetime, timezone
from typing import Generator
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import DB_PATH

DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class RecipientDB(Base):
    __tablename__ = "recipients"

    recipient_id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    role = Column(String(128), nullable=False)
    status = Column(String(32), default="ACTIVE")  # ACTIVE, REVOKED
    dsa_public_key = Column(Text, nullable=False)
    dsa_fingerprint = Column(String(64), nullable=False, index=True)
    kem_public_key = Column(Text, nullable=False)
    kem_fingerprint = Column(String(64), nullable=False)
    created_at = Column(String(64), default=lambda: datetime.now(timezone.utc).isoformat())
    revoked_at = Column(String(64), nullable=True)


class DocumentDB(Base):
    __tablename__ = "documents"

    document_id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(256), nullable=False)
    content_type = Column(String(64), default="application/pdf")
    document_hash = Column(String(64), nullable=False, index=True)
    plaintext_path = Column(String(512), nullable=False)
    ciphertext_path = Column(String(512), nullable=True)
    # JSON dictionary mapping recipient_id -> base64 kem_ciphertext
    recipient_encapsulated_keys = Column(Text, default="{}")
    # JSON list of recipient_ids authorized
    authorized_recipients = Column(Text, default="[]")
    is_encrypted = Column(Boolean, default=False)
    created_at = Column(String(64), default=lambda: datetime.now(timezone.utc).isoformat())


class SessionDB(Base):
    __tablename__ = "decryption_sessions"

    session_id = Column(String(64), primary_key=True, index=True)
    document_id = Column(String(64), nullable=False, index=True)
    recipient_id = Column(String(64), nullable=False, index=True)
    watermark_id = Column(String(64), nullable=False, index=True)
    watermark_hash = Column(String(64), nullable=False)
    document_hash = Column(String(64), nullable=False)
    timestamp = Column(String(64), default=lambda: datetime.now(timezone.utc).isoformat())
    signature = Column(Text, nullable=False)
    ledger_record_id = Column(Integer, nullable=False)
    status = Column(String(32), default="CRYPTOGRAPHICALLY_VERIFIED")


class InvestigationDB(Base):
    __tablename__ = "investigations"

    investigation_id = Column(String(64), primary_key=True, index=True)
    filename = Column(String(256), nullable=False)
    leaked_doc_hash = Column(String(64), nullable=False)
    status = Column(String(64), nullable=False)  # CRYPTOGRAPHICALLY_VERIFIED, VERIFICATION_FAILED
    extracted_watermark_id = Column(String(64), nullable=True)
    extracted_recipient_id = Column(String(64), nullable=True)
    extracted_session_id = Column(String(64), nullable=True)
    signature_verified = Column(Boolean, default=False)
    ledger_verified = Column(Boolean, default=False)
    integrity_verified = Column(Boolean, default=False)
    evidence_json = Column(Text, nullable=False)
    timestamp = Column(String(64), default=lambda: datetime.now(timezone.utc).isoformat())


def init_db():
    Base.metadata.create_all(bind=engine)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
