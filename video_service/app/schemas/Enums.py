from enum import Enum


class VideoStatusEnum(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class VideoActivityTypeEnum(str, Enum):
    LIKE = "like"
    DISLIKE = "dislike"
    SHARE = "share"

