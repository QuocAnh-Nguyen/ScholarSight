"""Celery tasks for OCR extraction and component separation."""

import logging

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def process_pdf_task(self, doc_id: str, object_name: str):
    """Main PDF processing task: download -> OCR -> update documents table.

    Called from the /api/documents/upload endpoint after the documents row
    is created with status='processing'.  This task downloads the PDF from
    MinIO, runs the OCR fallback chain, and writes the extracted text back
    into documents.description so it is visible in the frontend Content tab.

    Args:
        doc_id: UUID of the documents table row to update.
        object_name: MinIO object key for the uploaded PDF.
    """
    import asyncio

    async def _process():
        from sqlalchemy import text
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

        from app.core.config import settings
        from app.services.ocr import ocr_chain
        from app.services.storage import download_from_minio

        engine = create_async_engine(settings.DATABASE_URL)
        async_session = async_sessionmaker(engine)

        async with async_session() as db:
            try:
                # Download PDF from MinIO
                pdf_bytes = await download_from_minio(object_name)

                # Run OCR
                ocr_result = await ocr_chain.extract(pdf_bytes, object_name)

                # Build a markdown description from extracted components.
                # Prefer raw_text if the OCR service provides it; otherwise
                # concatenate component content grouped by page.
                description = _build_description(ocr_result)

                # Update the documents row: set status=ready, page count, and
                # the extracted text as the description.
                await db.execute(
                    text(
                        "UPDATE documents "
                        "SET status     = 'ready', "
                        "    description = :description, "
                        "    page_count  = :page_count "
                        "WHERE id = :id"
                    ),
                    {
                        "id": doc_id,
                        "description": description[:2000],
                        "page_count": ocr_result.total_pages,
                    },
                )
                await db.commit()

                logger.info(
                    "OCR task completed for document %s: %d pages, %d components",
                    doc_id,
                    ocr_result.total_pages,
                    len(ocr_result.components),
                )

            except Exception as e:
                logger.error("OCR task failed for document %s: %s", doc_id, e)
                await db.execute(
                    text(
                        "UPDATE documents SET status = 'error' WHERE id = :id"
                    ),
                    {"id": doc_id},
                )
                await db.commit()
                raise

    asyncio.run(_process())


def _build_description(ocr_result) -> str:
    """Build a human-readable markdown description from OCR components.

    Uses the raw_text field if the OCR service populated it (fast path),
    otherwise groups extracted component content by page number.
    """
    from app.services.ocr.base import OCRResult

    # Fast path: some OCR services provide a single concatenated raw_text
    if hasattr(ocr_result, "raw_text") and ocr_result.raw_text:
        return ocr_result.raw_text

    # Fallback: group components by page and concatenate their text
    pages: dict[int, list[str]] = {}
    for comp in ocr_result.components:
        if comp.content and comp.content.strip():
            pages.setdefault(comp.page_number, []).append(comp.content.strip())

    if not pages:
        return ""

    lines: list[str] = []
    for page_num in sorted(pages):
        page_text = "\n\n".join(pages[page_num])
        if ocr_result.total_pages > 1:
            lines.append(f"## Page {page_num}\n\n{page_text}")
        else:
            lines.append(page_text)

    return "\n\n".join(lines)