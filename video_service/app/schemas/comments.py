from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field
from app.schemas.Enums import VideoActivityTypeEnum


class CommentCreateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000, description="Comment Text")


class CommentResponse(BaseModel):
    id: UUID = Field(description="Comment ID")
    author_id: int = Field(description="Author ID")
    video_id: UUID = Field(description="Video ID")
    text: str = Field(description="Comment Text")
    likes_count: int = Field(description="Comment Likes Count")
    dislikes_count: int = Field(description="Comment Dislikes Count")
    created_at: datetime = Field(description="Comment Creation Date")
    viewer_activity: Optional[VideoActivityTypeEnum] = Field(None, description="User Activity Type")
    model_config = {"from_attributes": True}


class CommentListResponse(BaseModel):
    items: list[CommentResponse]
    total: int
    page: int
    size: int