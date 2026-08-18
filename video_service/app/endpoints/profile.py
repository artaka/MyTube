from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.params import Query
from starlette import status
from starlette.responses import Response

from app.database.video_repository import get_video_repository, VideoRepository
from app.schemas.Enums import VideoStatusEnum, VideoActivityTypeEnum
from app.schemas.video import VideoCreateRequest, VideoUpdateRequest, VideoUploadInitResponse, VideoResponse, VideoListResponse, GetTimecodeResponse
from app.helpers.deps import get_optional_current_user, get_current_user

profile_router = APIRouter(prefix="/profile")

@profile_router.get("/{user_id}/videos", response_model=VideoListResponse)
async def get_user_videos(
        user_id: int,
        page:int = Query(0, ge=0, description="Page number"),
        size:int = Query(100, ge=1, description="Page size"),
        repo: VideoRepository = Depends(get_video_repository),
):
    videos, total = await repo.get_all_video_by_user_id(user_id, page, size)
    return VideoListResponse(
        items=videos,
        total=total,
        page=page,
        size=size,
    )