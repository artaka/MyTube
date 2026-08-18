import logging
from uuid import UUID

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.models import Channel, Subscription
from app.database.db import get_db

class SubscriptionRepository:
    def __init__(
            self,
            db: AsyncSession
    ):
        self._session: AsyncSession = db
        self._logger: logging.Logger = logging.getLogger(__name__)

    async def toggle_subscription(
            self,
            user_id: int,
            channel_id: UUID
    ) -> bool:
        channel_query = select(Channel).where(Channel.id == channel_id)
        channel_res = await self._session.execute(channel_query)
        channel: Channel | None = channel_res.scalar_one_or_none()
        if not channel:
            raise ValueError("Channel not found")

        sub_query = (
            select(Subscription)
            .where(
                Subscription.user_id == user_id,
                Subscription.channel_id == channel_id
            )
        )
        sub_res = await self._session.execute(sub_query)
        subscription: Subscription | None = sub_res.scalar_one_or_none()

        try:
            if subscription:
                await self._session.delete(subscription)
                if channel.subscribers_counter > 0:
                    channel.subscribers_counter -= 1
                await self._session.commit()
                return False
            else:
                new_sub = Subscription(
                    user_id=user_id,
                    channel_id=channel_id
                )
                self._session.add(new_sub)
                channel.subscribers_counter += 1
                await self._session.commit()
                return True
        except Exception as e:
            await self._session.rollback()
            self._logger.error(f"Failed to toggle subscription: {e}")
            raise e

    async def get_user_subscriptions(
            self,
            user_id: int
    ) -> list[Channel]:
        query = (
            select(Channel)
            .join(Subscription, Subscription.channel_id == Channel.id)
            .where(Subscription.user_id == user_id)
            .order_by(Subscription.created_at.desc())
        )
        result = await self._session.execute(query)
        return list(result.scalars().all())

    async def is_subscribed(
            self,
            user_id: int,
            channel_id: UUID
    ) -> bool:
        query = (
            select(Subscription)
            .where(
                Subscription.user_id == user_id,
                Subscription.channel_id == channel_id
            )
        )
        result = await self._session.execute(query)
        return result.scalar_one_or_none() is not None


async def get_subscription_repo(db: AsyncSession = Depends(get_db)) -> SubscriptionRepository:
    return SubscriptionRepository(db)
