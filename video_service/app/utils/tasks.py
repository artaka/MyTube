import json
import os
import subprocess
import shutil
from celery import Celery
import boto3
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database.models import Video
from app.schemas.Enums import VideoStatusEnum


CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672//")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

celery_app = Celery("video_tasks", broker=CELERY_BROKER_URL, backend=CELERY_RESULT_BACKEND)
celery_app.conf.update(task_acks_late=True, worker_prefetch_limit=1)

BUCKET_NAME = "videos"
WORKSPACE_DIR = "/app/static/uploads"

DATABASE_URL_ASYNC = os.getenv(
    "DB_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/videodb"
)
DATABASE_URL_SYNC = DATABASE_URL_ASYNC.replace("postgresql+asyncpg://", "postgresql://")

sync_engine = create_engine(DATABASE_URL_SYNC, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=sync_engine, autocommit=False, autoflush=False)

def get_s3_client():
    endpoint = os.getenv('MINIO_ENDPOINT', 'minio:9000')
    return boto3.client(
        's3',
        endpoint_url=f"http://{endpoint}",
        aws_access_key_id=os.getenv('MINIO_ACCESS_KEY', 'minioadmin'),
        aws_secret_access_key=os.getenv('MINIO_SECRET_KEY', 'minioadminpassword'),
        region_name='us-east-1',
    )


@celery_app.task
def convert_to_hls_s3(file_path: str, video_id: str):
    s3_client = get_s3_client()
    db = SessionLocal()

    try:
        s3_client.create_bucket(Bucket=BUCKET_NAME)
        bucket_policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "PublicReadGetObject",
                    "Effect": "Allow",
                    "Principal": "*",
                    "Action": "s3:GetObject",
                    "Resource": f"arn:aws:s3:::{BUCKET_NAME}/*"
                }
            ]
        }
        s3_client.put_bucket_policy(Bucket=BUCKET_NAME, Policy=json.dumps(bucket_policy))
        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            video.status = VideoStatusEnum.PROCESSING
            db.commit()
    except Exception as e:
        print(f"Настройка бакета: {e}")

    tmp_dir = os.path.join(WORKSPACE_DIR, video_id)
    os.makedirs(tmp_dir, exist_ok=True)

    try:
        # 1. Генерируем Thumbnail (берем кадр с 1-й секунды)
        thumbnail_filename = "thumbnail.jpg"
        thumbnail_local_path = os.path.join(tmp_dir, thumbnail_filename)

        ffmpeg_thumb_cmd = [
            "ffmpeg", "-y",
            "-ss", "00:00:01",  # Смещение на 1-ю секунду (чтобы не заходить на черный экран в самом начале)
            "-i", file_path,
            "-vframes", "1",  # Извлечь ровно 1 кадр
            "-vf", "scale=1280:-1",  # Масштабируем по ширине 1280px, высота авто (сохраняет пропорции)
            "-q:v", "2",  # Высокое качество JPEG (шкала от 1 до 31, где 2 — отлично)
            thumbnail_local_path
        ]

        res_thumb = subprocess.run(ffmpeg_thumb_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res_thumb.returncode != 0:
            print(f"⚠️ Ошибка создания thumbnail: {res_thumb.stderr}")
        # Проверяем наличие звука
        audio_check = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_type", "-of", "csv=p=0",
             file_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
        has_audio = "audio" in audio_check.stdout
        print(f"Audio status: {has_audio}")

        # ОДНОПРОХОДНАЯ УМНАЯ КОМАНДА (Без промежуточных .mp4 файлов)
        # Мы используем filter_complex split, чтобы рассинхронизация кадров была физически невозможна
        hls_cmd = [
            "ffmpeg", "-y", "-i", file_path,
            "-filter_complex", "[0:v]split=2[v1][v2];[v1]scale=1280:720[v1out];[v2]scale=1920:1080[v2out]",

            # Настройки кодирования для 720p (вариант 0)
            "-c:v:0", "libx264", "-b:v:0", "2500k",

            # Настройки кодирования для 1080p (вариант 1)
            "-c:v:1", "libx264", "-b:v:1", "5000k",
        ]

        # Привязываем выходы фильтров к кодекам вариантов
        hls_cmd += ["-map", "[v1out]"]
        if has_audio: hls_cmd += ["-map", "0:a:0"]

        hls_cmd += ["-map", "[v2out]"]
        if has_audio: hls_cmd += ["-map", "0:a:0"]

        # Настраиваем карту плейлистов
        if has_audio:
            hls_cmd += ["-c:a", "aac", "-b:a", "192k", "-var_stream_map", "v:0,a:0 v:1,a:1"]
        else:
            hls_cmd += ["-var_stream_map", "v:0 v:1"]

        hls_cmd += [
            "-f", "hls",
            "-hls_time", "6",
            "-hls_playlist_type", "vod",
            "-master_pl_name", "master.m3u8",
            "-hls_segment_filename", "stream_%v_%03d.ts",  # Здесь синтаксис FFmpeg отработает напрямую
            "stream_%v.m3u8"
        ]

        # Запуск одной командой
        res_hls = subprocess.run(hls_cmd, cwd=tmp_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res_hls.returncode != 0:
            print(f"💥 FFmpeg HLS Error Log:\n{res_hls.stderr}")
            res_hls.check_returncode()

            # Заливка в MinIO
        print(f"Начинаем заливку файлов из {tmp_dir} в MinIO...")
        files_uploaded = 0
        for root, _, files in os.walk(tmp_dir):
            for file in files:
                local_file_path = os.path.join(root, file)
                relative_path = os.path.relpath(local_file_path, tmp_dir)
                s3_key = f"{video_id}/{relative_path}"

                    # Определяем Content-Type
                if file.endswith(".m3u8"):
                    content_type = "application/vnd.apple.mpegurl"
                elif file.endswith(".ts"):
                    content_type = "video/mp2t"
                elif file.endswith((".jpg", ".jpeg")):
                    content_type = "image/jpeg"
                else:
                    content_type = "application/octet-stream"

                s3_client.upload_file(
                    local_file_path,
                    BUCKET_NAME,
                    s3_key,
                    ExtraArgs={'ContentType': content_type}
                )
                files_uploaded += 1

        duration_check = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1",
             file_path],
            stdout=subprocess.PIPE, text=True
        )
        duration = int(float(duration_check.stdout.strip())) if duration_check.returncode == 0 else 0
        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            video.status = VideoStatusEnum.READY
            video.duration_seconds = duration
            db.commit()
            try:
                from app.helpers.rabbitmq_publisher import publish_channel_metric_event_sync
                publish_channel_metric_event_sync(owner_id=video.author_id, metric="videos", delta=1)
            except Exception as ev_err:
                print(f"Failed to publish metric event: {ev_err}")

        print(f"Успешно загружено файлов в MinIO: {files_uploaded}")
        return {"status": "Success", "video_id": video_id}

    except Exception as e:
        print(f"Ошибка выполнения таски: {e}")
        db.rollback()
        # В случае ошибки переводим видео в статус FAILED
        video = db.query(Video).filter(Video.id == video_id).first()
        if video:
            video.status = VideoStatusEnum.FAILED
            db.commit()
        raise e
    finally:
        db.close()
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        if os.path.exists(tmp_dir):
            shutil.rmtree(tmp_dir, ignore_errors=True)