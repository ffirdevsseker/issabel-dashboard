from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, String

from app.models.cdr import CDR


def _apply_user_filter(stmt, user_id):
    """Eğer user_id verilmişse sadece o kullanıcının çağrılarını filtrele."""
    if user_id is not None:
        stmt = stmt.where(CDR.user_id == user_id)
    return stmt


def _today_range():
    """Bugünün UTC gün başı/sonu — TIMESTAMPTZ kolonuyla uyumlu aware datetime."""
    now   = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end   = start + timedelta(days=1)
    return start, end


def _apply_today_filter(stmt):
    start, end = _today_range()
    return stmt.where(CDR.baslangic_zamani >= start, CDR.baslangic_zamani < end)


async def get_recent_calls(
    db: AsyncSession,
    limit: int = 50,
    user_id=None,
    today_only: bool = False,
    extension: Optional[str] = None,  # kept for signature compat, ignored
) -> list[CDR]:
    stmt = select(CDR)
    stmt = _apply_user_filter(stmt, user_id)
    if today_only:
        stmt = _apply_today_filter(stmt)
    stmt = stmt.order_by(CDR.baslangic_zamani.desc()).limit(limit)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_call_stats(
    db: AsyncSession,
    user_id=None,
    today_only: bool = False,
    extension: Optional[str] = None,
) -> dict:
    def _base(s):
        s = _apply_user_filter(s, user_id)
        if today_only:
            s = _apply_today_filter(s)
        return s

    total = (await db.execute(_base(select(func.count(CDR.id))))).scalar() or 0

    async def _count(durum_val: str) -> int:
        stmt = _base(select(func.count(CDR.id)).where(cast(CDR.durum, String) == durum_val))
        return (await db.execute(stmt)).scalar() or 0

    answered  = await _count("cevaplandi")
    no_answer = await _count("cevaplanmadi")
    busy      = await _count("mesgul")
    failed    = await _count("aktarildi")

    stmt_dur = _base(select(
        func.coalesce(func.sum(CDR.konusma_suresi), 0),
        func.coalesce(func.avg(CDR.konusma_suresi), 0),
    ))
    row = (await db.execute(stmt_dur)).first()
    total_duration, avg_duration = row if row else (0, 0)

    answer_rate = (answered / total * 100) if total > 0 else 0.0

    return {
        "total_calls":            total,
        "answered_calls":         answered,
        "no_answer_calls":        no_answer,
        "busy_calls":             busy,
        "failed_calls":           failed,
        "total_duration_seconds": int(total_duration),
        "avg_duration_seconds":   round(float(avg_duration), 2),
        "answer_rate_percent":    round(answer_rate, 2),
    }


async def get_today_missed_calls(db: AsyncSession, user_id=None) -> list[CDR]:
    """Bugün cevapsız (cevaplanmadi / mesgul) çağrılar."""
    stmt = select(CDR).where(CDR.durum.in_(["cevaplanmadi", "mesgul"]))
    stmt = _apply_user_filter(stmt, user_id)
    stmt = _apply_today_filter(stmt)
    stmt = stmt.order_by(CDR.baslangic_zamani.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())
