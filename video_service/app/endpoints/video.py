import os
import shutil
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Request, Depends, HTTPException, UploadFile, File, Form
from fastapi.params import Query
from starlette import status
from starlette.responses import Response

from app.database.video_repository import get_video_repository, VideoRepository
from app.schemas.Enums import VideoStatusEnum, VideoActivityTypeEnum
from app.schemas.video import VideoCreateRequest, VideoUpdateRequest, VideoUploadInitResponse, VideoResponse, VideoListResponse, GetTimecodeResponse
from app.helpers.deps import get_optional_current_user, get_current_user
from app.utils.tasks import convert_to_hls_s3

router = APIRouter(
    prefix="/video",
)

@router.post("/upload", response_model=VideoUploadInitResponse, status_code=status.HTTP_201_CREATED)
async def upload_video(
        title: str = Form(..., max_length=256, min_length=1, description="Video Title"),
        description: str | None = Form(None, max_length=5000, description="Video Description"),
        file: UploadFile = File(...),
        repo: VideoRepository = Depends(get_video_repository),
        current_user: int = Depends(get_current_user),
):
    request = VideoCreateRequest(title=title, description=description)
    video = await repo.create_pending_video(
        author_id=current_user,
        title=request.title,
        description=request.description,
    )

    upload_dir = "/app/static/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    temporary_location = os.path.join(upload_dir, f"{video.id}.mp4")

    try:
        with open(temporary_location, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    await repo._session.commit()

    convert_to_hls_s3.delay(temporary_location, str(video.id))

    return VideoUploadInitResponse(video_id=video.id)

@router.get("/storage/{video_id}", response_model=VideoResponse)
async def get_video_by_id(
        video_id: UUID,
        user_id: Optional[int] = Depends(get_optional_current_user),
        repo: VideoRepository = Depends(get_video_repository),
):
    video = await repo.get_video_by_id(video_id)
    if video.status != VideoStatusEnum.READY:
        return video
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if not user_id:
        return video
    inc_res = await repo.increment_views_on_video(video_id=video_id, user_id=user_id, timecode=1)
    await repo._session.refresh(video)
    video_activity = await repo.get_video_activity(video_id=video_id, user_id=user_id)
    return VideoResponse(
        id=video.id,
        status=video.status,
        author_id=video.author_id,
        views_count=video.views_count,
        likes_count=video.likes_count,
        shares_count=video.shares_count,
        dislikes_count=video.dislikes_count,
        title=video.title,
        description=video.description,
        duration_seconds=video.duration_seconds,
        comments_count=video.comments_count,
        created_at=video.created_at,
        updated_at=video.updated_at,
        viewer_activity=video_activity
    )


@router.get("/feed", response_model=VideoListResponse)
async def get_feed(
        page:int = Query(1, ge=1, description="Page number", annotation=int),
        size: int = Query(10, ge=1, description="Page size", annotation=int),
        repo: VideoRepository = Depends(get_video_repository)):
    feed, total = await repo.get_video_list(page=page, size=size)
    return VideoListResponse(
        items=feed,
        total=total,
        page=page,
        size=size,
    )

@router.delete("/storage/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video(
        video_id: UUID,
        user_id: Optional[int] = Depends(get_current_user),
        repo: VideoRepository = Depends(get_video_repository)
):
    result = await repo.delete_video(video_id=video_id, user_id=user_id)
    if result:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    return Response(status_code=status.HTTP_403_FORBIDDEN)

@router.post("/{video_id}", response_model=VideoResponse)
async def set_video_activity(
        video_id: UUID,
        activity_type: VideoActivityTypeEnum = Query(..., description="Activity type (\"like\", \"dislike\", \"share\")"),
        user_id: int = Depends(get_current_user),
        repo: VideoRepository = Depends(get_video_repository)
):
    activity_result = await repo.set_video_activity(
        video_id=video_id,
        user_id=user_id,
        activity_type=activity_type
    )


    if activity_result is None and activity_type != VideoActivityTypeEnum.LIKE and activity_type != VideoActivityTypeEnum.DISLIKE:
        video = await repo.get_video_by_id(video_id)
        if not video or video.status != VideoStatusEnum.READY:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Video not found or not ready"
            )

    video = await repo.get_video_by_id(video_id)
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found"
        )

    viewer_activity = await repo.get_video_activity(video_id=video_id, user_id=user_id)

    return VideoResponse(
        id=video.id,
        status=video.status,
        author_id=video.author_id,
        views_count=video.views_count,
        likes_count=video.likes_count,
        shares_count=video.shares_count,
        dislikes_count=video.dislikes_count,
        title=video.title,
        description=video.description,
        duration_seconds=video.duration_seconds,
        comments_count=video.comments_count,
        created_at=video.created_at,
        updated_at=video.updated_at,
        viewer_activity=viewer_activity
    )

@router.post("/{video_id}/timecode", status_code=202)
async def set_video_timecode(
        video_id: UUID,
        timecode_sec: int = Query(1, ge=1, description="Timecode seconds", annotation=int),
        user_id: int = Depends(get_current_user),
        repo: VideoRepository = Depends(get_video_repository)
):
    video = await repo.get_video_by_id(video_id)
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video not found")
    video_view_res = await repo.set_video_view_timecode_seconds(
        video_id=video_id,
        user_id=user_id,
        timecode_seconds=timecode_sec
    )
    if video_view_res is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="View not found")
    return Response(status_code=202)

@router.get("/{video_id}/timecode", response_model=GetTimecodeResponse)
async def get_video_timecode(
        video_id: UUID,
        user_id: Optional[int] = Depends(get_optional_current_user),
        repo: VideoRepository = Depends(get_video_repository)
):
    if not user_id:
        return 0
    timecode = await repo.get_video_view_timecode_seconds(video_id=video_id, user_id=user_id)
    if not timecode:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="View not found")
    return GetTimecodeResponse(timecode=timecode)