from typing import Dict, Any, List, Optional
from app.ledger.models import GENESIS_PREV_HASH, DecryptionEvent
from app.ledger.storage import LedgerStorage
from app.crypto.pqc import PQCVerifier
from app.crypto.key_manager import key_vault

class LedgerValidationResult:
    def __init__(self, is_valid: bool, checked_count: int, message: str, errors: Optional[List[str]] = None):
        self.is_valid = is_valid
        self.checked_count = checked_count
        self.message = message
        self.errors = errors or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "checked_count": self.checked_count,
            "message": self.message,
            "errors": self.errors,
            "status": "VALID" if self.is_valid else "CORRUPTED"
        }

class LedgerValidator:
    """
    Independent audit validator for the Offline Permissioned Ledger.
    Walks block-by-block to detect:
    - Altered record hashes or payloads
    - Broken chain links (previous_hash mismatch)
    - Deleted or skipped blocks
    - Invalid or tampered post-quantum ML-DSA-65 recipient signatures
    """
    def __init__(self, storage: Optional[LedgerStorage] = None):
        self.storage = storage or LedgerStorage()

    def validate_chain(self, verify_signatures: bool = True) -> LedgerValidationResult:
        records = self.storage.get_all()
        if not records:
            return LedgerValidationResult(True, 0, "Ledger is empty. Genesis state valid.")

        errors: List[str] = []
        expected_prev_hash = GENESIS_PREV_HASH
        expected_record_id = 1

        for idx, record in enumerate(records):
            # 1. Sequence check
            if record.record_id != expected_record_id:
                errors.append(f"Block sequence break at index {idx}: expected ID {expected_record_id}, got {record.record_id}")

            # 2. Previous hash link check
            if record.previous_record_hash != expected_prev_hash:
                errors.append(
                    f"Block #{record.record_id} hash chain broken: previous_record_hash {record.previous_record_hash[:16]}... "
                    f"does not match previous block hash {expected_prev_hash[:16]}..."
                )

            # 3. Block self-integrity check
            if not record.verify_hash():
                errors.append(f"Block #{record.record_id} payload altered: recomputed hash differs from recorded block hash {record.record_hash[:16]}...")

            # 4. Decryption event self-integrity check
            try:
                event = DecryptionEvent(**record.event_payload)
                if event.compute_hash() != record.event_hash:
                    errors.append(f"Block #{record.record_id} event hash mismatch: computed {event.compute_hash()[:16]} != recorded {record.event_hash[:16]}")
            except Exception as e:
                errors.append(f"Block #{record.record_id} has invalid event payload: {str(e)}")

            # 5. ML-DSA-65 Signature validation
            if verify_signatures:
                try:
                    # Retrieve recipient's ML-DSA public key from key manager
                    keys = key_vault.get_keys(record.recipient_id)
                    if not keys:
                        errors.append(f"Block #{record.record_id}: Recipient '{record.recipient_id}' not found in key vault")
                    else:
                        dsa_pub = keys["dsa_public_key"]
                        event = DecryptionEvent(**record.event_payload)
                        msg_bytes = event.canonical_json().encode('utf-8')
                        
                        is_sig_valid, sig_msg = PQCVerifier.verify_mldsa(
                            public_key_b64=dsa_pub,
                            message=msg_bytes,
                            signature_hex=record.signature
                        )
                        if not is_sig_valid:
                            errors.append(f"Block #{record.record_id}: ML-DSA-65 signature verification failed: {sig_msg}")
                except Exception as e:
                    errors.append(f"Block #{record.record_id}: Signature check error: {str(e)}")

            expected_prev_hash = record.record_hash
            expected_record_id += 1

        is_valid = len(errors) == 0
        message = (
            f"Ledger audit complete. Verified {len(records)} blocks with zero anomalies."
            if is_valid
            else f"Ledger audit FAILED with {len(errors)} critical tampering anomalies detected."
        )

        return LedgerValidationResult(
            is_valid=is_valid,
            checked_count=len(records),
            message=message,
            errors=errors
        )
