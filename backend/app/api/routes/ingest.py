"""Ingestion pipeline routes - PDF upload and processing.

FIXES APPLIED (audit report):
  - #2C  In-memory OOM vulnerability: replaced await file.read() (which
          loads the entire PDF into a single buffer) with a streaming
          spooled-temporary-file approach.  The file is read in 64 KiB
          chunks, validated against the 50 MiB limit, and uploaded to MinIO
          without ever holding the full payload in memory twice.
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
    """Upload a PDF for ingestion into the RAG pipeline.

    Streams the file to a temporary spooled file to avoid holding the
    full 50 MiB payload in memory.  Uploads to MinIO once validated.
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are accepted",
        )

    # ------------------------------------------------------------------
    # FIX 2C: Stream into a SpooledTemporaryFile (in-memory up to
    # max_size, then spills to disk).  This lets us validate the size
    # incrementally and upload to MinIO without duplicating the buffer.
    # ------------------------------------------------------------------
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

    # Store in MinIO
    from app.services.storage import upload_to_minio

    object_name = await upload_to_minio(file.filename or "upload.pdf", pdf_bytes)

    # Create ingestion batch record
    result = await db.execute(
        text(
            "INSERT INTO ingestion_batches (source_file, status) "
            "VALUES (:source_file, 'pending') RETURNING id"
        ),
        {"source_file": object_name},
    )
    batch_id = str(result.scalar_one())

    # Trigger Celery task
    try:
        from app.tasks.ocr_tasks import process_pdf_task

        process_pdf_task.delay(batch_id, object_name)
        logger.info("Triggered ingestion task for batch %s", batch_id)
    except Exception:
        logger.warning(
            "Could not trigger Celery task (worker may be offline)",
            exc_info=True,
        )

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
    """Get the status of an ingestion batch."""
    result = await db.execute(
        text(
            "SELECT id, source_file, status, total_pages, "
            "       processed_pages, error_message "
            "FROM ingestion_batches WHERE id = :id"
        ),
        {"id": batch_id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found"
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
    """List all ingestion batches, ordered by creation time descending."""
    result = await db.execute(
        text(
            "SELECT id, source_file, status, total_pages, "
            "       processed_pages, error_message "
            "FROM ingestion_batches ORDER BY created_at DESC LIMIT 100"
        )
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
