from pydantic_settings import BaseSettings, SettingsConfigDict

class SettingsClass(BaseSettings):
    DB_URL: str
    SECRET_KEY: str
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_EXTERNAL_ENDPOINT: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = SettingsClass()