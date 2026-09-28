import sqlite3
import json
from typing import List, Optional
from app.core.config import settings
from app.ledger.models import LedgerRecord

class LedgerStorage:
    """
    SQLite-backed local append-only storage for the offline permissioned ledger.
    Stores cryptographically linked blocks of signed decryption events.
    """
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or str(settings.LEDGER_DB_PATH)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ledger_records (
                    record_id INTEGER PRIMARY KEY,
                    previous_record_hash TEXT NOT NULL,
                    event_hash TEXT NOT NULL,
                    event_payload TEXT NOT NULL,
                    recipient_id TEXT NOT NULL,
                    document_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    watermark_id TEXT NOT NULL,
                    signature TEXT NOT NULL,
                    public_key_fingerprint TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    record_hash TEXT NOT NULL UNIQUE
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_watermark_id ON ledger_records(watermark_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_session_id ON ledger_records(session_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_recipient_id ON ledger_records(recipient_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_document_id ON ledger_records(document_id)")
            conn.commit()

    def append(self, record: LedgerRecord) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO ledger_records (
                    record_id, previous_record_hash, event_hash, event_payload,
                    recipient_id, document_id, session_id, watermark_id,
                    signature, public_key_fingerprint, timestamp, record_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record.record_id,
                record.previous_record_hash,
                record.event_hash,
                json.dumps(record.event_payload),
                record.recipient_id,
                record.document_id,
                record.session_id,
                record.watermark_id,
                record.signature,
                record.public_key_fingerprint,
                record.timestamp,
                record.record_hash
            ))
            conn.commit()

    def get_last_record(self) -> Optional[LedgerRecord]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM ledger_records ORDER BY record_id DESC LIMIT 1")
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_record(row)

    def get_by_id(self, record_id: int) -> Optional[LedgerRecord]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM ledger_records WHERE record_id = ?", (record_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_record(row)

    def get_by_watermark_id(self, watermark_id: str) -> Optional[LedgerRecord]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM ledger_records WHERE watermark_id = ?", (watermark_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_record(row)

    def get_by_session_id(self, session_id: str) -> Optional[LedgerRecord]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM ledger_records WHERE session_id = ?", (session_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_record(row)

    def get_all(self) -> List[LedgerRecord]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM ledger_records ORDER BY record_id ASC")
            return [self._row_to_record(r) for r in cursor.fetchall()]

    def count(self) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM ledger_records")
            return cursor.fetchone()[0]

    def tamper_record_signature_for_test(self, record_id: int, tampered_sig: str) -> None:
        """Utility for automated tamper-detection testing ONLY."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE ledger_records SET signature = ? WHERE record_id = ?", (tampered_sig, record_id))
            conn.commit()

    def _row_to_record(self, row: sqlite3.Row) -> LedgerRecord:
        return LedgerRecord(
            record_id=row["record_id"],
            previous_record_hash=row["previous_record_hash"],
            event_hash=row["event_hash"],
            event_payload=json.loads(row["event_payload"]),
            recipient_id=row["recipient_id"],
            document_id=row["document_id"],
            session_id=row["session_id"],
            watermark_id=row["watermark_id"],
            signature=row["signature"],
            public_key_fingerprint=row["public_key_fingerprint"],
            timestamp=row["timestamp"],
            record_hash=row["record_hash"]
        )
