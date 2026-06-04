"""Celery tasks for OCR extraction and component separation.

FIXES APPLIED:
  - #2A  DB connection leak: uses shared engine.
  - #1A  Small-to-Big retrieval: every component shares parent_doc_id.
  - #1D  Celery broker bloat: raw content written to DB, only UUIDs passed.
  - #1   Event loop RuntimeError: uses `await get_worker_session()`.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def process_pdf_task(self, doc_id: str, object_name: str):
    """Main PDF processing task: download -> OCR -> store components.

    Args:
        doc_id:  UUID of the documents table row (used as parent_doc_id).
        object_name: MinIO object key for the uploaded PDF.
    """
    async def _process() -> None:
        from sqlalchemy import text

        from app.db.worker_engine import get_worker_session
        from app.services.ocr import ocr_chain
        from app.services.storage import download_from_minio

        async with await get_worker_session() as db:
            try:
                pdf_bytes = await download_from_minio(object_name)
                ocr_result = await ocr_chain.extract(pdf_bytes, object_name)

                component_ids: list[str] = []
                for comp in ocr_result.components:
                    comp_id = str(uuid.uuid4())
                    component_ids.append(comp_id)

                    image_url: str | None = None
                    if comp.image_bytes:
                        from app.services.storage import upload_image_to_minio
                        image_url = await upload_image_to_minio(
                            comp.image_bytes,
                            f"page{comp.page_number}_{comp.component_type}.png",
                        )

                    table_json: Any = None
                    if comp.table_structure:
                        import json as _json
                        table_json = _json.dumps(comp.table_structure)

                    await db.execute(
                        text(
                            "INSERT INTO raw_components "
                            "(id, parent_doc_id, component_type, raw_content, "
                            " image_url, table_structure, source_file, source_page) "
                            "VALUES (:id, :parent, :ctype, :content, "
                            " :img_url, :tbl, :src_file, :src_page)"
                        ),
                        {
                            "id": comp_id,
                            "parent": doc_id,
                            "ctype": comp.component_type,
                            "content": comp.content,
                            "img_url": image_url,
                            "tbl": table_json,
                            "src_file": object_name,
                            "src_page": comp.page_number,
                        },
                    )

                await db.commit()
                logger.info(
                    "Stored %d components for document %s (parent=%s)",
                    len(component_ids), doc_id, doc_id,
                )

                description = _build_description(ocr_result)
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

                from app.tasks.summarization_tasks import summarize_component_task
                for comp_id in component_ids:
                    summarize_component_task.delay(comp_id)

                logger.info(
                    "OCR pipeline complete: doc=%s pages=%d components=%d",
                    doc_id, ocr_result.total_pages, len(ocr_result.components),
                )

            except Exception as exc:
                logger.error("OCR task failed for document %s: %s", doc_id, exc)
                await db.execute(
                    text("UPDATE documents SET status = 'error' WHERE id = :id"),
                    {"id": doc_id},
                )
                await db.commit()
                raise

    asyncio.run(_process())


def _build_description(ocr_result: Any) -> str:
    """Build a human-readable markdown description from OCR components."""
    if getattr(ocr_result, "raw_text", None):
        return ocr_result.raw_text

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
