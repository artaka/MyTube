from datetime import datetime
from uuid import uuid4, UUID
from sqlalchemy import ForeignKey, func, text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.db import Base
from app.schemas.Enums import VideoStatusEnum, VideoActivityTypeEnum


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        unique=True,
        index=True,
        nullable=False
    )
    status: Mapped[VideoStatusEnum] = mapped_column(default=VideoStatusEnum.PENDING)
    author_id: Mapped[int] = mapped_column(index=True, nullable=False)

    views_count: Mapped[int] = mapped_column(nullable=False, default=0)
    likes_count: Mapped[int] = mapped_column(nullable=False, default=0)
    dislikes_count: Mapped[int] = mapped_column(nullable=False, default=0)
    comments_count: Mapped[int] = mapped_column(nullable=False, default=0)
    shares_count: Mapped[int] = mapped_column(nullable=False, default=0)

    title: Mapped[str] = mapped_column(nullable=False, default="One more video")
    description: Mapped[str] = mapped_column(nullable=True)
    duration_seconds: Mapped[int] = mapped_column(nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    comments: Mapped[list["VideoComments"]] = relationship(
        "VideoComments",
        back_populates="video",
        cascade="all, delete-orphan"
    )
    activities: Mapped[list["VideoActivity"]] = relationship(
        "VideoActivity",
        back_populates="video",
        cascade="all, delete-orphan"
    )
    views: Mapped[list["VideoView"]] = relationship(
        "VideoView",
        back_populates="video",
        cascade="all, delete-orphan"
    )


class VideoComments(Base):
    __tablename__ = "video_comments"

    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        unique=True,
        index=True,
        nullable=False
    )
    author_id: Mapped[int] = mapped_column(index=True, nullable=False)

    video_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("videos.id", ondelete="CASCADE"),
        index=True,
        nullable=False
    )

    text: Mapped[str] = mapped_column(nullable=False)
    likes_count: Mapped[int] = mapped_column(nullable=False, default=0)
    dislikes_count: Mapped[int] = mapped_column(nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    video: Mapped["Video"] = relationship("Video", back_populates="comments")
    activities: Mapped[list["CommentActivity"]] = relationship(
        "CommentActivity",
        back_populates="comment",
        cascade="all, delete-orphan"
    )


class VideoActivity(Base):
    __tablename__ = "video_activities"
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        nullable=False,
        default=uuid4,
        unique=True,
        index=True
    )
    user_id: Mapped[int] = mapped_column(index=True, nullable=False)
    video_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("videos.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    activity_type: Mapped[VideoActivityTypeEnum] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now(), nullable=False)
    video: Mapped["Video"] = relationship("Video", back_populates="activities")
    __table_args__ = (
        UniqueConstraint('user_id', 'video_id', name='uq_user_video_activity'),
    )


class CommentActivity(Base):
    __tablename__ = "comments_activities"
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        nullable=False,
        default=uuid4,
        unique=True,
        index=True
    )
    user_id: Mapped[int] = mapped_column(index=True, nullable=False)
    comment_id: Mapped[UUID] = mapped_column(
        ForeignKey("video_comments.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    activity_type: Mapped[VideoActivityTypeEnum] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now(), nullable=False)
    comment: Mapped["VideoComments"] = relationship("VideoComments", back_populates="activities")
    __table_args__ = (
        UniqueConstraint('user_id', 'comment_id', name='uq_user_comment_activity'),
    )


class VideoView(Base):
    __tablename__ = "video_views"
    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        nullable=False,
        default=uuid4,
        unique=True,
        index=True
    )
    user_id: Mapped[int] = mapped_column(index=True, nullable=False)
    video_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("videos.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    view_end_timecode_seconds: Mapped[int] = mapped_column(nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now(), nullable=False)
    video: Mapped["Video"] = relationship("Video", back_populates="views")
