from typing import Iterable, List, Callable, Coroutine, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import decode_access_token
from app.db.async_session import get_async_db
from app.db.session import get_db  # noqa: F401 — supervisor modülleri buradan import ediyor
from app.models.user import User


security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_async_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz veya süresi dolmuş token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(credentials.credentials)
        username = payload.get("sub")
        if not username:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    from app.models.role import Rol
    stmt = (
        select(User, Rol.ad)
        .outerjoin(Rol, Rol.id == User.rol_id)
        .where(User.kullanici_adi == username)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise credentials_exception
    user, db_role = row
    if not user or user.silindi_mi:
        raise credentials_exception
    # DB'den gelen gerçek rol adını kullanıcıya ekle (ROLE_MAP'teki sabit ID'leri bypass et)
    user._db_role = db_role or payload.get("role", "personel")
    return user


def require_role(roles: Iterable[str]) -> Callable[[User], Coroutine[Any, Any, User]]:
    allowed: List[str] = list(roles)

    async def _checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role_name not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bu işlem için yetkiniz yok (gerekli: {', '.join(allowed)})",
            )
        return current_user

    return _checker


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role_name != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için yönetici yetkisi gereklidir",
        )
    return current_user


async def require_supervisor(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role_name not in ("supervisor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için süpervizör veya yönetici yetkisi gereklidir",
        )
    return current_user


async def require_bt(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role_name not in ("bt", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlem için BT birimi veya yönetici yetkisi gereklidir",
        )
    return current_user
