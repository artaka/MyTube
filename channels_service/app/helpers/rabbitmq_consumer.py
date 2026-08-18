import json
import asyncio
import logging
import aio_pika
from sqlalchemy import select
from app.config import settings
from app.database.db import async_session_maker
from app.database.models import Channel

logger = logging.getLogger(__name__)

async def start_metrics_consumer():
    rabbitmq_url = settings.RABBITMQ_URL
    while True:
        try:
            connection = await aio_pika.connect_robust(rabbitmq_url)
            async with connection:
                channel = await connection.channel()
                await channel.set_qos(prefetch_count=10)
                queue = await channel.declare_queue("channel_metrics_queue", durable=True)

                async with queue.iterator() as queue_iter:
                    async for message in queue_iter:
                        async with message.process():
                            try:
                                data = json.loads(message.body.decode())
                                owner_id = data.get("owner_id")
                                metric = data.get("metric")
                                delta = data.get("delta", 1)

                                if not owner_id or not metric:
                                    continue

                                async with async_session_maker() as session:
                                    query = select(Channel).where(Channel.owner_id == owner_id)
                                    res = await session.execute(query)
                                    ch: Channel | None = res.scalar_one_or_none()
                                    if ch:
                                        if metric == "views":
                                            ch.views_counter = max(0, ch.views_counter + delta)
                                        elif metric == "likes":
                                            ch.likes_counter = max(0, ch.likes_counter + delta)
                                        elif metric == "videos":
                                            ch.videos_counter = max(0, ch.videos_counter + delta)
                                        elif metric == "subscribers":
                                            ch.subscribers_counter = max(0, ch.subscribers_counter + delta)
                                        await session.commit()
                            except Exception as e:
                                logger.error(f"Error processing channel metric message: {e}")
        except asyncio.CancelledError:
            logger.info("RabbitMQ metrics consumer task cancelled.")
            break
        except Exception as e:
            logger.error(f"RabbitMQ consumer connection error: {e}. Retrying in 5s...")
            await asyncio.sleep(5)
