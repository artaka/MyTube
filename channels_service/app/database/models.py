from datetime import datetime
from uuid import uuid4, UUID
from sqlalchemy import BigInteger, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.db import Base

class Channel(Base):
    __tablename__ = 'channels'

    id:Mapped[UUID] = mapped_column(PG_UUID, primary_key=True, default=uuid4, index=True)
    owner_id:Mapped[int] = mapped_column(nullable=False, unique=True, index=True)

    handle:Mapped[str] = mapped_column(nullable=False, unique=True, index=True)
    name:Mapped[str] = mapped_column(nullable=False, unique=True, index=True)
    description:Mapped[str] = mapped_column(nullable=True)

    videos_counter:Mapped[int] = mapped_column(nullable=False, default=0)
    subscribers_counter:Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    views_counter:Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    likes_counter:Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)

    country:Mapped[str] = mapped_column(nullable=False, default="Unknown")

    created_at:Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow, server_default=func.now())
    updated_at:Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow, server_default=func.now(), onupdate=datetime.utcnow)


class Subscription(Base):
    __tablename__ = 'subscriptions'
    __table_args__ = (
        UniqueConstraint('user_id', 'channel_id', name='uq_user_channel_subscription'),
    )

    id:Mapped[UUID] = mapped_column(PG_UUID, primary_key=True, default=uuid4, index=True)
    user_id:Mapped[int] = mapped_column(nullable=False, index=True)
    channel_id:Mapped[UUID] = mapped_column(PG_UUID, ForeignKey("channels.id", ondelete="CASCADE"), nullable=False, index=True)

    created_at:Mapped[datetime] = mapped_column(nullable=False, default=datetime.utcnow, server_default=func.now())

    channel:Mapped[Channel] = relationship("Channel")