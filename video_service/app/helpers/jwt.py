import jwt
from app.config import settings

def decode_jwt(token: str) -> dict:
    secret_key = settings.SECRET_KEY
    try:
        payload = jwt.decode(token, secret_key)
        return payload
    except Exception:
        return None