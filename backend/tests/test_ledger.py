import tempfile
import os
import pytest
from app.ledger.models import DecryptionEvent
from app.ledger.storage import LedgerStorage
from app.ledger.chain import OfflinePermissionedLedger
from app.ledger.validator import LedgerValidator
from app.crypto.key_manager import key_vault
from app.crypto.pqc import PQCSigner, b64_decode

@pytest.fixture
def temp_ledger():
    tmp = tempfile.mktemp(suffix=".db")
    storage = LedgerStorage(tmp)
    ledger = OfflinePermissionedLedger(storage)
    validator = LedgerValidator(storage)
    yield storage, ledger, validator
    try:
        os.remove(tmp)
    except Exception:
        pass

def test_ledger_append_and_validation(temp_ledger):
    """Validates that blocks append with valid hash chains and verify cleanly."""
    storage, ledger, validator = temp_ledger
    recipient_id = "RECIPIENT-047"
    keys = key_vault.get_or_create_keys(recipient_id)

    event1 = DecryptionEvent(
        event_id="EVT-101",
        document_id="DOC-A71F",
        document_hash="doc_hash_1",
        recipient_id=recipient_id,
        session_id="SES-001",
        watermark_id="WM-001",
        watermark_hash="wm_hash_1",
        timestamp="2026-09-28T14:00:00Z"
    )
    sig1 = PQCSigner.sign_mldsa(b64_decode(keys["dsa_private_key"]), event1.canonical_json().encode("utf-8"))
    b1 = ledger.record_decryption_event(event1, sig1, keys["fingerprint"])

    assert b1.record_id == 1
    assert b1.previous_record_hash == "0" * 64

    # Second block
    event2 = DecryptionEvent(
        event_id="EVT-102",
        document_id="DOC-A71F",
        document_hash="doc_hash_1",
        recipient_id=recipient_id,
        session_id="SES-002",
        watermark_id="WM-002",
        watermark_hash="wm_hash_2",
        timestamp="2026-09-28T14:30:00Z"
    )
    sig2 = PQCSigner.sign_mldsa(b64_decode(keys["dsa_private_key"]), event2.canonical_json().encode("utf-8"))
    b2 = ledger.record_decryption_event(event2, sig2, keys["fingerprint"])

    assert b2.record_id == 2
    assert b2.previous_record_hash == b1.record_hash

    # Validate chain
    audit = validator.validate_chain(verify_signatures=True)
    assert audit.is_valid is True
    assert audit.checked_count == 2

def test_ledger_tamper_detection(temp_ledger):
    """Validates that modified signatures or payload mutations are immediately detected."""
    storage, ledger, validator = temp_ledger
    recipient_id = "RECIPIENT-047"
    keys = key_vault.get_or_create_keys(recipient_id)

    event = DecryptionEvent(
        event_id="EVT-201",
        document_id="DOC-A71F",
        document_hash="doc_hash_1",
        recipient_id=recipient_id,
        session_id="SES-201",
        watermark_id="WM-201",
        watermark_hash="wm_hash_201",
        timestamp="2026-09-28T15:00:00Z"
    )
    sig = PQCSigner.sign_mldsa(b64_decode(keys["dsa_private_key"]), event.canonical_json().encode("utf-8"))
    ledger.record_decryption_event(event, sig, keys["fingerprint"])

    # Tamper with block signature
    storage.tamper_record_signature_for_test(1, "ff" * 100)
    tampered_audit = validator.validate_chain(verify_signatures=True)
    assert tampered_audit.is_valid is False
    assert len(tampered_audit.errors) > 0
