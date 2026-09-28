import json
from typing import Dict, Any, Tuple
from app.crypto.hashing import sha3_256_hex

def verify_watermark_integrity(payload: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Verifies the cryptographic integrity of an extracted watermark payload.
    Checks required forensic fields and validates the SHA3-256 checksum tag.
    """
    required_keys = {"wid", "did", "rid", "sid", "dh", "ts", "n", "chk"}
    if not required_keys.issubset(payload.keys()):
        missing = required_keys - set(payload.keys())
        return False, f"Missing required forensic fields: {missing}"

    chk_claimed = payload["chk"]
    # Recompute payload hash without the 'chk' tag
    reconstructed = {k: v for k, v in payload.items() if k != "chk"}
    reconstructed_json = json.dumps(reconstructed, sort_keys=True, separators=(',', ':'))
    computed_hash = sha3_256_hex(reconstructed_json)
    
    if computed_hash[:12] != chk_claimed:
        return False, f"Watermark integrity checksum mismatch: expected {computed_hash[:12]}, got {chk_claimed}"

    return True, "Watermark payload integrity cryptographically verified"
