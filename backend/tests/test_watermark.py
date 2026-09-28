import io
import pytest
from pypdf import PdfWriter
from app.watermark.generator import build_forensic_payload, generate_watermark_id
from app.watermark.embedder import embed_watermark_in_pdf
from app.watermark.extractor import extract_watermark_from_pdf
from app.watermark.verifier import verify_watermark_integrity

def create_sample_pdf() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()

def test_watermark_generation_and_uniqueness():
    """Validates that distinct calls yield unique watermark IDs and nonces."""
    w1 = generate_watermark_id()
    w2 = generate_watermark_id()
    assert w1.startswith("WM-")
    assert w2.startswith("WM-")
    assert w1 != w2

    p1, _, _ = build_forensic_payload("DOC-01", "REC-01", "SES-01", "hash1")
    p2, _, _ = build_forensic_payload("DOC-01", "REC-01", "SES-01", "hash1")
    assert p1["n"] != p2["n"]  # Dynamic nonces differ

def test_watermark_embedding_and_extraction():
    """Validates that invisible watermark is cleanly embedded and extracted from PDF."""
    pdf = create_sample_pdf()
    payload, payload_json, p_hash = build_forensic_payload(
        document_id="DOC-A71F",
        recipient_id="RECIPIENT-047",
        session_id="SES-8F29A1",
        document_hash="49ff4425b7d51aa2",
        watermark_id="WM-72C9E41B"
    )

    embedded_pdf = embed_watermark_in_pdf(pdf, payload_json, recipient_signature="deadbeef")
    assert len(embedded_pdf) > len(pdf)

    extracted_dict, raw_json, layer = extract_watermark_from_pdf(embedded_pdf)
    assert extracted_dict is not None
    assert extracted_dict["wid"] == "WM-72C9E41B"
    assert extracted_dict["rid"] == "RECIPIENT-047"
    assert extracted_dict["sid"] == "SES-8F29A1"
    assert "Layer" in layer

def test_watermark_integrity_verification():
    """Validates that valid payloads pass integrity verification, and altered fields fail."""
    payload, payload_json, p_hash = build_forensic_payload(
        document_id="DOC-A71F",
        recipient_id="RECIPIENT-047",
        session_id="SES-8F29A1",
        document_hash="49ff4425b7d51aa2"
    )

    is_valid, msg = verify_watermark_integrity(payload)
    assert is_valid is True

    # Tamper with recipient ID in payload
    tampered_payload = dict(payload)
    tampered_payload["rid"] = "RECIPIENT-999"
    is_valid_tampered, fail_msg = verify_watermark_integrity(tampered_payload)
    assert is_valid_tampered is False
    assert "mismatch" in fail_msg
