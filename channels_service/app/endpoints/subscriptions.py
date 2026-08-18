from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.channels import ChannelResponse
from app.schemas.subscriptions import SubscriptionStatusResponse
from app.database.subscriptions_repository import SubscriptionRepository, get_subscription_repo
from app.helpers.deps import get_current_user


subscriptions_router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@subscriptions_router.post("/{channel_id}/toggle", response_model=SubscriptionStatusResponse)
async def toggle_subscription(
        channel_id: UUID,
        user_id: int = Depends(get_current_user),
        repo: SubscriptionRepository = Depends(get_subscription_repo)
):
    try:
        is_subbed = await repo.toggle_subscription(user_id=user_id, channel_id=channel_id)
        return SubscriptionStatusResponse(is_subscribed=is_subbed, channel_id=channel_id)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@subscriptions_router.get("/my", response_model=list[ChannelResponse])
async def get_my_subscriptions(
        user_id: int = Depends(get_current_user),
        repo: SubscriptionRepository = Depends(get_subscription_repo)
):
    try:
        channels = await repo.get_user_subscriptions(user_id=user_id)
        return channels
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@subscriptions_router.get("/", response_model=list[ChannelResponse])
async def get_subscriptions(
        user_id: int = Depends(get_current_user),
        repo: SubscriptionRepository = Depends(get_subscription_repo)
):
    return await get_my_subscriptions(user_id=user_id, repo=repo)
