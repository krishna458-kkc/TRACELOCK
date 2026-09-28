import urllib.request
import urllib.parse
import json
import io
import os
import secrets
from app.watermark.extractor import extract_watermark_from_pdf
from app.watermark.verifier import verify_watermark_integrity

BASE_URL = 'http://127.0.0.1:8000'

def http_get(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        return resp.getcode(), resp.read()

def http_post_json(url, data):
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req) as resp:
        return resp.getcode(), json.loads(resp.read().decode('utf-8'))

def http_post_file(url, field_name, filename, file_bytes):
    boundary = '----TraceLockBoundary7MA4YWxkTrZu0gW'
    body = bytearray()
    body.extend(f'--{boundary}\r\n'.encode('utf-8'))
    body.extend(f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\n'.encode('utf-8'))
    body.extend(b'Content-Type: application/pdf\r\n\r\n')
    body.extend(file_bytes)
    body.extend(f'\r\n--{boundary}--\r\n'.encode('utf-8'))
    
    req = urllib.request.Request(
        url,
        data=bytes(body),
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        return resp.getcode(), json.loads(resp.read().decode('utf-8'))

def main():
    print("=" * 80)
    print("TRACELOCK: REAL FORENSIC ATTRIBUTION DEMONSTRATION")
    print("SIH2026 Problem Statement SIH260237")
    print("=" * 80 + "\n")

    # 1. Verify Document in Repository
    print("--- STEP 1: VERIFYING DOCUMENT IN REPOSITORY ---")
    code, doc_raw = http_get(f"{BASE_URL}/documents/DOC-A71F")
    doc = json.loads(doc_raw.decode('utf-8'))
    print(f"Document ID          : {doc['document_id']}")
    print(f"Filename             : {doc['filename']}")
    print(f"Document SHA3 Hash   : {doc['document_hash']}")
    print(f"Encrypted Status     : {doc['is_encrypted']}")
    print(f"Authorized Recipients: {doc['authorized_recipients']}\n")

    # 2. Verify Recipient
    print("--- STEP 2: VERIFYING RECIPIENT IDENTITY & PQC KEYS ---")
    code, rec_raw = http_get(f"{BASE_URL}/recipients/RECIPIENT-047")
    rec = json.loads(rec_raw.decode('utf-8'))
    print(f"Recipient ID         : {rec['recipient_id']}")
    print(f"Officer Name         : {rec['name']}")
    print(f"Role                 : {rec['role']}")
    print(f"Authorization Status : {rec['status']}")
    print(f"ML-DSA-65 Fingerprint: {rec['dsa_fingerprint']}")
    print(f"ML-KEM-768 Fingerprt : {rec['kem_fingerprint']}\n")

    # 3. Perform Live Decryption Session for RECIPIENT-047
    print("--- STEP 3: PERFORMING INDIVIDUAL DECRYPTION SESSION ---")
    session_suffix = secrets.token_hex(2).upper()
    new_session_id = f"SES-047-{session_suffix}"
    new_wm_id = f"WM-047-{session_suffix}"

    code, dec_resp = http_post_json(f"{BASE_URL}/sessions/decrypt", {
        "document_id": "DOC-A71F",
        "recipient_id": "RECIPIENT-047",
        "custom_session_id": new_session_id,
        "custom_watermark_id": new_wm_id
    })
    print(f"HTTP Status          : {code}")
    print(f"Session ID Generated : {dec_resp['session_id']}")
    print(f"Forensic Watermark ID: {dec_resp['watermark_id']}")
    print(f"Watermark SHA3 Hash  : {dec_resp['watermark_hash']}")
    print(f"Ledger Block Index   : #{dec_resp['ledger_record_id']}")
    print(f"Decryption Timestamp : {dec_resp['timestamp']}")
    print(f"ML-DSA-65 Signature  : {dec_resp['signature'][:48]}... ({len(dec_resp['signature'])//2} bytes)")
    print(f"Download Endpoint    : {dec_resp['watermarked_pdf_download_url']}\n")

    # 4. Download the Decrypted & Watermarked PDF
    print("--- STEP 4: RETRIEVING WATERMARKED PDF ---")
    dl_url = f"{BASE_URL}{dec_resp['watermarked_pdf_download_url']}"
    code, pdf_bytes = http_get(dl_url)
    print(f"Downloaded File Size : {len(pdf_bytes)} bytes")
    print(f"Target File Saved As : {new_session_id}_decrypted.pdf\n")

    # 5. Direct In-Enclave Inspection of the Generated PDF (Proving Watermark is in PDF)
    print("--- STEP 5: PROVING WATERMARK EXISTS INSIDE THE GENERATED PDF ---")
    extracted_payload, raw_json, layer_name = extract_watermark_from_pdf(pdf_bytes)
    print(f"Extraction Layer     : {layer_name}")
    print(f"Extracted Watermark  : {extracted_payload.get('wid')}")
    print(f"Extracted Session    : {extracted_payload.get('sid')}")
    print(f"Extracted Recipient  : {extracted_payload.get('rid')}")
    print(f"Extracted Doc Hash   : {extracted_payload.get('dh')}")
    print(f"Extracted Nonce      : {extracted_payload.get('n')}")
    print(f"Extracted Checksum   : {extracted_payload.get('chk')}")

    is_valid, msg = verify_watermark_integrity(extracted_payload)
    print(f"Integrity Verification: {is_valid} ({msg})\n")

    # 6. Submit Generated PDF to Forensic Investigation API
    print("--- STEP 6: SUBMITTING LEAKED PDF TO FORENSIC INVESTIGATION API ---")
    code, inv_resp = http_post_file(f"{BASE_URL}/investigation/analyze", 'file', f"leaked_{new_session_id}.pdf", pdf_bytes)
    print(f"Investigation ID     : {inv_resp['investigation_id']}")
    print(f"Leaked Document Hash : {inv_resp['leaked_doc_hash']}")
    print(f"Watermark Extracted  : {inv_resp['watermark_extracted']} ({inv_resp['watermark_id']})")
    print(f"Watermark Integrity  : {inv_resp['watermark_integrity_valid']}")
    print(f"Signature Verified   : {inv_resp['signature_verified']} ({inv_resp['signature_algorithm']})")
    print(f"Ledger Verified      : {inv_resp['ledger_verified']} (Block #{inv_resp['ledger_record_id']})")
    print(f"Attributed Recipient : {inv_resp['attributed_recipient_name']} ({inv_resp['attributed_recipient_id']})")
    print(f"Attributed Role      : {inv_resp['attributed_recipient_role']}")
    print(f"Final Status         : {inv_resp['overall_status']}\n")

    print("--- STEP 7: EVIDENCE CHAIN AUDIT TRAIL ---")
    for hop in inv_resp["evidence_chain"]:
        print(f"  [Step {hop['step']}] {hop['title']}: {hop['status']}")
        print(f"         Details: {hop['details']}")
        if hop.get("cryptographic_proof"):
            print(f"         Proof  : {hop['cryptographic_proof'][:75]}...")

    print("\n" + "=" * 80)
    print("DEMONSTRATION COMPLETED SUCCESSFULLY")
    print("=" * 80)

if __name__ == '__main__':
    main()
