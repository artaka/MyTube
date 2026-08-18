import io
import json
import logging
from typing import BinaryIO
from uuid import UUID

import aioboto3
from botocore.exceptions import ClientError
from app.storage.base import BaseStorageRepository
from app.config import settings


class StorageRepository(BaseStorageRepository):
    def __init__(
            self,
            session: aioboto3.Session,
            endpoint_url: str,
            access_key: str,
            secret_key: str,
            bucket_name: str,
            region_name: str = "us-east-1",
    ):
        self._session = session
        self._endpoint_url = endpoint_url
        self._access_key = access_key
        self._secret_key = secret_key
        self.bucket_name = bucket_name
        self._region_name = region_name
        self._logger: logging.Logger = logging.getLogger(__name__)


    def _get_client(self):
        endpoint = self._endpoint_url
        if not endpoint.startswith("http://") and not endpoint.startswith("https://"):
            endpoint = f"http://{endpoint}"
        return self._session.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=self._access_key,
            aws_secret_access_key=self._secret_key,
            region_name=self._region_name,
        )


    async def upload_file(
            self,
            file_data: bytes | BinaryIO,
            object_name: str,
            bucket_name: str | None = None,
    ):
        target_bucket = bucket_name or self.bucket_name
        file_obj = io.BytesIO(file_data) if isinstance(file_data, bytes) else file_data

        async with self._get_client() as client:
            try:
                await client.upload_fileobj(
                    file_obj,
                    target_bucket,
                    object_name,
                )
                return object_name
            except ClientError as e:
                self._logger.error(f"Failed to upload file: {e}")
                raise Exception(f"Failed to upload file: {e}")

    async def delete_file(
            self,
            object_name: str,
            bucket_name: str | None = None,
    ) -> None:
        target_bucket = bucket_name or self.bucket_name
        async with self._get_client() as client:
            try:
                await client.delete_object(
                    Bucket=target_bucket,
                    Key=object_name,
                )
            except ClientError as e:
                self._logger.error(f"Failed to delete file: {e}")
                raise Exception(f"Failed to delete file: {e}")


    async def get_public_url(
            self,
            object_name: str,
            bucket_name: str | None = None,
    ) -> str:
        target_bucket = bucket_name or self.bucket_name
        endpoint = settings.MINIO_EXTERNAL_ENDPOINT
        if not endpoint.startswith("http://") and not endpoint.startswith("https://"):
            endpoint = f"http://{endpoint}"
        url = f"{endpoint}/{target_bucket}/{object_name}"
        return url


async def init_storage() -> bool:
    session = aioboto3.Session()
    endpoint_url = settings.MINIO_ENDPOINT
    if not endpoint_url.startswith("http://") and not endpoint_url.startswith("https://"):
        endpoint_url = f"http://{endpoint_url}"
    access_key = settings.MINIO_ACCESS_KEY
    secret_key = settings.MINIO_SECRET_KEY
    bucket_name = settings.BUCKET_NAME
    region_name = settings.REGION_NAME

    public_read_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{bucket_name}/*"],
            }
        ],
    }

    async with session.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region_name,
    ) as s3:
        try:
            await s3.head_bucket(Bucket=bucket_name)
            logging.info(f"Bucket {bucket_name} exists")
        except ClientError as e:
            err_code = str(e.response.get("Error", {}).get("Code"))
            if err_code in ("404", "NoSuchBucket", "NotFound"):
                create_params = {"Bucket": bucket_name}
                if region_name != "us-east-1":
                    create_params["CreateBucketConfiguration"] = {
                        "LocationConstraint": region_name
                    }

                await s3.create_bucket(**create_params)
                logging.info(f"Bucket {bucket_name} created")
            else:
                raise e

        try:
            await s3.put_public_access_block(
                Bucket=bucket_name,
                PublicAccessBlockConfiguration={
                    "BlockPublicAcls": False,
                    "IgnorePublicAcls": False,
                    "BlockPublicPolicy": False,
                    "RestrictPublicBuckets": False,
                },
            )
        except ClientError as e:
            logging.warning(f"Public access block update skipped: {e}")

        await s3.put_bucket_policy(
            Bucket=bucket_name,
            Policy=json.dumps(public_read_policy),
        )
        logging.info(f"Public read policy applied to {bucket_name}")

    return True