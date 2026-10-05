import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.storage.database import init_db, SessionLocal, RecipientDB, DocumentDB
from app.services.recipient_service import RecipientService
from app.services.document_service import DocumentService
from app.schemas.recipient import RecipientCreate
from app.api.health import router as health_router
from app.api.documents import router as documents_router
from app.api.recipients import router as recipients_router
from app.api.sessions import router as sessions_router
from app.api.investigation import router as investigation_router
from app.api.ledger import router as ledger_router
from app.api.crypto import router as crypto_router
from pypdf import PdfWriter
import io

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tracelock-backend")

def seed_demonstration_data():
    """
    Seeds canonical demonstration recipients and document DOC-A71F
    to maintain 100% fidelity with the SIH260237 prototype UI dataset.
    """
    db = SessionLocal()
    try:
        rec_service = RecipientService(db)
        doc_service = DocumentService(db)

        # 1. Seed demo recipients
        demo_recipients = [
            RecipientCreate(
                recipient_id="RECIPIENT-021",
                name="Lt. Col. S. Varma",
                role="Senior Cryptographic Analyst / DRDO Cyber Cell"
            ),
            RecipientCreate(
                recipient_id="RECIPIENT-047",
                name="Cdr. R. Iyer",
                role="Chief Tactical Officer / Directorate of Naval Operations"
            ),
            RecipientCreate(
                recipient_id="RECIPIENT-063",
                name="Dr. A. Raman",
                role="Director of Special Operations / Joint Intelligence Command"
            ),
            RecipientCreate(
                recipient_id="RECIPIENT-012",
                name="S. Banerjee",
                role="Deputy Director, Acquisitions / Acquisitions Wing"
            ),
            RecipientCreate(
                recipient_id="RECIPIENT-023",
                name="Maj. K. Rathore",
                role="Field Operations Planner / Operations Directorate"
            ),
            RecipientCreate(
                recipient_id="RECIPIENT-031",
                name="Dr. P. Nair",
                role="Senior Threat Analyst / Defence Cyber Agency"
            ),
            RecipientCreate(
                recipient_id="RECIPIENT-058",
                name="A. Kulkarni",
                role="Legal Advisor / Office of the Judge Advocate General"
            ),
            RecipientCreate(
                recipient_id="RECIPIENT-064",
                name="V. Sharma",
                role="Finance Controller / Defence Finance Division"
            ),
            RecipientCreate(
                recipient_id="RECIPIENT-099",
                name="Vice Admiral S. Rawat",
                role="Vice Chief of Naval Staff / Naval HQ"
            ),
        ]

        for r in demo_recipients:
            rec_service.create_recipient(r)

        # 2. Seed prototype demo documents if missing
        demo_docs = [
            {
                "id": "DOC-A71F",
                "filename": "DEFENCE_BRIEF_07.pdf",
                "recipients": ["RECIPIENT-021", "RECIPIENT-047", "RECIPIENT-063", "RECIPIENT-012", "RECIPIENT-023", "RECIPIENT-031", "RECIPIENT-058", "RECIPIENT-064", "RECIPIENT-099"]
            },
            {
                "id": "DOC-B3E2",
                "filename": "PROCUREMENT_REVIEW_Q3.pdf",
                "recipients": ["RECIPIENT-012", "RECIPIENT-064", "RECIPIENT-031", "RECIPIENT-021", "RECIPIENT-047"]
            },
            {
                "id": "DOC-C904",
                "filename": "FIELD_OPS_DIRECTIVE.pdf",
                "recipients": ["RECIPIENT-023", "RECIPIENT-047", "RECIPIENT-058", "RECIPIENT-064"]
            },
            {
                "id": "DOC-D518",
                "filename": "CYBER_INCIDENT_REPORT.pdf",
                "recipients": ["RECIPIENT-031", "RECIPIENT-012", "RECIPIENT-047"]
            },
        ]

        for dd in demo_docs:
            existing_doc = db.query(DocumentDB).filter(DocumentDB.document_id == dd["id"]).first()
            if not existing_doc:
                writer = PdfWriter()
                writer.add_blank_page(width=612, height=792)
                buf = io.BytesIO()
                writer.write(buf)
                pdf_bytes = buf.getvalue()

                doc_service.upload_document(
                    filename=dd["filename"],
                    content=pdf_bytes,
                    document_id=dd["id"]
                )
                doc_service.encrypt_and_distribute(
                    document_id=dd["id"],
                    recipient_ids=dd["recipients"]
                )
                logger.info(f"Successfully seeded demo document {dd['id']} ({dd['filename']}) with NIST PQC ML-KEM-768 broadcast encapsulation.")

    except Exception as e:
        logger.error(f"Error seeding demo data: {str(e)}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing TRACELOCK Air-Gapped Cryptographic Backend...")
    init_db()
    seed_demonstration_data()
    logger.info("TRACELOCK Cryptographic Enclave Backend is READY.")
    yield
    # Shutdown
    logger.info("TRACELOCK Backend shutting down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    description="Offline Air-Gapped Backend for TRACELOCK (SIH2026 Problem Statement SIH260237). "
                "Provides NIST FIPS 203 ML-KEM-768, NIST FIPS 204 ML-DSA-65, AES-256-GCM broadcast encryption, "
                "forensic invisible steganographic watermarking, and an offline permissioned tamper-evident ledger.",
    lifespan=lifespan,
)

# Enable CORS for local frontend prototype access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(health_router)
app.include_router(documents_router)
app.include_router(recipients_router)
app.include_router(sessions_router)
app.include_router(investigation_router)
app.include_router(ledger_router)
app.include_router(crypto_router)
