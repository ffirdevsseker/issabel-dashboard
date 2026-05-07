from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.cdr import CDR


def _apply_user_filter(stmt, user_id):
    """Eğer user_id verilmişse sadece o kullanıcının çağrılarını filtrele."""
    if user_id is not None:
        stmt = stmt.where(CDR.user_id == user_id)
    return stmt


async def get_recent_calls(
    db: AsyncSession,
    limit: int = 50,
    user_id=None,
    extension: Optional[str] = None,  # kept for signature compat, ignored
) -> list[CDR]:
    stmt = select(CDR)
    stmt = _apply_user_filter(stmt, user_id)
    stmt = stmt.order_by(CDR.baslangic_zamani.desc()).limit(limit)
    
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_call_stats(db: AsyncSession, user_id=None, extension: Optional[str] = None) -> dict:
    # Toplam çağrı
    stmt_total = select(func.count(CDR.id))
    stmt_total = _apply_user_filter(stmt_total, user_id)
    total = (await db.execute(stmt_total)).scalar() or 0

    async def _count_by_durum(durum_val: str) -> int:
        stmt = select(func.count(CDR.id)).where(CDR.durum == durum_val)
        stmt = _apply_user_filter(stmt, user_id)
        return (await db.execute(stmt)).scalar() or 0

    answered  = await _count_by_durum("cevaplandi")
    no_answer = await _count_by_durum("cevaplanmadi")
    busy      = await _count_by_durum("mesgul")
    failed    = await _count_by_durum("aktarildi")

    # Süre istatistikleri
    stmt_dur = select(
        func.coalesce(func.sum(CDR.konusma_suresi), 0),
        func.coalesce(func.avg(CDR.konusma_suresi), 0),
    )
    stmt_dur = _apply_user_filter(stmt_dur, user_id)
    row = (await db.execute(stmt_dur)).first()
    total_duration, avg_duration = row if row else (0, 0)

    answer_rate = (answered / total * 100) if total > 0 else 0.0

    return {
        "total_calls": total,
        "answered_calls": answered,
        "no_answer_calls": no_answer,
        "busy_calls": busy,
        "failed_calls": failed,
        "total_duration_seconds": int(total_duration),
        "avg_duration_seconds": round(float(avg_duration), 2),
        "answer_rate_percent": round(answer_rate, 2),
    }
