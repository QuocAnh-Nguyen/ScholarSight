"""MinIO object storage service.

FIXES APPLIED:
  - #2  Sync blocking in async context: all boto3 calls are now wrapped in
         asyncio.to_thread / loop.run_in_executor so the FastAPI event loop
         is never blocked by 50 MiB S3 transfers.
"""

from __future__ import annotations

import asyncio
import logging
from functools import partial
from io import BytesIO

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_minio_client():
    """Create a MinIO (S3-compatible) client (synchronous)."""
    return boto3.client(
        "s3",
        endpoint_url=(
            f"http{'s' if settings.MINIO_SECURE else ''}://{settings.MINIO_ENDPOINT}"
        ),
        aws_access_key_id=settings.MINIO_ACCESS_KEY,
        aws_secret_access_key=settings.MINIO_SECRET_KEY,
        region_name="us-east-1",
    )


def _ensure_bucket_sync(client) -> None:
    """Ensure the default bucket exists (synchronous)."""
    try:
        client.head_bucket(Bucket=settings.MINIO_BUCKET)
    except ClientError:
        client.create_bucket(Bucket=settings.MINIO_BUCKET)
        logger.info("Created bucket: %s", settings.MINIO_BUCKET)


def _put_object_sync(object_name: str, contents: bytes, content_type: str) -> str:
    """Upload to MinIO synchronously; returns the object key."""
    client = _get_minio_client()
    _ensure_bucket_sync(client)

    client.put_object(
        Bucket=settings.MINIO_BUCKET,
        Key=object_name,
        Body=BytesIO(contents),
        ContentLength=len(contents),
        ContentType=content_type,
    )
    return object_name


def _get_object_sync(object_name: str) -> bytes:
    """Download from MinIO synchronously."""
    client = _get_minio_client()
    response = client.get_object(Bucket=settings.MINIO_BUCKET, Key=object_name)
    return response["Body"].read()


async def upload_to_minio(filename: str, contents: bytes) -> str:
    """Upload a file to MinIO and return the object name (async-safe)."""
    import uuid

    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    object_name = f"uploads/{uuid.uuid4()}.{ext}"
    content_type = "application/pdf" if ext == "pdf" else "application/octet-stream"

    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None,
        partial(_put_object_sync, object_name, contents, content_type),
    )
    logger.info("Uploaded %s as %s", filename, object_name)
    return result


async def download_from_minio(object_name: str) -> bytes:
    """Download a file from MinIO (async-safe)."""
    loop = asyncio.get_running_loop()
    data = await loop.run_in_executor(None, _get_object_sync, object_name)
    return data


async def upload_image_to_minio(image_bytes: bytes, filename: str) -> str:
    """Upload an extracted image to MinIO and return the URL (async-safe)."""
    import uuid

    ext = filename.rsplit(".", 1)[-1] if "." in filename else "png"
    object_name = f"images/{uuid.uuid4()}.{ext}"
    content_type = f"image/{ext}"

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(
        None,
        partial(_put_object_sync, object_name, image_bytes, content_type),
    )

    url = (
        f"http{'s' if settings.MINIO_SECURE else ''}://"
        f"{settings.MINIO_ENDPOINT}/{settings.MINIO_BUCKET}/{object_name}"
    )
    return url
