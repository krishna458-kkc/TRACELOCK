import json
import secrets
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.storage.database import InvestigationDB, RecipientDB, DocumentDB, SessionDB
from app.crypto.hashing import sha3_256_hex
from app.crypto.pqc import PQCVerifier
from app.watermark.extractor import extract_watermark_from_pdf
from app.watermark.verifier import verify_watermark_integrity
from app.ledger.chain import OfflinePermissionedLedger
from app.ledger.validator import LedgerValidator
from app.ledger.models import DecryptionEvent
from app.schemas.investigation import InvestigationResponse, EvidenceHop

class ForensicInvestigationService:
    def __init__(self, db: Session, ledger: Optional[OfflinePermissionedLedger] = None):
        self.db = db
        self.ledger = ledger or OfflinePermissionedLedger()
        self.ledger_validator = LedgerValidator(self.ledger.storage)

    def analyze_leaked_document(
        self,
        filename: str,
        pdf_bytes: bytes,
        investigation_id: Optional[str] = None
    ) -> InvestigationResponse:
        """
        Executes end-to-end forensic investigation and cryptographic attribution.
        1. Leaked Document Ingestion & Hashing
        2. Multi-layer Forensic Watermark Recovery
        3. Payload Cryptographic Integrity Check
        4. Offline Permissioned Ledger Lookup
        5. NIST FIPS 204 ML-DSA-65 Recipient Signature Verification
        6. Tamper-Evident Ledger Chain Continuity Audit
        7. Evidence Chain Assembly & Attribution
        """
        inv_id = investigation_id or f"INV-{secrets.token_hex(3).upper()}"
        leaked_hash = sha3_256_hex(pdf_bytes)
        evidence_chain: List[EvidenceHop] = []

        # Step 1: Document Ingestion
        evidence_chain.append(EvidenceHop(
            step=1,
            title="Document Ingestion & Hash Generation",
            status="VERIFIED",
            details=f"File '{filename}' ({len(pdf_bytes)} bytes) ingested into air-gapped forensic enclave.",
            cryptographic_proof=f"SHA3-256: {leaked_hash}"
        ))

        # Step 2: Watermark Extraction
        extracted_payload, raw_json, layer_name = extract_watermark_from_pdf(pdf_bytes)
        if not extracted_payload:
            evidence_chain.append(EvidenceHop(
                step=2,
                title="Forensic Watermark Extraction",
                status="FAILED",
                details="No TRACELOCK forensic watermark found in any layer (Metadata, Catalog, or Steganographic Stream).",
                cryptographic_proof=None
            ))
            return self._build_failure_response(
                inv_id, filename, leaked_hash, evidence_chain,
                "Extraction failed: no forensic markers located in document."
            )

        watermark_id = extracted_payload.get("wid", "UNKNOWN")
        session_id = extracted_payload.get("sid", "UNKNOWN")
        recipient_id = extracted_payload.get("rid", "UNKNOWN")
        document_id = extracted_payload.get("did", "UNKNOWN")

        evidence_chain.append(EvidenceHop(
            step=2,
            title="Forensic Watermark Extraction",
            status="VERIFIED",
            details=f"Extracted payload from {layer_name}. Watermark ID: {watermark_id}, Session: {session_id}.",
            cryptographic_proof=f"Raw Forensic Payload: {raw_json[:64]}..."
        ))

        # Step 3: Watermark Integrity
        is_integrity_valid, integrity_reason = verify_watermark_integrity(extracted_payload)
        if not is_integrity_valid:
            evidence_chain.append(EvidenceHop(
                step=3,
                title="Watermark Payload Integrity",
                status="FAILED",
                details=f"Watermark payload integrity failed: {integrity_reason}",
                cryptographic_proof=None
            ))
            return self._build_failure_response(
                inv_id, filename, leaked_hash, evidence_chain,
                f"Watermark integrity corrupted: {integrity_reason}"
            )

        evidence_chain.append(EvidenceHop(
            step=3,
            title="Watermark Payload Integrity",
            status="VERIFIED",
            details="Watermark structure and SHA3-256 checksum tag cryptographically verified.",
            cryptographic_proof=f"Checksum: {extracted_payload.get('chk')} (Matches computed SHA3-256 prefix)"
        ))

        # Step 4: Ledger Lookup
        ledger_record = self.ledger.get_by_watermark(watermark_id)
        if not ledger_record:
            evidence_chain.append(EvidenceHop(
                step=4,
                title="Offline Ledger Search",
                status="FAILED",
                details=f"Watermark ID {watermark_id} not found in the local permissioned ledger.",
                cryptographic_proof=None
            ))
            return self._build_failure_response(
                inv_id, filename, leaked_hash, evidence_chain,
                f"Unregistered watermark: {watermark_id} not committed to ledger."
            )

        evidence_chain.append(EvidenceHop(
            step=4,
            title="Offline Ledger Search",
            status="VERIFIED",
            details=f"Found corresponding block #{ledger_record.record_id} recorded in offline tamper-evident ledger.",
            cryptographic_proof=f"Block Hash: {ledger_record.record_hash[:24]}... (Linked to {ledger_record.previous_record_hash[:16]}...)"
        ))

        # Step 5: Recipient Signature Verification
        rec = self.db.query(RecipientDB).filter(RecipientDB.recipient_id == recipient_id).first()
        if not rec:
            evidence_chain.append(EvidenceHop(
                step=5,
                title="Post-Quantum Signature Verification",
                status="FAILED",
                details=f"Recipient {recipient_id} referenced in watermark is not registered in system.",
                cryptographic_proof=None
            ))
            return self._build_failure_response(
                inv_id, filename, leaked_hash, evidence_chain,
                f"Recipient {recipient_id} not found."
            )

        event = DecryptionEvent(**ledger_record.event_payload)
        canonical_event_bytes = event.canonical_json().encode("utf-8")
        
        is_sig_valid, sig_msg = PQCVerifier.verify_mldsa(
            public_key_b64=rec.dsa_public_key,
            message=canonical_event_bytes,
            signature_hex=ledger_record.signature
        )

        if not is_sig_valid:
            evidence_chain.append(EvidenceHop(
                step=5,
                title="Post-Quantum Signature Verification",
                status="FAILED",
                details=f"ML-DSA-65 signature verification failed: {sig_msg}",
                cryptographic_proof=f"Claimed Fingerprint: {ledger_record.public_key_fingerprint}"
            ))
            return self._build_failure_response(
                inv_id, filename, leaked_hash, evidence_chain,
                f"Signature verification failed: {sig_msg}"
            )

        evidence_chain.append(EvidenceHop(
            step=5,
            title="Post-Quantum Signature Verification",
            status="VERIFIED",
            details=f"Mathematically verified NIST FIPS 204 ML-DSA-65 signature using {rec.name}'s public key.",
            cryptographic_proof=f"Signature (first 32 hex chars): {ledger_record.signature[:32]}... [Key Fingerprint: {rec.dsa_fingerprint[:16]}...]"
        ))

        # Step 6: Full Ledger Continuity Audit
        ledger_audit = self.ledger_validator.validate_chain(verify_signatures=False)
        if not ledger_audit.is_valid:
            evidence_chain.append(EvidenceHop(
                step=6,
                title="Ledger Tamper Audit",
                status="FAILED",
                details=f"Ledger chain validation failed: {'; '.join(ledger_audit.errors)}",
                cryptographic_proof=None
            ))
            return self._build_failure_response(
                inv_id, filename, leaked_hash, evidence_chain,
                "Ledger integrity corrupted."
            )

        evidence_chain.append(EvidenceHop(
            step=6,
            title="Ledger Tamper Audit",
            status="VERIFIED",
            details=f"Ledger chain continuity confirmed across all {ledger_audit.checked_count} blocks. Zero mutations detected.",
            cryptographic_proof="Continuous SHA3-256 hash chaining cryptographically intact"
        ))

        # Step 7: Cryptographic Attribution Established
        evidence_chain.append(EvidenceHop(
            step=7,
            title="Cryptographic Attribution",
            status="VERIFIED",
            details=f"Unambiguously attributed to {rec.name} ({rec.recipient_id}) from decryption session {session_id}.",
            cryptographic_proof=f"Session: {session_id} • Watermark: {watermark_id} • Timestamp: {ledger_record.timestamp}"
        ))

        response = InvestigationResponse(
            investigation_id=inv_id,
            filename=filename,
            leaked_doc_hash=leaked_hash,
            overall_status="CRYPTOGRAPHICALLY VERIFIED",
            watermark_extracted=True,
            watermark_id=watermark_id,
            watermark_integrity_valid=True,
            watermark_layer=layer_name,
            attributed_recipient_id=rec.recipient_id,
            attributed_recipient_name=rec.name,
            attributed_recipient_role=rec.role,
            session_id=session_id,
            decryption_timestamp=ledger_record.timestamp,
            signature_verified=True,
            recipient_dsa_fingerprint=rec.dsa_fingerprint,
            ledger_verified=True,
            ledger_record_id=ledger_record.record_id,
            ledger_record_hash=ledger_record.record_hash,
            ledger_prev_hash=ledger_record.previous_record_hash,
            evidence_chain=evidence_chain,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

        # Store in database
        self._save_investigation(response)
        return response

    def _build_failure_response(
        self,
        inv_id: str,
        filename: str,
        leaked_hash: str,
        evidence_chain: List[EvidenceHop],
        reason: str
    ) -> InvestigationResponse:
        resp = InvestigationResponse(
            investigation_id=inv_id,
            filename=filename,
            leaked_doc_hash=leaked_hash,
            overall_status="VERIFICATION FAILED",
            watermark_extracted=False,
            watermark_integrity_valid=False,
            signature_verified=False,
            ledger_verified=False,
            evidence_chain=evidence_chain,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        self._save_investigation(resp)
        return resp

    def _save_investigation(self, resp: InvestigationResponse) -> None:
        rec = InvestigationDB(
            investigation_id=resp.investigation_id,
            filename=resp.filename,
            leaked_doc_hash=resp.leaked_doc_hash,
            status=resp.overall_status,
            extracted_watermark_id=resp.watermark_id,
            extracted_recipient_id=resp.attributed_recipient_id,
            extracted_session_id=resp.session_id,
            signature_verified=resp.signature_verified,
            ledger_verified=resp.ledger_verified,
            integrity_verified=resp.watermark_integrity_valid,
            evidence_json=json.dumps([h.model_dump() if hasattr(h, 'model_dump') else h.dict() for h in resp.evidence_chain]),
            timestamp=resp.timestamp,
        )
        self.db.add(rec)
        self.db.commit()

    def get_investigation(self, investigation_id: str) -> Optional[InvestigationResponse]:
        rec = self.db.query(InvestigationDB).filter(InvestigationDB.investigation_id == investigation_id).first()
        if not rec:
            return None
        hops = [EvidenceHop(**h) for h in json.loads(rec.evidence_json)]
        return InvestigationResponse(
            investigation_id=rec.investigation_id,
            filename=rec.filename,
            leaked_doc_hash=rec.leaked_doc_hash,
            overall_status=rec.status,
            watermark_extracted=bool(rec.extracted_watermark_id),
            watermark_id=rec.extracted_watermark_id,
            watermark_integrity_valid=rec.integrity_verified,
            attributed_recipient_id=rec.extracted_recipient_id,
            session_id=rec.extracted_session_id,
            signature_verified=rec.signature_verified,
            ledger_verified=rec.ledger_verified,
            evidence_chain=hops,
            timestamp=rec.timestamp,
        )
