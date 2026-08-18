from uuid import UUID

import io
import asyncio
from starlette import status
from typing import Annotated
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query

from app.database.models import Channel
from app.schemas.channels import ChannelResponse, UpdateChannelRequest
from app.database.channels_repository import ChannelRepository, get_channel_repo
from app.helpers.deps import get_current_user
from app.schemas.storage import PhotoResponse
from app.storage.dependencies import get_storage_repository
from app.storage.repository import StorageRepository
from app.config import settings

storage_router = APIRouter(
    prefix="/storage",
    tags=["storage"]
)

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_PIL_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def process_image_sync(raw_bytes: bytes, target_size: tuple = (512, 512)) -> bytes:
    try:
        with Image.open(io.BytesIO(raw_bytes)) as img:
            if img.format not in ALLOWED_PIL_FORMATS:
                raise ValueError("Unsupported image format")

            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                img = img.convert("RGBA")
            else:
                img = img.convert("RGB")

            processed_img = ImageOps.fit(
                img,
                target_size,
                method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.5)
            )

            output_buffer = io.BytesIO()
            processed_img.save(output_buffer, format="WEBP", quality=85, method=4)
            return output_buffer.getvalue()

    except UnidentifiedImageError:
        raise ValueError("Bad image file")


@storage_router.put("/channels/photo")
async def upload_and_process_image(
    file: UploadFile = File(...),
    file_type: str = Query(default="avatar", description="\"avatar\"/\"banner\" ONLY"),
    repo: StorageRepository = Depends(get_storage_repository),
    user_id: int = Depends(get_current_user)
):
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Allowed only JPEG, PNG, WEBP formats."
        )

    raw_bytes = await file.read()

    if len(raw_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size must be less than {MAX_FILE_SIZE/1000/1000} MB"
        )

    if file_type.lower() not in ("avatar", "banner"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="file_type must be either 'avatar' or 'banner'"
        )

    try:
        if file_type.lower() == "avatar":
            target_size = (512, 512)
            target_size_small = (32, 32)
            webp_bytes = await asyncio.to_thread(process_image_sync, raw_bytes, target_size)
            webp_bytes_small = await asyncio.to_thread(process_image_sync, raw_bytes, target_size_small)
        elif file_type.lower() == "banner":
            target_size = (2560, 423)
            webp_bytes = await asyncio.to_thread(process_image_sync, raw_bytes, target_size)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    try:
        if file_type.lower() == "avatar":
            file_name = f"{hex(user_id)}_avatar.webp"
            file_name_small = f"{hex(user_id)}_avatar_small.webp"
            result = await repo.upload_file(webp_bytes, file_name, settings.BUCKET_NAME)
            result_small = await repo.upload_file(webp_bytes_small, file_name_small, settings.BUCKET_NAME)
        elif file_type.lower() == "banner":
            file_name = f"{hex(user_id)}_banner.webp"
            result = await repo.upload_file(webp_bytes, file_name, settings.BUCKET_NAME)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"status": "ok"}



@storage_router.get("/{channel_id}", response_model=PhotoResponse)
async def get_photo(
        channel_id: UUID,
        photo_type: str = Query(default="avatar", description="\"avatar\"/\"avatar_small\"/\"banner\""),
        channel_repo: ChannelRepository = Depends(get_channel_repo),
        storage_repo: StorageRepository = Depends(get_storage_repository),
):
    if photo_type.lower() not in ("avatar", "avatar_small", "banner"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="photo_type must be 'avatar', 'avatar_small', or 'banner'"
        )

    channel = await channel_repo.get_channel_by_id(channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    file_name = f"{hex(channel.owner_id)}_{photo_type.lower()}.webp"
    url = await storage_repo.get_public_url(file_name, settings.BUCKET_NAME)
    return PhotoResponse(url=url, type=photo_type)