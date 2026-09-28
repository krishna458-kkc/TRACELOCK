from fastapi import APIRouter
from datetime import datetime, timezone
from app.core.config import settings
from app.ledger.chain import OfflinePermissionedLedger

router = APIRouter(tags=["Health"])

@router.get("/health")
def get_health():
    ledger = OfflinePermissionedLedger()
    return {
        "status": "HEALTHY",
        "system": settings.PROJECT_NAME,
        "version": settings.API_VERSION,
        "air_gapped_enclave": True,
        "cloud_kms_dependency": False,
        "public_blockchain_dependency": False,
        "crypto_algorithms": {
            "key_establishment": settings.ALGORITHM_KEM,
            "digital_signatures": settings.ALGORITHM_SIGNATURE,
            "content_cipher": settings.ALGORITHM_SYMMETRIC,
            "cryptographic_hash": settings.ALGORITHM_HASH,
        },
        "ledger_blocks_committed": ledger.get_total_records(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
