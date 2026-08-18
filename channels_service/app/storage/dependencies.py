import aioboto3
from app.config import settings
from app.storage.base import BaseStorageRepository
from app.storage.repository import StorageRepository

s3_session = aioboto3.Session()

def get_storage_repository() -> BaseStorageRepository:
    return StorageRepository(
        session=s3_session,
        endpoint_url=settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        bucket_name=settings.BUCKET_NAME,
        region_name=settings.REGION_NAME,
    )