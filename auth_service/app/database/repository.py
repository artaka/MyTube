from app.database.models import User
from app.database.db     import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select


class UsersRepository:
    __session: AsyncSession

    def __init__(self) -> None:
        self.__session = get_db()

    async def get_user_by_id(self, user_id: int) -> User | None:
        query = select(User).where(User.id == user_id)
        query_res = await self.__session.execute(query)

        user = query_res.scalars().first()
        if not user:
            return None
        return user

    async def get_user_by_email(self, email: str) -> User | None:
        query = select(User).where(User.email == email)
        query_res = await self.__session.execute(query)
        user = query_res.scalars().first()
        if not user:
            return None
        return user