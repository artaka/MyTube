from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Query
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from app.endpoints.video import router as video_router
from app.endpoints.comments import comments_router
from app.database.db import async_engine as engine, Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()

app = FastAPI(
    lifespan=lifespan,
    version="0.1.0",
    title="Video Service",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Для разработки можно поставить ["*"], для продакшна — конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(video_router)
app.include_router(comments_router)