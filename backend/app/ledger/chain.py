import logging
from typing import Optional, List
from app.ledger.models import DecryptionEvent, LedgerRecord, GENESIS_PREV_HASH
from app.ledger.storage import LedgerStorage

logger = logging.getLogger(__name__)

class OfflinePermissionedLedger:
    """
    Offline Permissioned Tamper-Evident DLT Prototype.
    Enforces sequential cryptographic chaining with SHA3-256 block linking.
    Records ML-DSA-65 signed recipient decryption events.
    """
    def __init__(self, storage: Optional[LedgerStorage] = None):
        self.storage = storage or LedgerStorage()

    def record_decryption_event(
        self,
        event: DecryptionEvent,
        signature: str,
        public_key_fingerprint: str
    ) -> LedgerRecord:
        """
        Commits a signed decryption event to the offline permissioned ledger.
        Computes cryptographic links and guarantees immutability.
        """
        last_record = self.storage.get_last_record()
        if last_record is None:
            new_record_id = 1
            prev_hash = GENESIS_PREV_HASH
        else:
            new_record_id = last_record.record_id + 1
            prev_hash = last_record.record_hash

        record = LedgerRecord.create(
            record_id=new_record_id,
            previous_record_hash=prev_hash,
            event=event,
            signature=signature,
            public_key_fingerprint=public_key_fingerprint,
        )

        self.storage.append(record)
        logger.info(f"Committed block #{record.record_id} to ledger [Hash: {record.record_hash[:16]}...]")
        return record

    def get_record(self, record_id: int) -> Optional[LedgerRecord]:
        return self.storage.get_by_id(record_id)

    def get_by_watermark(self, watermark_id: str) -> Optional[LedgerRecord]:
        return self.storage.get_by_watermark_id(watermark_id)

    def get_by_session(self, session_id: str) -> Optional[LedgerRecord]:
        return self.storage.get_by_session_id(session_id)

    def get_all_records(self) -> List[LedgerRecord]:
        return self.storage.get_all()

    def get_total_records(self) -> int:
        return self.storage.count()
