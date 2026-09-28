"""
NIST Post-Quantum Cryptography Module for TRACELOCK.
Implements:
- Key Establishment: ML-KEM-768 (NIST FIPS 203)
- Digital Signatures: ML-DSA-65 (NIST FIPS 204)
Operates 100% offline using compiled, auditable PQC implementations.
"""

import base64
from typing import Tuple
from pqcrypto.kem import ml_kem_768
from pqcrypto.sign import ml_dsa_65
from pqcrypto import InvalidSignatureError

class PQCError(Exception):
    pass

class KEMService:
    """NIST FIPS 203 ML-KEM-768 Key Encapsulation Mechanism Service."""
    
    @staticmethod
    def keygen() -> Tuple[bytes, bytes]:
        """
        Generates an ML-KEM-768 keypair.
        Returns: (public_key_bytes, secret_key_bytes)
        """
        return ml_kem_768.keygen()

    @staticmethod
    def generate_keypair() -> Tuple[bytes, bytes]:
        return KEMService.keygen()

    @staticmethod
    def encapsulate(recipient_public_key: bytes) -> Tuple[bytes, bytes]:
        """
        Encapsulates a shared secret using recipient's ML-KEM-768 public key.
        Returns: (kem_ciphertext_bytes, shared_secret_32_bytes)
        """
        try:
            ciphertext, shared_secret = ml_kem_768.encaps(recipient_public_key)
            return ciphertext, shared_secret
        except Exception as e:
            raise PQCError(f"ML-KEM-768 encapsulation failed: {str(e)}") from e

    @staticmethod
    def decapsulate(recipient_secret_key: bytes, kem_ciphertext: bytes) -> bytes:
        """
        Decapsulates the shared secret using recipient's ML-KEM-768 secret key.
        Returns: shared_secret_32_bytes
        """
        try:
            shared_secret = ml_kem_768.decaps(recipient_secret_key, kem_ciphertext)
            return shared_secret
        except Exception as e:
            raise PQCError(f"ML-KEM-768 decapsulation failed: {str(e)}") from e


class PQCSigner:
    """NIST FIPS 204 ML-DSA-65 Digital Signature Signer."""

    @staticmethod
    def keygen() -> Tuple[bytes, bytes]:
        """
        Generates an ML-DSA-65 signing keypair.
        Returns: (public_verification_key_bytes, private_signing_key_bytes)
        """
        return ml_dsa_65.keygen()

    @staticmethod
    def generate_keypair() -> Tuple[bytes, bytes]:
        return PQCSigner.keygen()

    @staticmethod
    def sign(private_signing_key: bytes, message: bytes) -> bytes:
        """
        Signs a message using recipient's private ML-DSA-65 key.
        Returns: signature_bytes
        """
        try:
            return ml_dsa_65.sign(private_signing_key, message)
        except Exception as e:
            raise PQCError(f"ML-DSA-65 signing failed: {str(e)}") from e

    @staticmethod
    def sign_mldsa(private_signing_key: bytes, message: bytes) -> str:
        """Signs and returns hex signature."""
        return PQCSigner.sign(private_signing_key, message).hex()


class PQCVerifier:
    """NIST FIPS 204 ML-DSA-65 Digital Signature Verifier."""

    @staticmethod
    def verify(public_verification_key: bytes, message: bytes, signature: bytes) -> bool:
        """
        Verifies an ML-DSA-65 signature against message and public key.
        Returns True if mathematically valid, False otherwise.
        """
        try:
            ml_dsa_65.verify(public_verification_key, message, signature)
            return True
        except InvalidSignatureError:
            return False
        except Exception:
            return False

    @staticmethod
    def verify_mldsa(public_key_b64: str, message: bytes, signature_hex: str) -> Tuple[bool, str]:
        """Verifies signature from base64 public key and hex signature string."""
        try:
            pk = base64.b64decode(public_key_b64.encode('ascii'))
            sig = bytes.fromhex(signature_hex)
            valid = PQCVerifier.verify(pk, message, sig)
            if valid:
                return True, "ML-DSA-65 signature cryptographically verified"
            return False, "ML-DSA-65 signature verification failed: signature is invalid for this message/key"
        except Exception as e:
            return False, f"Signature verification error: {str(e)}"


def b64_encode(data: bytes) -> str:
    return base64.b64encode(data).decode("ascii")

def b64_decode(data_str: str) -> bytes:
    return base64.b64decode(data_str.encode("ascii"))
