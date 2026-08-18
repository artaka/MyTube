from uuid import UUID
from pydantic import BaseModel, Field

class SubscriptionStatusResponse(BaseModel):
    is_subscribed: bool = Field(..., description="Subscription status (True if subscribed, False if unsubscribed)")
    channel_id: UUID = Field(..., description="Target Channel ID")
