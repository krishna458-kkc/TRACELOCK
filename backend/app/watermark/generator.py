import os
import json
import secrets
from datetime import datetime, timezone
from typing import Dict, Any, Tuple
from app.crypto.hashing import sha3_256_hex

def generate_watermark_id() -> str:
    """Generates an 8-character uppercase hex watermark identifier (e.g. WM-72C9E41B)."""
    return f"WM-{secrets.token_hex(4).upper()}"

def build_forensic_payload(
    document_id: str,
    recipient_id: str,
    session_id: str,
    document_hash: str,
    watermark_id: str = None,
    timestamp: str = None,
) -> Tuple[Dict[str, Any], str, str]:
    """
    Constructs a structured forensic watermark payload.
    Returns: (payload_dict, payload_json, payload_hash)
    """
    if watermark_id is None:
        watermark_id = generate_watermark_id()
    if timestamp is None:
        timestamp = datetime.now(timezone.utc).isoformat()
    
    nonce = secrets.token_hex(8)
    
    payload = {
        "v": 2,
        "wid": watermark_id,
        "did": document_id,
        "rid": recipient_id,
        "sid": session_id,
        "dh": document_hash[:16],  # Hash reference
        "ts": timestamp,
        "n": nonce,
    }
    
    payload_json = json.dumps(payload, sort_keys=True, separators=(',', ':'))
    payload_hash = sha3_256_hex(payload_json)
    payload["chk"] = payload_hash[:12]
    
    final_json = json.dumps(payload, sort_keys=True, separators=(',', ':'))
    return payload, final_json, payload_hash
