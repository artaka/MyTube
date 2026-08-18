from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from app.database.models import Channel
from app.schemas.channels import ChannelResponse, UpdateChannelRequest
from app.database.channels_repository import ChannelRepository, get_channel_repo
from app.helpers.deps import get_current_user


channels_router = APIRouter(prefix="/channels", tags=["channels"])

@channels_router.get("/{id_or_handle}", response_model=ChannelResponse)
async def get_channel_by_id_or_handle(
        id_or_handle: UUID | str,
        repo: ChannelRepository = Depends(get_channel_repo)
):
    channel: Channel | None = None
    if isinstance(id_or_handle, UUID):
        channel = await repo.get_channel_by_id(id_or_handle)
    if not channel:
        channel = await repo.get_channel_by_handle(str(id_or_handle))

    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel


@channels_router.get("/user/{user_id}", response_model=ChannelResponse)
async def get_channel_by_owner_id(
        user_id: int,
        repo: ChannelRepository = Depends(get_channel_repo)
):
    channel: Channel | None = await repo.get_channel_by_owner_id(user_id)

    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel


@channels_router.post("/", response_model=ChannelResponse)
async def create_channel(
        user_id: int = Depends(get_current_user),
        repo: ChannelRepository = Depends(get_channel_repo)
):
    try:
        new_channel = await repo.add_channel(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    if not new_channel:
        raise HTTPException(status_code=409, detail="Channel is already exist")

    return new_channel

@channels_router.patch("/", response_model=ChannelResponse)
async def update_channel(
        request: UpdateChannelRequest,
        repo: ChannelRepository = Depends(get_channel_repo),
        user_id: int = Depends(get_current_user),
):
    try:
        channel: Channel | None = await repo.update_channel(
            user_id,
            request.handle,
            request.name,
            request.description,
            request.country,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel