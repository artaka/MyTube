from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi_users import FastAPIUsers
from app.database.db import engine, Base
from app.config import auth_backend, google_oauth_client, Settings
from app.manager import get_users_manager
from app.schemas.user import UserRead, UserCreate, UserUpdate
from app.refresh_tokens import router as refresh_token_router, fastapi_users
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

app = FastAPI(
    lifespan=lifespan,
    title="Auth Service"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Для разработки можно поставить ["*"], для продакшна — конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)

app.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/auth",
    tags=["auth"],
)

app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)


app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth",
    tags=["auth"],
)

app.include_router(
    fastapi_users.get_oauth_router(
        oauth_client=google_oauth_client,
        backend=auth_backend,
        state_secret=Settings.SECRET_KEY,
        redirect_url="http://localhost/",
        associate_by_email=True,
    ),
    prefix="/auth",
    tags=["auth"],
)

app.include_router(
    refresh_token_router,
    prefix="/auth",
    tags=["auth"],
)