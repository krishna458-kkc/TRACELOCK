import pytest
from app.crypto.pqc import KEMService, PQCSigner, PQCVerifier, b64_encode, b64_decode

def test_ml_kem_768_key_establishment():
    """Validates NIST FIPS 203 ML-KEM-768 key encapsulation and decapsulation."""
    pk, sk = KEMService.generate_keypair()
    assert len(pk) > 0
    assert len(sk) > 0

    ciphertext, shared_secret_sender = KEMService.encapsulate(pk)
    assert len(ciphertext) > 0
    assert len(shared_secret_sender) == 32

    shared_secret_recipient = KEMService.decapsulate(sk, ciphertext)
    assert shared_secret_sender == shared_secret_recipient

def test_ml_dsa_65_signing_and_verification():
    """Validates NIST FIPS 204 ML-DSA-65 digital signature creation and verification."""
    pk, sk = PQCSigner.generate_keypair()
    message = b"TRACELOCK Decryption Event Canonical Payload 2026"

    signature = PQCSigner.sign(sk, message)
    assert len(signature) > 0

    is_valid = PQCVerifier.verify(pk, message, signature)
    assert is_valid is True

def test_ml_dsa_65_rejects_tampered_message():
    """Validates that ML-DSA-65 signature fails when the message content is altered."""
    pk, sk = PQCSigner.generate_keypair()
    message = b"Original Decryption Record"
    tampered_message = b"Tampered Decryption Record"

    signature = PQCSigner.sign(sk, message)
    is_valid = PQCVerifier.verify(pk, tampered_message, signature)
    assert is_valid is False

def test_ml_dsa_65_rejects_wrong_public_key():
    """Validates that ML-DSA-65 signature fails when verified against a different public key."""
    pk1, sk1 = PQCSigner.generate_keypair()
    pk2, _ = PQCSigner.generate_keypair()
    message = b"Confidential Tactical Dispatch"

    sig1 = PQCSigner.sign(sk1, message)
    is_valid = PQCVerifier.verify(pk2, message, sig1)
    assert is_valid is False
