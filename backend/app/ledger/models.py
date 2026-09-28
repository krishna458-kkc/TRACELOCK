import json
from dataclasses import dataclass, asdict
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from app.crypto.hashing import sha3_256_hex

GENESIS_PREV_HASH = "0" * 64

@dataclass
class DecryptionEvent:
    event_id: str
    document_id: str
    document_hash: str
    recipient_id: str
    session_id: str
    watermark_id: str
    watermark_hash: str
    timestamp: str
    event_version: str = "2.0-SIH260237"

    def to_canonical_dict(self) -> Dict[str, Any]:
        return {
            "document_hash": self.document_hash,
            "document_id": self.document_id,
            "event_id": self.event_id,
            "event_version": self.event_version,
            "recipient_id": self.recipient_id,
            "session_id": self.session_id,
            "timestamp": self.timestamp,
            "watermark_hash": self.watermark_hash,
            "watermark_id": self.watermark_id,
        }

    def canonical_json(self) -> str:
        return json.dumps(self.to_canonical_dict(), sort_keys=True, separators=(',', ':'))

    def compute_hash(self) -> str:
        return sha3_256_hex(self.canonical_json())


@dataclass
class LedgerRecord:
    record_id: int
    previous_record_hash: str
    event_hash: str
    event_payload: Dict[str, Any]
    recipient_id: str
    document_id: str
    session_id: str
    watermark_id: str
    signature: str          # Recipient ML-DSA-65 signature in hex
    public_key_fingerprint: str
    timestamp: str
    record_hash: str        # SHA3-256 of canonical record data

    @classmethod
    def create(
        cls,
        record_id: int,
        previous_record_hash: str,
        event: DecryptionEvent,
        signature: str,
        public_key_fingerprint: str,
        timestamp: Optional[str] = None
    ) -> "LedgerRecord":
        if timestamp is None:
            timestamp = datetime.now(timezone.utc).isoformat()
        
        event_dict = event.to_canonical_dict()
        event_hash = event.compute_hash()
        
        # Calculate block hash
        canonical_content = json.dumps({
            "event_hash": event_hash,
            "event_payload": event_dict,
            "previous_record_hash": previous_record_hash,
            "public_key_fingerprint": public_key_fingerprint,
            "record_id": record_id,
            "signature": signature,
            "timestamp": timestamp,
        }, sort_keys=True, separators=(',', ':'))
        
        record_hash = sha3_256_hex(canonical_content)
        
        return cls(
            record_id=record_id,
            previous_record_hash=previous_record_hash,
            event_hash=event_hash,
            event_payload=event_dict,
            recipient_id=event.recipient_id,
            document_id=event.document_id,
            session_id=event.session_id,
            watermark_id=event.watermark_id,
            signature=signature,
            public_key_fingerprint=public_key_fingerprint,
            timestamp=timestamp,
            record_hash=record_hash
        )

    def verify_hash(self) -> bool:
        canonical_content = json.dumps({
            "event_hash": self.event_hash,
            "event_payload": self.event_payload,
            "previous_record_hash": self.previous_record_hash,
            "public_key_fingerprint": self.public_key_fingerprint,
            "record_id": self.record_id,
            "signature": self.signature,
            "timestamp": self.timestamp,
        }, sort_keys=True, separators=(',', ':'))
        return sha3_256_hex(canonical_content) == self.record_hash
