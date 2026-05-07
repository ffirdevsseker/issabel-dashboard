from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.core.config import settings


# Bcrypt şifre hash'leyici
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Düz şifreyi DB'deki hash ile karşılaştır"""
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """Yeni kullanıcı oluştururken şifreyi hash'lemek için"""
    return pwd_context.hash(password)


def create_access_token(
    user_id: str,
    username: str,
    role: str,
    extension: Optional[str] = None,
) -> str:
    """JWT access token üretir. subject = username"""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": username,
        "user_id": str(user_id),
        "kullanici_adi": username,
        "rol": role,
        "role": role,
        "extension": extension,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    """JWT token'ı çöz, geçersizse JWTError fırlatır"""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])