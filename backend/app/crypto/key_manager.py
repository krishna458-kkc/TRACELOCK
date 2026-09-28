"""
Local Key Store for Prototype Demonstration.
EMULATING RECIPIENT HARDWARE-BOUND HSM TOKENS.
Private signing/decapsulation keys are stored in an encrypted/enclave-local prototype key vault
and are strictly NEVER returned over any API endpoint or exposed to the client.
"""

import json
from pathlib import Path
from typing import Optional, Dict, Tuple, Any
from app.core.config import KEYS_DIR
from app.crypto.pqc import b64_encode, b64_decode
from app.crypto.hashing import sha3_256_hex

class RecipientKeyVault:
    def __init__(self, storage_dir: Path = KEYS_DIR):
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _key_file(self, recipient_id: str) -> Path:
        # Sanitize recipient_id to prevent path traversal
        clean_id = "".join(c for c in recipient_id if c.isalnum() or c in ("-", "_"))
        return self.storage_dir / f"{clean_id}.json"

    def store_recipient_keys(
        self,
        recipient_id: str,
        kem_pk: bytes,
        kem_sk: bytes,
        dsa_pk: bytes,
        dsa_sk: bytes,
    ) -> Dict[str, str]:
        """
        Stores keypair material securely in local enclave vault.
        Returns public key metadata (fingerprints and base64 public keys).
        """
        fingerprint = sha3_256_hex(dsa_pk)
        kem_fingerprint = sha3_256_hex(kem_pk)

        vault_payload = {
            "recipient_id": recipient_id,
            "fingerprint": fingerprint,
            "kem_fingerprint": kem_fingerprint,
            "dsa_public_key": b64_encode(dsa_pk),
            "dsa_private_key": b64_encode(dsa_sk),
            "kem_public_key": b64_encode(kem_pk),
            "kem_private_key": b64_encode(kem_sk),
            "_prototype_notice": "EMULATING LOCAL SECURE RECIPIENT TOKEN (NEVER EXPOSED OVER NETWORK)",
        }

        path = self._key_file(recipient_id)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(vault_payload, f, indent=2)

        return {
            "fingerprint": fingerprint,
            "kem_fingerprint": kem_fingerprint,
            "dsa_public_key": b64_encode(dsa_pk),
            "kem_public_key": b64_encode(kem_pk),
        }

    def get_public_keys(self, recipient_id: str) -> Optional[Dict[str, str]]:
        """Returns only public key information (safe for APIs)."""
        path = self._key_file(recipient_id)
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {
            "recipient_id": data["recipient_id"],
            "fingerprint": data["fingerprint"],
            "kem_fingerprint": data["kem_fingerprint"],
            "dsa_public_key": data["dsa_public_key"],
            "kem_public_key": data["kem_public_key"],
        }

    def get_dsa_private_key(self, recipient_id: str) -> Optional[bytes]:
        """INTERNAL ENCLAVE USE ONLY for signing decryption events on recipient's behalf."""
        path = self._key_file(recipient_id)
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return b64_decode(data["dsa_private_key"])

    def get_kem_private_key(self, recipient_id: str) -> Optional[bytes]:
        """INTERNAL ENCLAVE USE ONLY for decapsulating document content key during recipient decryption."""
        path = self._key_file(recipient_id)
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return b64_decode(data["kem_private_key"])

    def generate_and_store_keys(self, recipient_id: str) -> Dict[str, str]:
        """Generates fresh ML-KEM-768 and ML-DSA-65 keypairs and stores them."""
        from app.crypto.pqc import KEMService, PQCSigner
        kem_pk, kem_sk = KEMService.generate_keypair()
        dsa_pk, dsa_sk = PQCSigner.generate_keypair()
        return self.store_recipient_keys(
            recipient_id=recipient_id,
            kem_pk=kem_pk,
            kem_sk=kem_sk,
            dsa_pk=dsa_pk,
            dsa_sk=dsa_sk,
        )

    def get_or_create_keys(self, recipient_id: str) -> Dict[str, Any]:
        """Gets full keys if existing, or generates fresh ones."""
        keys = self.get_keys(recipient_id)
        if keys:
            return keys
        self.generate_and_store_keys(recipient_id)
        return self.get_keys(recipient_id)

    def get_keys(self, recipient_id: str) -> Optional[Dict[str, Any]]:
        """INTERNAL ENCLAVE USE ONLY: Returns all keys for cryptographic operations."""
        path = self._key_file(recipient_id)
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def get_dsa_public_key(self, recipient_id: str) -> Optional[bytes]:
        """Returns raw public key bytes for signature verification."""
        path = self._key_file(recipient_id)
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return b64_decode(data["dsa_public_key"])

key_vault = RecipientKeyVault()

