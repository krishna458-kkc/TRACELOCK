import os
from typing import Tuple
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def generate_content_key() -> bytes:
    """Generates a high-entropy 256-bit symmetric content-encryption key."""
    return AESGCM.generate_key(bit_length=256)

def encrypt_document_payload(plaintext: bytes, content_key: bytes) -> Tuple[bytes, bytes]:
    """
    Encrypts document payload with AES-256-GCM.
    Returns (nonce_12_bytes, ciphertext_with_tag).
    """
    aesgcm = AESGCM(content_key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext, None)
    return nonce, ciphertext

def decrypt_document_payload(ciphertext: bytes, nonce: bytes, content_key: bytes) -> bytes:
    """
    Decrypts AES-256-GCM ciphertext. Raises an exception if ciphertext or tag was tampered with.
    """
    aesgcm = AESGCM(content_key)
    return aesgcm.decrypt(nonce, ciphertext, None)

class SymmetricCipher:
    @staticmethod
    def generate_key() -> bytes:
        return generate_content_key()

    @staticmethod
    def encrypt(key: bytes, plaintext: bytes) -> bytes:
        """Encrypts plaintext with AES-256-GCM, returning nonce (12 bytes) + ciphertext_with_tag."""
        nonce, ct = encrypt_document_payload(plaintext, key)
        return nonce + ct

    @staticmethod
    def decrypt(key: bytes, payload: bytes) -> bytes:
        """Decrypts AES-256-GCM blob containing 12-byte nonce followed by ciphertext_with_tag."""
        if len(payload) < 12:
            raise ValueError("Payload too short for AES-256-GCM decryption")
        nonce = payload[:12]
        ct = payload[12:]
        return decrypt_document_payload(ct, nonce, key)
