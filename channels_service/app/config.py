from pydantic_settings import BaseSettings, SettingsConfigDict

class SettingsClass(BaseSettings):
    DB_URL: str
    SECRET_KEY: str
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_EXTERNAL_ENDPOINT: str
    BUCKET_NAME: str
    REGION_NAME: str
    RABBITMQ_URL: str = "amqp://guest:guest@rabbitmq:5672//"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = SettingsClass()