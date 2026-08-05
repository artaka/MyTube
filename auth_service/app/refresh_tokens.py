from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_users import FastAPIUsers
from pydantic import BaseModel
import jwt

from app.manager import get_users_manager
from app.config import get_jwt_strategy, Settings, auth_backend
from app.schemas.user import UserRead
from app.utils.jwt import create_refresh_token
from app.database.models import User

# Импортируйте ваши зависимости из настроек fastapi-users
# from your_app.users import get_user_manager, get_jwt_strategy

fastapi_users = FastAPIUsers[User, int](
    get_users_manager,
    [auth_backend]
)

router = APIRouter(prefix="/auth", tags=["auth"])
SECRET_KEY = Settings.SECRET_KEY
ALGORITHM = "HS256"
current_user = fastapi_users.current_user(active=True)

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class RefreshTokenResponse(BaseModel):
    refresh_token: str

@router.post("/refresh/get", response_model=RefreshTokenResponse)
async def get_refresh_token(user: UserRead = Depends(current_user)):
    refresh_token = create_refresh_token(user.id)
    return refresh_token

@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
        request: RefreshTokenRequest,
        user_manager=Depends(get_users_manager),
        jwt_strategy=Depends(get_jwt_strategy)
):
    try:
        payload = jwt.decode(request.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])

        user_id = payload.get("sub")
        token_type = payload.get("type")

        if token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )

        user = await user_manager.get(user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User inactive or deleted"
            )

        new_access_token = await jwt_strategy.write_token(user)

        return {"access_token": new_access_token, "token_type": "bearer"}

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired. Please log in again."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )