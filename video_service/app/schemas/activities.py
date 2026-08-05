from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field
from app.schemas.Enums import VideoActivityTypeEnum


class VideoActivityActionRequest(BaseModel):
    video_id: UUID = Field(..., description="Video ID")
    activity_type: VideoActivityTypeEnum = Field(..., description="Video Activity Type")


class CommentActivityActionRequest(BaseModel):
    comment_id: UUID = Field(description="Video ID")
    activity_type: VideoActivityTypeEnum = Field(description="Comment Activity Type")


class VideoActivityResponse(BaseModel):
    video_id: UUID = Field(description="Video ID")
    user_id: int = Field(description="User ID")
    activity_type: VideoActivityTypeEnum = Field(description="Video Activity Type")
    updated_at: datetime = Field(description="Video Updated Time")
    likes_count: int = Field(description="Video Likes Count")
    dislikes_count: int = Field(description="Video Dislikes Count")
    shares_count: int = Field(description="Video Shares Count")
    user_activity: Optional[VideoActivityTypeEnum] = Field(None, description="Video Activity Type")


class CommentActivityResponse(BaseModel):
    comment_id: UUID = Field(description="Comment ID")
    user_id: UUID = Field(description="User ID")
    activity_type: VideoActivityTypeEnum = Field(description="Comment Activity Type")
    updated_at: datetime = Field(description="Comment Updated Time")
    likes_count: int = Field(description="Comment Likes Count")
    dislikes_count: int = Field(description="Comment Dislikes Count")
    user_activity: Optional[VideoActivityTypeEnum] = Field(None, description="Comment Activity Type")