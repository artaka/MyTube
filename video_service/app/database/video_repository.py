from typing import Optional, Sequence, Literal
from uuid import UUID

from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database.db import get_db
from app.database.models import Video, VideoView, VideoActivity
from app.schemas.Enums import VideoStatusEnum, VideoActivityTypeEnum
from app.helpers.rabbitmq_publisher import publish_channel_metric_event


class VideoRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_video_by_id(self, video_id: UUID) -> Optional[Video]:
        query = select(Video).where(Video.id == video_id)
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def get_video_list(self, page: int, size: int) -> tuple[Sequence[Video], int]:
        offset = (page - 1) * size
        query = (
            select(Video)
            .where(Video.status == VideoStatusEnum.READY)
            .order_by(Video.created_at.desc())
            .offset(offset)
            .limit(size)
        )
        result = await self._session.execute(query)

        count_query = (
            select(func.count())
            .select_from(Video)
            .where(Video.status == VideoStatusEnum.READY)
        )
        total_result = await self._session.execute(count_query)
        total = total_result.scalar_one()
        return result.scalars().all(), total

    async def create_pending_video(self, author_id: int, title: str, description: Optional[str]) -> Video:
        video = Video(
            author_id=author_id,
            title=title,
            description=description,
            status=VideoStatusEnum.PENDING
        )
        self._session.add(video)
        await self._session.flush()
        return video

    async def increment_views_on_video(self, video_id: UUID, user_id: int, timecode: int) -> bool:
        query = (
            select(Video)
            .where(Video.id == video_id)
            .where(Video.status == VideoStatusEnum.READY)
        )
        result = await self._session.execute(query)
        result: Video = result.scalar_one_or_none()
        if not result:
            raise Exception(f"Video {video_id} does not exist")
        result.views_count += 1
        view_query = (
            select(VideoView)
            .where(
                VideoView.video_id == video_id,
                VideoView.user_id == user_id,
            )
        )
        view_res = await self._session.execute(view_query)
        view_res: VideoView = view_res.scalar_one_or_none()
        if not view_res:
            new_view = VideoView(
                video_id = video_id,
                user_id = user_id,
                view_end_timecode_seconds = timecode,
            )
            self._session.add(new_view)
            await self._session.flush()
            await self._session.refresh(new_view)
        await self._session.commit()
        await publish_channel_metric_event(owner_id=result.author_id, metric="views", delta=1)
        return True

    async def set_video_activity(
            self,
            video_id: UUID,
            user_id: int,
            activity_type: VideoActivityTypeEnum
    ) -> Optional[Literal[VideoActivityTypeEnum.LIKE, VideoActivityTypeEnum.DISLIKE, VideoActivityTypeEnum.SHARE]]:
        query = (
            select(Video)
            .where(Video.id == video_id)
            .where(Video.status == VideoStatusEnum.READY)
        )
        video = await self._session.execute(query)
        video: Video = video.scalar_one_or_none()
        if not video:
            return None

        old_likes = video.likes_count

        if activity_type == VideoActivityTypeEnum.SHARE:
            video.shares_count += 1
            share_activity = VideoActivity(
                video_id = video_id,
                user_id = user_id,
                activity_type = VideoActivityTypeEnum.SHARE,
            )
            self._session.add(share_activity)
            await self._session.commit()
            return VideoActivityTypeEnum.SHARE

        activity_query = (
            select(VideoActivity)
            .where(
                VideoActivity.video_id == video_id,
                VideoActivity.user_id == user_id,
                VideoActivity.activity_type.in_([VideoActivityTypeEnum.LIKE, VideoActivityTypeEnum.DISLIKE]),
            )
        )
        activity_results = await self._session.execute(activity_query)
        existing_activities: VideoActivity = activity_results.scalar_one_or_none()
        final_status = activity_type

        if existing_activities:
            if existing_activities.activity_type == activity_type:
                if activity_type == VideoActivityTypeEnum.LIKE:
                    video.likes_count = max(video.likes_count - 1, 0)
                elif activity_type == VideoActivityTypeEnum.DISLIKE:
                    video.dislikes_count = max(video.dislikes_count - 1, 0)
                await self._session.delete(existing_activities)
                final_status = None

            else:
                if existing_activities.activity_type == VideoActivityTypeEnum.LIKE:
                    video.likes_count = max(video.likes_count - 1, 0)
                    video.dislikes_count += 1
                elif existing_activities.activity_type == VideoActivityTypeEnum.DISLIKE:
                    video.dislikes_count = max(video.dislikes_count - 1, 0)
                    video.likes_count += 1
                existing_activities.activity_type = activity_type

        else:
            new_activity = VideoActivity(
                user_id = user_id,
                video_id = video_id,
                activity_type = VideoActivityTypeEnum(activity_type),
            )
            self._session.add(new_activity)
            match activity_type:
                case VideoActivityTypeEnum.LIKE:
                    video.likes_count += 1
                case VideoActivityTypeEnum.DISLIKE:
                    video.dislikes_count += 1

        await self._session.commit()
        likes_delta = video.likes_count - old_likes
        if likes_delta != 0:
            await publish_channel_metric_event(owner_id=video.author_id, metric="likes", delta=likes_delta)
        return final_status

    async def get_video_activity(self, video_id: UUID, user_id: int) -> Optional[VideoActivityTypeEnum]:
        query = (
            select(VideoActivity)
            .where(
                VideoActivity.video_id == video_id,
                VideoActivity.user_id == user_id,
                VideoActivity.activity_type != VideoActivityTypeEnum.SHARE,
            )
        )
        result = await self._session.execute(query)
        result: VideoActivity = result.scalar_one_or_none()
        if not result:
            return None
        return VideoActivityTypeEnum(result.activity_type)

    async def delete_video(self, video_id: UUID, user_id: int) -> bool:
        query = (
            select(Video)
            .where(
                Video.id == video_id,
                Video.author_id == user_id
            )
        )
        result = await self._session.execute(query)
        result: Video = result.scalar_one_or_none()

        if not result:
            return False

        await self._session.delete(result)
        await self._session.commit()
        await publish_channel_metric_event(owner_id=result.author_id, metric="videos", delta=-1)
        return True

    async def get_video_view_timecode_seconds(self, video_id: UUID, user_id: int) -> Optional[int]:
        query = (
            select(VideoView)
            .where(
                VideoView.video_id == video_id,
                VideoView.user_id == user_id,
            )
        )
        result = await self._session.execute(query)
        result: VideoView = result.scalar_one_or_none()
        if not result:
            return None
        return int(result.view_end_timecode_seconds)

    async def set_video_view_timecode_seconds(self, video_id: UUID, user_id: int, timecode_seconds: int) -> Optional[int]:
        query = (
            select(VideoView)
            .where(
                VideoView.video_id == video_id,
                VideoView.user_id == user_id
            )
        )
        result = await self._session.execute(query)
        result: VideoView = result.scalar_one_or_none()
        if not result:
            return None
        result.view_end_timecode_seconds = timecode_seconds
        await self._session.commit()
        await self._session.refresh(result)
        return result.view_end_timecode_seconds

    async def get_all_video_by_user_id(self, user_id: int, page: int = 0, size: int = 100) -> tuple[Sequence[Video], int]:
        offset = page * size
        query = (
            select(Video)
            .where(
                Video.author_id == user_id,
                Video.status == VideoStatusEnum.READY,
            )
            .order_by(Video.created_at.desc())
            .limit(size)
            .offset(offset)
        )
        result = await self._session.execute(query)
        videos = result.scalars().all()

        count_query = (
            select(func.count())
            .select_from(Video)
            .where(
                Video.status == VideoStatusEnum.READY,
                Video.author_id == user_id,
            )
        )
        total_result = await self._session.execute(count_query)
        total = total_result.scalar_one()

        return videos, total


async def get_video_repository(session: AsyncSession = Depends(get_db)) -> VideoRepository:
    return VideoRepository(session)