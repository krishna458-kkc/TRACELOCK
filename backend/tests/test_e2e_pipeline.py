import io
import pytest
from starlette.testclient import TestClient
from pypdf import PdfWriter
from app.main import app

def make_test_pdf() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()

def test_complete_e2e_forensic_pipeline():
    """
    Mandatory SIH260237 End-to-End Cryptographic & Forensic Validation Test:
    CREATE DOCUMENT → AUTHORIZE RECIPIENT → ENCRYPT → DECRYPT → GENERATE WATERMARK
    → SIGN EVENT → WRITE LEDGER → PRODUCE DECRYPTED DOCUMENT → TREAT AS LEAKED DOCUMENT
    → EXTRACT WATERMARK → LOOK UP LEDGER → VERIFY ML-DSA SIGNATURE → VALIDATE LEDGER → ATTRIBUTE RECIPIENT
    """
    with TestClient(app) as client:
        # Step 1: Verify health & offline state
        res_health = client.get("/health")
        assert res_health.status_code == 200
        health_data = res_health.json()
        assert health_data["air_gapped_enclave"] is True
        assert health_data["cloud_kms_dependency"] is False
        assert health_data["public_blockchain_dependency"] is False

        # Step 2: Register a new test recipient
        rec_data = {
            "recipient_id": "RECIPIENT-099",
            "name": "Vice Admiral S. Rawat",
            "role": "Director General of Naval Intelligence"
        }
        res_rec = client.post("/recipients", json=rec_data)
        assert res_rec.status_code in (200, 201)
        rec_info = res_rec.json()
        assert rec_info["recipient_id"] == "RECIPIENT-099"
        assert len(rec_info["dsa_fingerprint"]) == 64

        # Step 3: Create & Upload a new document
        pdf_bytes = make_test_pdf()
        files = {"file": ("OPERATION_TRIDENT.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        data = {"document_id": "DOC-TRIDENT-01"}
        res_doc = client.post("/documents", files=files, data=data)
        assert res_doc.status_code in (200, 201)
        doc_info = res_doc.json()
        assert doc_info["document_id"] == "DOC-TRIDENT-01"

        # Step 4: Broadcast Encrypt with AES-256-GCM and ML-KEM-768 encapsulation
        encrypt_payload = {"recipient_ids": ["RECIPIENT-099", "RECIPIENT-047"]}
        res_enc = client.post("/documents/DOC-TRIDENT-01/encrypt", json=encrypt_payload)
        assert res_enc.status_code == 200
        enc_info = res_enc.json()
        assert enc_info["is_encrypted"] is True
        assert enc_info["recipient_encapsulations_count"] == 2

        # Step 5: Test Unauthorized/Revoked Recipient Rejection
        client.post("/recipients/RECIPIENT-099/revoke")
        res_revoked_dec = client.post("/sessions/decrypt", json={
            "document_id": "DOC-TRIDENT-01",
            "recipient_id": "RECIPIENT-099"
        })
        assert res_revoked_dec.status_code == 403  # Forbidden because revoked!

        # Re-authorize
        client.post("/recipients/RECIPIENT-099/authorize")

        # Step 6: Decrypt Document as RECIPIENT-099
        import secrets
        run_suffix = secrets.token_hex(2).upper()
        custom_session = f"SES-TRIDENT-{run_suffix}"
        custom_wm = f"WM-TRIDENT-{run_suffix}"
        res_dec = client.post("/sessions/decrypt", json={
            "document_id": "DOC-TRIDENT-01",
            "recipient_id": "RECIPIENT-099",
            "custom_session_id": custom_session,
            "custom_watermark_id": custom_wm
        })
        assert res_dec.status_code in (200, 201)
        dec_info = res_dec.json()
        assert dec_info["session_id"] == custom_session
        assert dec_info["watermark_id"] == custom_wm
        assert len(dec_info["signature"]) > 0  # ML-DSA-65 signature present


        # Step 7: Download the watermarked decrypted PDF
        res_dl = client.get(dec_info["watermarked_pdf_download_url"])
        assert res_dl.status_code == 200
        leaked_pdf_bytes = res_dl.content

        # Step 8: Upload Leaked PDF to Forensic Investigation Engine
        files_leak = {"file": ("leaked_trident_dispatch.pdf", io.BytesIO(leaked_pdf_bytes), "application/pdf")}
        res_inv = client.post("/investigation/analyze", files=files_leak)
        assert res_inv.status_code == 200
        inv_data = res_inv.json()

        # Step 9: Verify Exact Cryptographic Attribution
        assert inv_data["overall_status"] == "CRYPTOGRAPHICALLY VERIFIED"
        assert inv_data["attributed_recipient_id"] == "RECIPIENT-099"
        assert inv_data["attributed_recipient_name"] == "Vice Admiral S. Rawat"
        assert inv_data["session_id"] == custom_session
        assert inv_data["watermark_id"] == custom_wm
        assert inv_data["signature_verified"] is True
        assert inv_data["ledger_verified"] is True
        assert len(inv_data["evidence_chain"]) == 7

        # Step 10: Negative Attribution Test on Plain Clean Document
        clean_pdf = make_test_pdf()
        files_clean = {"file": ("clean_unwatermarked.pdf", io.BytesIO(clean_pdf), "application/pdf")}
        res_clean_inv = client.post("/investigation/analyze", files=files_clean)
        assert res_clean_inv.status_code == 200
        clean_inv_data = res_clean_inv.json()
        assert clean_inv_data["overall_status"] == "VERIFICATION FAILED"
        assert clean_inv_data["watermark_extracted"] is False

        # Step 11: Validate Immutable Offline Ledger Chain Integrity
        res_ledger_val = client.post("/ledger/validate")
        assert res_ledger_val.status_code == 200
        ledger_audit = res_ledger_val.json()
        assert ledger_audit["is_valid"] is True
        assert ledger_audit["status"] == "VALID"
