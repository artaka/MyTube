import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import text
from app.endpoints.channels import channels_router
from app.endpoints.subscriptions import subscriptions_router
from app.endpoints.storage import storage_router
from app.database.db import async_engine as engine, Base
from app.storage.repository import init_storage
from app.helpers.rabbitmq_consumer import start_metrics_consumer

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        try:
            await conn.execute(text("ALTER TABLE channels ALTER COLUMN created_at SET DEFAULT now();"))
            await conn.execute(text("ALTER TABLE channels ALTER COLUMN updated_at SET DEFAULT now();"))
            await conn.execute(text("ALTER TABLE subscriptions ALTER COLUMN created_at SET DEFAULT now();"))
        except Exception:
            pass
    await init_storage()
    consumer_task = asyncio.create_task(start_metrics_consumer())
    yield
    consumer_task.cancel()
    await engine.dispose()

app = FastAPI(
    lifespan=lifespan,
    version="0.1.0",
    title="Channel Service",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(channels_router)
app.include_router(subscriptions_router)
app.include_router(storage_router)