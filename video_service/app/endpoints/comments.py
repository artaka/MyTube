from uuid import UUID
from fastapi import APIRouter, Request, Depends, HTTPException, UploadFile, File, Form
from fastapi.params import Query
from starlette import status
from starlette.responses import Response

from app.database.video_repository import get_video_repository, VideoRepository
from app.schemas.Enums import VideoStatusEnum, VideoActivityTypeEnum
from app.schemas.comments import CommentResponse, CommentListResponse, CommentCreateRequest
from app.helpers.deps import get_optional_current_user, get_current_user
from app.database.comments_repository import CommentsRepository, get_comments_repository


comments_router = APIRouter(
    prefix="/comments",
)


@comments_router.get("/{comment_id}", response_model=CommentResponse)
async def get_comment_by_id(
        comment_id: UUID,
        current_user: int = Depends(get_optional_current_user),
        comments_repo: CommentsRepository = Depends(get_comments_repository)
):
    comment = await comments_repo.get_comment_by_id(comment_id)
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    if not current_user:
        return comment

    user_comment_activity = await comments_repo.get_comment_activity(comment_id, current_user)
    return CommentResponse(
        id=comment.id,
        author_id=comment.author_id,
        video_id=comment.video_id,
        text=comment.text,
        likes_count=comment.likes_count,
        dislikes_count=comment.dislikes_count,
        created_at=comment.created_at,
        user_activity=user_comment_activity.activity_type
    )

@comments_router.get("/videos/{video_id}", response_model=CommentListResponse)
async def get_comment_list(
        video_id: UUID,
        size:int = Query(100, description="Page size"),
        page: int = Query(1, description="Page number"),
        comments_repo: CommentsRepository = Depends(get_comments_repository),
        current_user: int = Depends(get_optional_current_user),
):
    user_id = current_user

    comments, total = await comments_repo.get_comments_by_video_id(
        video_id=video_id,
        size=size,
        page=page,
        user_id=user_id
    )

    return CommentListResponse(
        items=comments,
        total=total,
        page=page,
        size=size,
    )

@comments_router.post("/{comment_id}", response_model=CommentResponse)
async def set_comment_activity(
        comment_id: UUID,
        current_user: int = Depends(get_current_user),
        comments_repo: CommentsRepository = Depends(get_comments_repository),
        activity: VideoActivityTypeEnum = Query(default=VideoActivityTypeEnum.LIKE,description="Activity type(\"like\"/\"dislike\")"),
):
    set_result = await comments_repo.set_comment_activity(comment_id=comment_id, activity=activity, user_id=current_user)
    comment = await comments_repo.get_comment_by_id(comment_id)
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    user_comment_activity = await comments_repo.get_comment_activity(comment_id, current_user)
    return CommentResponse(
        id=comment.id,
        author_id=comment.author_id,
        video_id=comment.video_id,
        text=comment.text,
        likes_count=comment.likes_count,
        dislikes_count=comment.dislikes_count,
        created_at=comment.created_at,
        viewer_activity=user_comment_activity.activity_type if set_result != None else None
    )

@comments_router.post("/videos/{video_id}", response_model=CommentResponse)
async def create_comment(
        video_id: UUID,
        comment: CommentCreateRequest,
        current_user: int = Depends(get_current_user),
        comments_repo: CommentsRepository = Depends(get_comments_repository)
):
    user_id = current_user
    new_comment = await comments_repo.create_new_comment(video_id=video_id, text=comment.text, user_id=user_id)
    return new_comment