from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl, computed_field
from app.config import settings
from app.schemas.Enums import VideoStatusEnum, VideoActivityTypeEnum


class VideoCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=256, description="Video Title")
    description: Optional[str] = Field(None, max_length=5000, description="Video Description")


class VideoUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=256, description="New Video Title")
    description: Optional[str] = Field(None, max_length=5000, description="New Video Description")


class VideoViewSubmit(BaseModel):
    view_end_timecode_seconds: int = Field(
        ..., ge=0, description="Timecode where user stop video in seconds"
    )


class VideoResponse(BaseModel):
    id: UUID = Field(..., description="Video ID (UUID)")
    status: VideoStatusEnum = Field(..., description="Video Upload Status")
    author_id: int = Field(..., description="Author ID")
    views_count: int = Field(..., description="Number of views")
    likes_count: int = Field(..., description="Number of likes")
    shares_count: int = Field(..., description="Number of shared videos")
    dislikes_count: int = Field(..., description="Number of dislikes")
    title: str = Field(..., description="Video Title")
    description: Optional[str] = Field(None, description="Video Description")
    duration_seconds: int = Field(..., description="Video Duration in seconds")
    comments_count: int = Field(..., description="Number of comments")
    created_at: datetime = Field(..., description="Video Creation Date")
    updated_at: datetime = Field(..., description="Video Update Date")
    viewer_activity: Optional[VideoActivityTypeEnum] = Field(
        None, description="Activity current user on this video"
    )

    @computed_field(description="Master video URL")
    @property
    def master_video_url(self) -> Optional[str]:
        if self.status != VideoStatusEnum.READY:
            return None
        base_url = settings.MINIO_EXTERNAL_ENDPOINT
        return f"http://{base_url}/videos/{self.id}/master.m3u8"

    @computed_field(description="Video thumbnail URL")
    @property
    def thumbnail_url(self) -> Optional[str]:
        if self.status != VideoStatusEnum.READY:
            return None
        base_url = settings.MINIO_EXTERNAL_ENDPOINT
        return f"http://{base_url}/videos/{self.id}/thumbnail.jpg"

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "c1a9f8b4-5555-4444-8888-9999abcdef12",
                "status": "ready",
                "author_id": 42,
                "views_count": 1420,
                "likes_count": 120,
                "dislikes_count": 2,
                "shares_count": 15,
                "title": "Как приготовить идеальную пасту",
                "description": "Пошаговый туториал с секретами от шефа.",
                "duration": 342,
                "comment_count": 45,
                "created_at": "2026-07-19T12:00:00Z",
                "updated_at": "2026-07-19T12:05:23Z",
                "viewer_activity": "LIKE",
                "master_video_url": "http://localhost:9000/videos-bucket/c1a9f8b4.../master.m3u8",
                "thumbnail_url": "http://localhost:9000/videos-bucket/c1a9f8b4.../thumbnail.jpg"
            }
        }
    }


class VideoListResponse(BaseModel):
    items: list[VideoResponse]
    total: int
    page: int
    size: int


class VideoUploadInitResponse(BaseModel):
    video_id: UUID = Field(..., description="Video ID for check status")

class GetTimecodeResponse(BaseModel):
    timecode: int = Field(..., description="Timecode where user stop video in seconds")