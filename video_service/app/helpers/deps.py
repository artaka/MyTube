from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from typing import Optional
from app.config import settings

security = HTTPBearer(auto_error=False)
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"

async def get_optional_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Optional[int]:
    if not credentials:
        return None
    token = credentials.credentials
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_aud": False})
        user_id: int = int(payload.get("sub"))
        return user_id
    except Exception:
        return None

async def get_current_user(
        user_id: Optional[int] = Depends(get_optional_current_user),
) -> int:
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return user_id