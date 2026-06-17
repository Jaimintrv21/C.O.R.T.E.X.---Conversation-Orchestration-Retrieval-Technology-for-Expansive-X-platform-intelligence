"""JWT encode/decode with RS256."""
from __future__ import annotations
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
import jwt
from app.config import get_settings

settings = get_settings()


def _load_key(path: str) -> str:
    p = Path(path)
    if p.exists():
        return p.read_text()
    # Fallback to HMAC with secret_key for dev
    return settings.secret_key


def create_access_token(user_id: uuid.UUID, role: str = "user") -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_access_token_expire_minutes),
        "jti": str(uuid.uuid4()),
    }
    key = _load_key(settings.jwt_private_key_path)
    algorithm = "HS256" if key == settings.secret_key else settings.jwt_algorithm
    return jwt.encode(payload, key, algorithm=algorithm)


def create_refresh_token(user_id: uuid.UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "iat": now,
        "exp": now + timedelta(days=settings.jwt_refresh_token_expire_days),
        "jti": str(uuid.uuid4()),
    }
    key = _load_key(settings.jwt_private_key_path)
    algorithm = "HS256" if key == settings.secret_key else settings.jwt_algorithm
    return jwt.encode(payload, key, algorithm=algorithm)


def decode_token(token: str) -> dict:
    key = _load_key(settings.jwt_public_key_path)
    algorithm = "HS256" if key == settings.secret_key else settings.jwt_algorithm
    return jwt.decode(token, key, algorithms=[algorithm])
