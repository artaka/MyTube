import logging
from typing import Optional, Sequence, Literal
from uuid import UUID

from fastapi.params import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database.db import get_db
from app.database.models import Video, VideoView, VideoActivity, VideoComments, CommentActivity
from app.schemas.Enums import VideoStatusEnum, VideoActivityTypeEnum
from app.schemas.comments import CommentResponse, CommentListResponse

logger = logging.getLogger(__name__)
class CommentsRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_comment_by_id(self, comment_id: UUID) -> Optional[VideoComments]:
        query = select(VideoComments).where(VideoComments.id == comment_id)
        result = await self._session.execute(query)
        result: VideoComments = result.scalar_one_or_none()
        if not result:
            return None
        return result

    async def get_comments_by_video_id(
            self,
            video_id: UUID,
            size: int,
            page: int,
            user_id: Optional[int] = None,
    ) -> tuple[Sequence[VideoComments], int]:
        offset = (page - 1) * size

        total_query = (
            select(func.count())
            .select_from(VideoComments)
            .where(VideoComments.video_id == video_id)
        )
        total_result = await self._session.execute(total_query)
        total = total_result.scalar_one()

        if total == 0:
            return [], 0

        if user_id:
            query = (
                select(VideoComments, CommentActivity.activity_type)
                .outerjoin(
                    CommentActivity,
                    (CommentActivity.comment_id == VideoComments.id) &
                    (CommentActivity.user_id == user_id)
                )
                .where(VideoComments.video_id == video_id)
                .offset(offset)
                .limit(size)
            )
            result = await self._session.execute(query)

            comments = []
            for comment_obj, activity_type in result.all():
                comment_obj.viewer_activity = activity_type
                comments.append(comment_obj)
        else:
            query = (
                select(VideoComments)
                .where(VideoComments.video_id == video_id)
                .offset(offset)
                .limit(size)
            )
            res = await self._session.execute(query)
            comments = res.scalars().all()
            for comment_obj in comments:
                comment_obj.viewer_activity = None

        return comments, total

    async def set_comment_activity(
            self,
            comment_id: UUID,
            user_id: int,
            activity: VideoActivityTypeEnum,
    ) -> Optional[Literal[VideoActivityTypeEnum.LIKE, VideoActivityTypeEnum.DISLIKE]]:
        comment_query = (
            select(VideoComments)
            .where(VideoComments.id == comment_id)
        )
        comment_result = await self._session.execute(comment_query)
        comment_result: VideoComments = comment_result.scalar_one_or_none()
        if not comment_result:
            return None

        user_comment_activity_query = (
            select(CommentActivity)
            .where(
                CommentActivity.user_id == user_id,
                CommentActivity.comment_id == comment_id,
            )
        )
        user_comment_activity_result = await self._session.execute(user_comment_activity_query)
        user_comment_activity_result: CommentActivity = user_comment_activity_result.scalar_one_or_none()

        if not user_comment_activity_result:
            new_comment_activity = CommentActivity(
                user_id = user_id,
                comment_id = comment_id,
                activity_type = activity,
            )

            self._session.add(new_comment_activity)
            match activity:
                case VideoActivityTypeEnum.LIKE:
                    comment_result.likes_count += 1
                case VideoActivityTypeEnum.DISLIKE:
                    comment_result.dislikes_count += 1

            await self._session.commit()
            return activity

        if user_comment_activity_result.activity_type == activity:
            match activity:
                case VideoActivityTypeEnum.LIKE:
                    comment_result.likes_count = max(comment_result.likes_count - 1, 0)
                case VideoActivityTypeEnum.DISLIKE:
                    comment_result.dislikes_count = max(comment_result.dislikes_count - 1, 0)

            await self._session.delete(user_comment_activity_result)
            await self._session.commit()
            return None

        if user_comment_activity_result.activity_type == VideoActivityTypeEnum.LIKE:
            comment_result.likes_count = max(comment_result.likes_count - 1, 0)
            comment_result.dislikes_count += 1
        elif user_comment_activity_result.activity_type == VideoActivityTypeEnum.DISLIKE:
            comment_result.dislikes_count = max(comment_result.dislikes_count - 1, 0)
            comment_result.likes_count += 1
        user_comment_activity_result.activity_type = activity
        await self._session.commit()
        return activity

    async def get_comment_activity(self, comment_id: UUID, user_id: int) -> Optional[CommentActivity]:
        activity_query = (
            select(CommentActivity)
            .where(
                CommentActivity.comment_id == comment_id,
                CommentActivity.user_id == user_id
            )
        )
        activity_result = await self._session.execute(activity_query)
        activity_result:CommentActivity = activity_result.scalar_one_or_none()
        if not activity_result:
            return None
        return activity_result


    async def create_new_comment(self, video_id, user_id, text: str) -> Optional[VideoComments]:
        video_query = select(Video).where(Video.id == video_id)
        video_result = await self._session.execute(video_query)
        video_result: Video = video_result.scalar_one_or_none()
        if not video_result:
            return None

        new_comment = VideoComments(
            author_id = user_id,
            video_id = video_id,
            text = text
        )
        self._session.add(new_comment)

        video_result.comments_count += 1
        await self._session.commit()
        await self._session.refresh(new_comment)
        return new_comment



async def get_comments_repository(session: AsyncSession = Depends(get_db)) -> CommentsRepository:
    return CommentsRepository(session)