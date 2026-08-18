import logging
from uuid import UUID

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.models import Channel
from app.database.db import get_db

class ChannelRepository:
    def __init__(
            self,
            db: AsyncSession
    ):
        self._session: AsyncSession = db
        self._logger: logging.Logger = logging.getLogger(__name__)

    async def add_channel(
            self,
            user_id: int
    ) -> Channel | None:
        check_channel_query = (
            select(Channel)
            .where(Channel.owner_id == user_id)
        )
        check_channel_result = await self._session.execute(check_channel_query)
        check_channel_result: Channel | None = check_channel_result.scalar_one_or_none()
        if check_channel_result:
            return None

        channel_name = str(user_id)
        new_channel = Channel(
            owner_id=user_id,
            handle=channel_name,
            name=channel_name
        )
        self._session.add(new_channel)
        try:
            await self._session.commit()
        except Exception as e:
            await self._session.rollback()
            self._logger.error(f"Failed to add channel: {e}")
            return None

        await self._session.refresh(new_channel)
        return new_channel


    async def get_channel_by_id(self, channel_id: UUID) -> Channel | None:
        channel_query = (
            select(Channel)
            .where(Channel.id == channel_id)
        )
        channel_result = await self._session.execute(channel_query)
        channel: Channel | None = channel_result.scalar_one_or_none()
        if not channel:
            return None
        return channel


    async def get_channel_by_owner_id(self, user_id: int) -> Channel | None:
        channel_query = (
            select(Channel)
            .where(Channel.owner_id == user_id)
        )
        channel_result = await self._session.execute(channel_query)
        channel: Channel | None = channel_result.scalar_one_or_none()
        if not channel:
            return None
        return channel


    async def get_channel_by_handle(self, handle: str) -> Channel | None:
        channel_query = (
            select(Channel)
            .where(Channel.handle == handle)
        )
        channel_result = await self._session.execute(channel_query)
        channel: Channel | None = channel_result.scalar_one_or_none()
        if not channel:
            return None
        return channel


    async def update_channel(
            self,
            user_id: int,
            new_handle: str | None = None,
            new_name: str | None = None,
            new_description: str | None = None,
            new_country: str | None = None
    ) -> Channel | None:
        check_channel_query = (
            select(Channel)
            .where(
                Channel.owner_id == user_id
            )
        )
        check_channel_result = await self._session.execute(check_channel_query)
        check_channel_result: Channel | None = check_channel_result.scalar_one_or_none()
        if not check_channel_result:
            return None

        to_update = {
            "handle": new_handle,
            "name": new_name,
            "description": new_description,
            "country": new_country
        }

        for field, value in to_update.items():
            if value:
                setattr(check_channel_result, field, value)
        try:
            await self._session.commit()
        except Exception as e:
            await self._session.rollback()
            self._logger.error(f"Failed to update channel: {e}")
        await self._session.refresh(check_channel_result)
        return check_channel_result


async def get_channel_repo(db: AsyncSession = Depends(get_db)) -> ChannelRepository:
    return ChannelRepository(db)