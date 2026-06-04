"""Ingestion pipeline routes - PDF upload and processing.

FIXES APPLIED:
  - #2C  In-memory OOM: streaming SpooledTemporaryFile instead of full read().
  - #5   Multi-tenant isolation (IDOR): ingestion_batches queries include
          user_id column.  The INSERT stores user_id, list/get filter by it.
"""

from __future__ import annotations

import logging
import tempfile

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_user
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_FILE_SIZE = 50 * 1024 * 1024   # 50 MiB
CHUNK_SIZE = 64 * 1024             # 64 KiB streaming chunks


class IngestionBatchResponse(BaseModel):
    ingestion_batch_id: str
    source_file: str
    status: str


class IngestionStatusResponse(BaseModel):
    id: str
    source_file: str
    status: str
    total_pages: int | None
    processed_pages: int
    error_message: str | None


@router.post("/upload", response_model=IngestionBatchResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> IngestionBatchResponse:
    """Upload a PDF for ingestion into the RAG pipeline."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted",
        )

    # Stream to SpooledTemporaryFile (fix #2C)
    try:
        with tempfile.SpooledTemporaryFile(max_size=MAX_FILE_SIZE) as spool:
            total = 0
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="File exceeds 50MB limit",
                    )
                spool.write(chunk)

            spool.seek(0)
            pdf_bytes = spool.read()

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error reading upload: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process uploaded file",
        )

    from app.services.storage import upload_to_minio

    object_name = await upload_to_minio(file.filename or "upload.pdf", pdf_bytes)

    # FIX #5: include user_id in the ingestion_batches record
    result = await db.execute(
        text(
            "INSERT INTO ingestion_batches (user_id, source_file, status) "
            "VALUES (:uid, :source_file, 'pending') RETURNING id"
        ),
        {"uid": user_id, "source_file": object_name},
    )
    batch_id = str(result.scalar_one())

    try:
        from app.tasks.ocr_tasks import process_pdf_task
        process_pdf_task.delay(batch_id, object_name)
        logger.info("Triggered ingestion task for batch %s (user=%s)", batch_id, user_id)
    except Exception:
        logger.warning("Could not trigger Celery task (worker may be offline)", exc_info=True)

    return IngestionBatchResponse(
        ingestion_batch_id=batch_id,
        source_file=file.filename or "upload.pdf",
        status="pending",
    )


@router.get("/status/{batch_id}", response_model=IngestionStatusResponse)
async def get_ingestion_status(
    batch_id: str,
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> IngestionStatusResponse:
    """Get the status of an ingestion batch (user-scoped)."""
    result = await db.execute(
        text(
            "SELECT id, source_file, status, total_pages, "
            "       processed_pages, error_message "
            "FROM ingestion_batches "
            "WHERE id = :id AND user_id = :uid"
        ),
        {"id": batch_id, "uid": user_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found",
        )

    return IngestionStatusResponse(
        id=str(row[0]),
        source_file=row[1],
        status=row[2],
        total_pages=row[3],
        processed_pages=row[4] or 0,
        error_message=row[5],
    )


@router.get("/batches", response_model=list[IngestionStatusResponse])
async def list_batches(
    user_id: str = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> list[IngestionStatusResponse]:
    """List the current user's ingestion batches, newest first."""
    result = await db.execute(
        text(
            "SELECT id, source_file, status, total_pages, "
            "       processed_pages, error_message "
            "FROM ingestion_batches "
            "WHERE user_id = :uid "
            "ORDER BY created_at DESC LIMIT 100"
        ),
        {"uid": user_id},
    )
    rows = result.fetchall()
    return [
        IngestionStatusResponse(
            id=str(r[0]),
            source_file=r[1],
            status=r[2],
            total_pages=r[3],
            processed_pages=r[4] or 0,
            error_message=r[5],
        )
        for r in rows
    ]
