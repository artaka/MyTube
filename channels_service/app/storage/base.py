from abc import ABC, abstractmethod
from typing import BinaryIO
from uuid import UUID


class BaseStorageRepository(ABC):

    @abstractmethod
    async def upload_file(
            self,
            file_data: BinaryIO,
            object_name: str,
            bucket_name: str | None = None,
    ) -> str:
        """
        Upload file to S3 storage
        :param file_data:
        :param object_name:
        :param bucket_name:
        :return:
        """
        pass

    @abstractmethod
    async def delete_file(
            self,
            object_name: str,
            bucket_name: str | None = None,
    ) -> None:
        """
        Delete file from S3 storage
        :param object_name:
        :param bucket_name:
        :return:
        """
        pass

    @abstractmethod
    async def get_public_url(
            self,
            object_name: str,
            bucket_name: str,
    ) -> str:
        """
        Get public url to object from S3 storage
        :param object_name:
        :param bucket_name:
        :return:
        """
        pass