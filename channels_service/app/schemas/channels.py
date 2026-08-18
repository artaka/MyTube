from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, computed_field

from app.config import settings

class ChannelResponse(BaseModel):
    id:UUID = Field(..., description="Channel ID")
    owner_id:int = Field(..., description="Channel owner ID")
    handle:str = Field(..., description="Channel url handle")
    name:str = Field(..., description="Channel name")
    description:str | None = Field(None, description="Channel description")
    videos_counter:int = Field(..., description="Channel video number")
    subscribers_counter:int = Field(..., description="Channel subscribers number")
    views_counter:int = Field(..., description="Channel views on all videos number")
    likes_counter:int = Field(0, description="Channel total likes number")
    country:str = Field(..., description="Channel country")
    created_at:datetime = Field(..., description="Channel created time")
    updated_at:datetime = Field(..., description="Channel updated time")

    @computed_field
    @property
    def avatar_url(self) -> str:
        return f"{settings.MINIO_EXTERNAL_ENDPOINT}/{settings.BUCKET_NAME}/{hex(self.owner_id)}_avatar.webp"

    @computed_field
    @property
    def avatar_small_url(self) -> str:
        return f"{settings.MINIO_EXTERNAL_ENDPOINT}/{settings.BUCKET_NAME}/{hex(self.owner_id)}_avatar_small.webp"

    @computed_field
    @property
    def banner_url(self) -> str:
        return f"{settings.MINIO_EXTERNAL_ENDPOINT}/{settings.BUCKET_NAME}/{hex(self.owner_id)}_banner.webp"

class UpdateChannelRequest(BaseModel):
    handle:str | None = None
    name:str | None = None
    description:str | None = None
    country:str | None = None