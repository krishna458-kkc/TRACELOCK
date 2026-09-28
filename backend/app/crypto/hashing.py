import hashlib
from typing import Union

def sha3_256_bytes(data: Union[bytes, bytearray]) -> bytes:
    """Computes raw 32-byte SHA3-256 digest (NIST FIPS 202)."""
    return hashlib.sha3_256(data).digest()

def sha3_256_hex(data: Union[bytes, bytearray, str]) -> str:
    """Computes 64-char lowercase hex SHA3-256 digest."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha3_256(data).hexdigest()

def sha256_hex(data: Union[bytes, bytearray, str]) -> str:
    """Computes standard 64-char lowercase hex SHA-256 digest."""
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()

def canonical_event_hash(canonical_json_str: str) -> str:
    """Computes cryptographic digest of a canonicalized JSON event string."""
    return sha3_256_hex(canonical_json_str.encode("utf-8"))
