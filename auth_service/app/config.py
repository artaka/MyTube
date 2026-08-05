from httpx_oauth.clients.google import GoogleOAuth2
from pydantic_settings import BaseSettings, SettingsConfigDict
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy

class SettingsClass(BaseSettings):
    DB_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 600
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

Settings = SettingsClass()
    
bearer_transport = BearerTransport(tokenUrl="auth/login")
def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(
        secret=Settings.SECRET_KEY,
        lifetime_seconds=Settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )

auth_backend = AuthenticationBackend(
    name="auth",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

google_oauth_client = GoogleOAuth2(
    client_id=Settings.GOOGLE_CLIENT_ID,
    client_secret=Settings.GOOGLE_CLIENT_SECRET,
)