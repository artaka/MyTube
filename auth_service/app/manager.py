import logging
from fastapi import Depends, Request
from fastapi_users import BaseUserManager, IntegerIDMixin, models
from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.db import get_db
from app.database.models import User, OAuthAccount
from app.config import Settings

SECRET = Settings.SECRET_KEY

logger = logging.getLogger("__name__")


async def get_user_db(session: AsyncSession = Depends(get_db)):
    yield SQLAlchemyUserDatabase(session, User, OAuthAccount)

class UserManager(IntegerIDMixin, BaseUserManager[User, int]):
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    async def on_after_register(
        self, user: models.UP, request: Request | None = None
    ) -> None:
        logger.info("User registered")

async def get_users_manager(user_db = Depends(get_user_db)):
    yield UserManager(user_db)