from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.async_session import get_async_db
from app.models.user import User
from app.schemas.cdr import CDRRead, CDRStats
from app.services import cdr_service

router = APIRouter(prefix="/cdr", tags=["CDR"])


def _user_id_for_user(user: User):
    """Admin tüm çağrıları görsün (None), diğerleri kendi UUID'leri üzerinden."""
    if user.role_name == "admin":
        return None
    return user.id


@router.get("/recent", response_model=list[CDRRead])
async def recent_calls(
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    uid = _user_id_for_user(current_user)
    return await cdr_service.get_recent_calls(db, limit=limit, user_id=uid)


@router.get("/stats", response_model=CDRStats)
async def call_stats(
    today: bool = Query(False, description="Sadece bugünün verilerini döner"),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    uid = _user_id_for_user(current_user)
    return await cdr_service.get_call_stats(db, user_id=uid, today_only=today)
