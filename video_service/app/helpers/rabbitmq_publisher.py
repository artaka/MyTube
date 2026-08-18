import json
import os
import asyncio
import logging
import aio_pika

logger = logging.getLogger(__name__)
RABBITMQ_URL = os.getenv("CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672//")

async def publish_channel_metric_event(owner_id: int, metric: str, delta: int = 1):
    try:
        connection = await aio_pika.connect_robust(RABBITMQ_URL)
        async with connection:
            channel = await connection.channel()
            queue = await channel.declare_queue("channel_metrics_queue", durable=True)
            body = json.dumps({
                "owner_id": owner_id,
                "metric": metric,
                "delta": delta
            }).encode()
            await channel.default_exchange.publish(
                aio_pika.Message(
                    body=body,
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT
                ),
                routing_key="channel_metrics_queue"
            )
    except Exception as e:
        logger.error(f"Failed to publish channel metric event: {e}")

def publish_channel_metric_event_sync(owner_id: int, metric: str, delta: int = 1):
    try:
        asyncio.run(publish_channel_metric_event(owner_id=owner_id, metric=metric, delta=delta))
    except Exception as e:
        logger.error(f"Failed to publish sync channel metric event: {e}")
