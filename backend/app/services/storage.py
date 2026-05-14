"""MinIO object storage service."""

import logging
from io import BytesIO

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_minio_client():
    """Create a MinIO (S3-compatible) client."""
    return boto3.client(
        "s3",
        endpoint_url=f"http{'s' if settings.MINIO_SECURE else ''}://{settings.MINIO_ENDPOINT}",
        aws_access_key_id=settings.MINIO_ACCESS_KEY,
        aws_secret_access_key=settings.MINIO_SECRET_KEY,
        region_name="us-east-1",
    )


def _ensure_bucket(client) -> None:
    """Ensure the default bucket exists."""
    try:
        client.head_bucket(Bucket=settings.MINIO_BUCKET)
    except ClientError:
        client.create_bucket(Bucket=settings.MINIO_BUCKET)
        logger.info(f"Created bucket: {settings.MINIO_BUCKET}")


async def upload_to_minio(filename: str, contents: bytes) -> str:
    """Upload a file to MinIO and return the object name."""
    import uuid

    client = _get_minio_client()
    _ensure_bucket(client)

    # Generate unique object name
    ext = filename.rsplit(".", 1)[-1] if "." in filename else "bin"
    object_name = f"uploads/{uuid.uuid4()}.{ext}"

    client.put_object(
        Bucket=settings.MINIO_BUCKET,
        Key=object_name,
        Body=BytesIO(contents),
        ContentLength=len(contents),
        ContentType="application/pdf" if ext == "pdf" else "application/octet-stream",
    )
    logger.info(f"Uploaded {filename} as {object_name}")
    return object_name


async def download_from_minio(object_name: str) -> bytes:
    """Download a file from MinIO."""
    client = _get_minio_client()
    response = client.get_object(Bucket=settings.MINIO_BUCKET, Key=object_name)
    return response["Body"].read()


async def upload_image_to_minio(image_bytes: bytes, filename: str) -> str:
    """Upload an extracted image to MinIO and return the URL."""
    import uuid

    client = _get_minio_client()
    _ensure_bucket(client)

    ext = filename.rsplit(".", 1)[-1] if "." in filename else "png"
    object_name = f"images/{uuid.uuid4()}.{ext}"

    client.put_object(
        Bucket=settings.MINIO_BUCKET,
        Key=object_name,
        Body=BytesIO(image_bytes),
        ContentLength=len(image_bytes),
        ContentType=f"image/{ext}",
    )

    url = f"http{'s' if settings.MINIO_SECURE else ''}://{settings.MINIO_ENDPOINT}/{settings.MINIO_BUCKET}/{object_name}"
    return url
