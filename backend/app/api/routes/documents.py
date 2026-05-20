"""Document management routes — upload, list, get, search, delete.

Provides the /api/documents/* endpoints consumed by the frontend's
DocumentProvider and document-related components.

Adapted from the existing ingest.py pattern (APIRouter, require_user, raw SQL).
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_user
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Schemas — mirror the frontend's DocumentItem / DocumentUploadResponse types
# ---------------------------------------------------------------------------

class DocumentResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    type: str  # "pdf" | "image" | "text"
    status: str  # "processing" | "ready" | "error"
    pageCount: Optional[int] = None
    fileSize: int
    uploadedAt: str


class DocumentUploadResponse(BaseModel):
    id: str
    status: str


class DocumentSearchResult(BaseModel):
    doc_id: str
    chunk_text: str
    relevance_score: float


class DocumentSearchRequest(BaseModel):
    query: str
    top_k: int = 5


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "gif", "webp", "txt"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
TYPE_MAP: dict[str, str] = {
    "pdf": "pdf",
    "png": "image", "jpg": "image", "jpeg": "image",
    "gif": "image", "webp": "image",
    "txt": "text",
}


def _determine_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return TYPE_MAP.get(ext, "text")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> list[DocumentResponse]:
    """List all documents, ordered by upload time descending."""
    result = await db.execute(
        text(
            "SELECT id, title, description, type, status, page_count, file_size, "
            "  to_char(uploaded_at, 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS uploaded_at "
            "FROM documents ORDER BY uploaded_at DESC LIMIT 200"
        )
    )
    rows = result.fetchall()
    return [
        DocumentResponse(
            id=str(r[0]),
            title=r[1],
            description=r[2],
            type=r[3],
            status=r[4],
            pageCount=r[5],
            fileSize=r[6],
            uploadedAt=r[7],
        )
        for r in rows
    ]


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    """Get a single document by ID."""
    result = await db.execute(
        text(
            "SELECT id, title, description, type, status, page_count, file_size, "
            "  to_char(uploaded_at, 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS uploaded_at "
            "FROM documents WHERE id = :id"
        ),
        {"id": document_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return DocumentResponse(
        id=str(row[0]),
        title=row[1],
        description=row[2],
        type=row[3],
        status=row[4],
        pageCount=row[5],
        fileSize=row[6],
        uploadedAt=row[7],
    )


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentUploadResponse:
    """Upload a document file, store in MinIO, create a DB record.

    Accepts: PDF, PNG, JPG, GIF, WEBP, TXT (up to 50 MB).
    """
    # -- Validate file -----------------------------------------------------------
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: .{ext}. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 50 MB limit",
        )

    # -- Store in MinIO ---------------------------------------------------------
    from app.services.storage import upload_to_minio

    object_name = await upload_to_minio(file.filename, contents)
    doc_type = _determine_type(file.filename)

    # -- Create DB record -------------------------------------------------------
    doc_title = (title or file.filename)[:255]
    doc_description = (description or "")[:2000] if description else None

    result = await db.execute(
        text(
            "INSERT INTO documents (title, description, type, status, file_size, page_count) "
            "VALUES (:title, :description, :type, 'processing', :file_size, NULL) "
            "RETURNING id"
        ),
        {
            "title": doc_title,
            "description": doc_description,
            "type": doc_type,
            "file_size": len(contents),
        },
    )
    doc_id = str(result.scalar_one())
    await db.commit()

    # -- Trigger async processing if PDF ----------------------------------------
    if ext == "pdf":
        try:
            from app.tasks.ocr_tasks import process_pdf_task

            process_pdf_task.delay(doc_id, object_name)
            logger.info(f"Triggered OCR task for document {doc_id}")
        except Exception as e:
            logger.warning(f"Could not trigger OCR task (worker may be offline): {e}")

    logger.info(f"Document {doc_id} uploaded: {file.filename} ({doc_type}, {len(contents)} bytes)")
    return DocumentUploadResponse(id=doc_id, status="processing")


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a document by ID."""
    result = await db.execute(
        text("DELETE FROM documents WHERE id = :id RETURNING id"),
        {"id": document_id},
    )
    deleted = result.fetchone()
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    await db.commit()


@router.post("/{document_id}/search", response_model=list[DocumentSearchResult])
async def search_document(
    document_id: str,
    body: DocumentSearchRequest,
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> list[DocumentSearchResult]:
    """Semantic search within a document's extracted chunks.

    This is a stub that returns an empty list until the embedding/vector-search
    infrastructure is wired up.  The endpoint shape matches what the frontend
    expects so the UI can be tested end-to-end.
    """
    # Verify the document exists
    result = await db.execute(
        text("SELECT id FROM documents WHERE id = :id"),
        {"id": document_id},
    )
    if not result.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # TODO: Wire to the embedding service + pgvector once available.
    # For now, return an empty result set so the UI doesn't break.
    logger.info(
        "Document search stub called for doc=%s query=%r — returning empty (vector search not wired yet)",
        document_id,
        body.query,
    )
    return []