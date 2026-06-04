"""Document management routes — upload, list, get, search, delete.

FIXES APPLIED:
  - #5   Multi-tenant isolation (IDOR): every SQL query now includes
          user_id.  The documents table has a user_id column; uploads store
          it, list/get/delete filter by it, and the search endpoint filters
          raw_components by parent_doc_id + user_id.
  - #6   Document semantic search: wired to pgvector via embedding service.
"""

from __future__ import annotations

import logging

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_user
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class DocumentResponse(BaseModel):
    id: str
    title: str
    description: str | None = None
    type: str
    status: str
    pageCount: int | None = None
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
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MiB
CHUNK_SIZE = 64 * 1024             # 64 KiB streaming

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
    """List the current user's documents, newest first."""
    result = await db.execute(
        text(
            "SELECT id, title, description, type, status, page_count, file_size, "
            "  to_char(uploaded_at, 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS uploaded_at "
            "FROM documents "
            "WHERE user_id = :uid "
            "ORDER BY uploaded_at DESC LIMIT 200"
        ),
        {"uid": user_id},
    )
    rows = result.fetchall()
    return [
        DocumentResponse(
            id=str(r[0]), title=r[1], description=r[2], type=r[3],
            status=r[4], pageCount=r[5], fileSize=r[6], uploadedAt=r[7],
        )
        for r in rows
    ]


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    """Get a single document owned by the current user."""
    result = await db.execute(
        text(
            "SELECT id, title, description, type, status, page_count, file_size, "
            "  to_char(uploaded_at, 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') AS uploaded_at "
            "FROM documents WHERE id = :id AND user_id = :uid"
        ),
        {"id": document_id, "uid": user_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found"
        )
    return DocumentResponse(
        id=str(row[0]), title=row[1], description=row[2], type=row[3],
        status=row[4], pageCount=row[5], fileSize=row[6], uploadedAt=row[7],
    )


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: str | None = Form(None),
    description: str | None = Form(None),
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> DocumentUploadResponse:
    """Upload a document file, store in MinIO, create a DB record owned by user."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No file provided",
        )

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unsupported file type: .{ext}. "
                f"Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )

    # ------------------------------------------------------------------
    # FIX #2C (streaming) + #5 (user_id): stream to validate size,
    # then upload to MinIO and store with user_id.
    # ------------------------------------------------------------------
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 50 MB limit",
        )

    from app.services.storage import upload_to_minio

    object_name = await upload_to_minio(file.filename, contents)
    doc_type = _determine_type(file.filename)
    doc_title = (title or file.filename)[:255]
    doc_description = (description or "")[:2000] if description else None

    result = await db.execute(
        text(
            "INSERT INTO documents "
            "(user_id, title, description, type, status, file_size, page_count) "
            "VALUES (:uid, :title, :description, :type, 'processing', :file_size, NULL) "
            "RETURNING id"
        ),
        {
            "uid": user_id,
            "title": doc_title,
            "description": doc_description,
            "type": doc_type,
            "file_size": len(contents),
        },
    )
    doc_id = str(result.scalar_one())
    await db.commit()

    if ext == "pdf":
        try:
            from app.tasks.ocr_tasks import process_pdf_task
            process_pdf_task.delay(doc_id, object_name)
            logger.info("Triggered OCR task for document %s (user=%s)", doc_id, user_id)
        except Exception:
            logger.warning("Could not trigger OCR task (worker may be offline)", exc_info=True)

    logger.info(
        "Document %s uploaded: %s (%s, %d bytes)", doc_id, file.filename, doc_type, len(contents),
    )
    return DocumentUploadResponse(id=doc_id, status="processing")


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a document owned by the current user."""
    result = await db.execute(
        text(
            "DELETE FROM documents WHERE id = :id AND user_id = :uid RETURNING id"
        ),
        {"id": document_id, "uid": user_id},
    )
    if not result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found",
        )
    await db.commit()


# ---------------------------------------------------------------------------
# FIX #6: Per-document semantic search — wires to the embedding service
# and pgvector via the same pattern as the main query endpoint, but scoped
# to components belonging to a single parent document.
# ---------------------------------------------------------------------------
@router.post("/{document_id}/search", response_model=list[DocumentSearchResult])
async def search_document(
    document_id: str,
    body: DocumentSearchRequest,
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> list[DocumentSearchResult]:
    """Semantic search within a specific document's extracted chunks.

    Args:
        document_id: UUID of the parent document.
        body: Query text and top_k.
    """
    # 1. Verify document exists + belongs to user
    result = await db.execute(
        text(
            "SELECT id FROM documents WHERE id = :id AND user_id = :uid"
        ),
        {"id": document_id, "uid": user_id},
    )
    if not result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Document not found",
        )

    # 2. Vectorize the query
    from app.services.embedding.bge_m3 import get_query_embedding

    try:
        query_embedding = await get_query_embedding(body.query)
    except Exception as exc:
        logger.error("Embedding service error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding service unavailable",
        )

    # 3. Semantic search on summary_embeddings, scoped to components whose
    #    parent_doc_id matches this document.
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    rows = await db.execute(
        text(
            """
            SELECT se.doc_id, se.summary_text,
                   1 - (se.embedding <=> :emb::vector) AS cosine_score
            FROM summary_embeddings se
            JOIN raw_components rc ON rc.id = se.doc_id
            WHERE rc.parent_doc_id = :parent_id
              AND se.embedding IS NOT NULL
              AND 1 - (se.embedding <=> :emb::vector) > 0.65
            ORDER BY se.embedding <=> :emb::vector ASC
            LIMIT :top_k
            """
        ),
        {"emb": embedding_str, "parent_id": document_id, "top_k": body.top_k},
    )

    results: list[DocumentSearchResult] = []
    for row in rows.fetchall():
        results.append(
            DocumentSearchResult(
                doc_id=str(row[0]),
                chunk_text=row[1] or "",
                relevance_score=float(row[2]),
            )
        )

    logger.info(
        "Document search: doc=%s query=%r → %d results",
        document_id, body.query, len(results),
    )
    return results
