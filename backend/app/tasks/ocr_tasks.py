"""Celery tasks for OCR extraction and component separation."""

import logging
import uuid

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def process_pdf_task(self, batch_id: str, object_name: str):
    """Main PDF processing task: download -> OCR -> component separation -> chain to summarization.

    Args:
        batch_id: UUID of the ingestion_batches record.
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
            # Update status to processing
            await db.execute(
                text("UPDATE ingestion_batches SET status = 'processing', updated_at = now() WHERE id = :id"),
                {"id": batch_id},
            )
            await db.commit()

            try:
                # Download PDF from MinIO
                pdf_bytes = await download_from_minio(object_name)

                # Run OCR
                ocr_result = await ocr_chain.extract(pdf_bytes, object_name)

                # Update page count
                await db.execute(
                    text("UPDATE ingestion_batches SET total_pages = :pages WHERE id = :id"),
                    {"pages": ocr_result.total_pages, "id": batch_id},
                )
                await db.commit()

                # Store each component as raw
                for component in ocr_result.components:
                    doc_id = await _store_raw_component(
                        db, batch_id, object_name, ocr_result.ocr_source, component
                    )
                    # Chain to summarization task
                    from app.tasks.summarization_tasks import summarize_component_task
                    summarize_component_task.delay(doc_id, component.component_type, component.content)

                # Mark batch completed
                await db.execute(
                    text(
                        "UPDATE ingestion_batches SET status = 'completed', "
                        "processed_pages = :pages, updated_at = now() WHERE id = :id"
                    ),
                    {"pages": ocr_result.total_pages, "id": batch_id},
                )
                await db.commit()

                logger.info(f"Ingestion batch {batch_id} completed: {len(ocr_result.components)} components")

            except Exception as e:
                logger.error(f"Ingestion batch {batch_id} failed: {e}")
                await db.execute(
                    text(
                        "UPDATE ingestion_batches SET status = 'failed', error_message = :err, "
                        "updated_at = now() WHERE id = :id"
                    ),
                    {"err": str(e)[:1000], "id": batch_id},
                )
                await db.commit()
                raise

    asyncio.run(_process())


async def _store_raw_component(db, batch_id: str, source_file: str, ocr_source: str, component) -> str:
    """Store a single OCR component in raw_components and return its doc_id."""
    import json
    from sqlalchemy import text

    json_table = None
    if component.table_structure:
        json_table = json.dumps(component.table_structure)

    # Handle image upload to MinIO
    image_url = None
    if component.image_bytes:
        from app.services.storage import upload_image_to_minio
        image_url = await upload_image_to_minio(
            component.image_bytes,
            f"page_{component.page_number}.png"
        )

    doc_id = str(uuid.uuid4())

    await db.execute(
        text(
            "INSERT INTO raw_components "
            "(id, doc_id, component_type, raw_content, image_url, table_structure, "
            "ocr_source, source_file, source_page, ingestion_batch_id) "
            "VALUES (:id, :doc_id, :ctype, :content, :img_url, :tbl, :ocr, :src, :page, :batch)"
        ),
        {
            "id": str(uuid.uuid4()),
            "doc_id": doc_id,
            "ctype": component.component_type,
            "content": component.content,
            "img_url": image_url,
            "tbl": json_table,
            "ocr": ocr_source,
            "src": source_file,
            "page": component.page_number,
            "batch": batch_id,
        },
    )

    return doc_id