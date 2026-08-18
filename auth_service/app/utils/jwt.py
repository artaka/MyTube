import jwt
from datetime import datetime, timedelta, timezone
from app.config import Settings

SECRET_KEY = Settings.SECRET_KEY
ALGORITHM = "HS256"
REFRESH_TOKEN_EXPIRE_DAYS = 30

def create_refresh_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)