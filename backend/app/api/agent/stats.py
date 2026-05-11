"""
Agent · Günlük İstatistikler, Öncelikler ve Geri Arama Listesi
--------------------------------------------------------------
GET /agent/stats/today   — Bugünkü KPI özeti  (ekip geneli)
GET /agent/priorities    — CDR'den türetilen dinamik öncelikler
GET /agent/callbacks     — Bugün cevaplanmadi / mesgul çağrılar

NOT: Cevapsız / meşgul çağrıların user_id'si NULL olur (hiçbir temsilci
     cevap vermemiş). Bu nedenle tüm agent endpoint'leri user_id filtresi
     uygulamadan bugünün ekip geneli verisini döner.
"""
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.async_session import get_async_db
from app.models.user import User
from app.services import cdr_service

router = APIRouter(prefix="/agent", tags=["Agent"])


# ── GET /agent/stats/today ──────────────────────────────────────────────────
@router.get("/stats/today")
async def agent_today_stats(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Bugüne ait ekip geneli çağrı KPI'larını döner."""
    return await cdr_service.get_call_stats(db, user_id=None, today_only=True)


# ── GET /agent/priorities ───────────────────────────────────────────────────
@router.get("/priorities")
async def agent_priorities(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Bugünkü CDR verisinden dinamik olarak türetilen öncelik listesi."""
    stats = await cdr_service.get_call_stats(db, user_id=None, today_only=True)
    priorities = []

    missed = stats["no_answer_calls"] + stats["busy_calls"]
    if missed > 0:
        priorities.append({
            "id":          "missed_callbacks",
            "priority":    "high",
            "title":       f"{missed} cevapsız çağrı geri aranmayı bekliyor",
            "description": "Bugün cevaplanmayan ve meşgul çağrılar",
            "status":      "pending",
        })

    avg_sec = stats["avg_duration_seconds"]
    if avg_sec > 300:
        over = int(avg_sec - 300)
        priorities.append({
            "id":          "long_duration",
            "priority":    "medium",
            "title":       f"Ortalama görüşme süresi {int(avg_sec // 60)}d {int(avg_sec % 60)}s",
            "description": f"5 dakika hedefini {over // 60}d {over % 60}s aşıyor",
            "status":      "pending",
        })

    total    = stats["total_calls"]
    answered = stats["answered_calls"]
    rate     = stats["answer_rate_percent"]
    if total > 0:
        priorities.append({
            "id":          "call_summary",
            "priority":    "low",
            "title":       f"Bugün {answered} / {total} çağrı cevaplandı",
            "description": f"Yanıt oranı: %{round(rate, 1)}",
            "status":      "pending" if rate < 80 else "completed",
            "progress":    min(100, int(rate)),
        })

    # Bugün hiç çağrı yoksa bilgilendirici öncelik ekle
    if total == 0:
        priorities.append({
            "id":          "no_calls_yet",
            "priority":    "low",
            "title":       "Bugün henüz çağrı kaydı yok",
            "description": "Çağrılar geldikçe öncelikler otomatik güncellenecek",
            "status":      "completed",
        })

    return priorities


# ── GET /agent/callbacks ────────────────────────────────────────────────────
@router.get("/callbacks")
async def agent_callbacks(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """
    Bugün cevapsız (cevaplanmadi) ve meşgul (mesgul) çağrıları döner.
    user_id filtresi uygulanmaz — cevapsız çağrılarda user_id NULL olur.
    """
    rows = await cdr_service.get_today_missed_calls(db, user_id=None)

    REASON_MAP = {
        "cevaplanmadi": "Cevapsız",
        "mesgul":       "Meşgul Hat",
    }

    result = []
    for i, row in enumerate(rows, start=1):
        t: datetime = row.baslangic_zamani
        result.append({
            "id":        str(row.id),
            "name":      f"Müşteri #{i}",
            "number":    f"#{i}",
            "reason":    REASON_MAP.get(row.durum, row.durum),
            "time":      t.strftime("%H:%M") if t else "--:--",
            "age":       _age_label(t),
            "durum":     row.durum,
            "detail":    REASON_MAP.get(row.durum, row.durum),
            "kategori":  row.kategori or "",
        })

    return result


def _age_label(dt: datetime | None) -> str:
    if dt is None:
        return "–"
    diff = int((datetime.now() - dt).total_seconds() / 60)
    if diff < 1:
        return "şimdi"
    if diff < 60:
        return f"{diff} dk"
    h, m = divmod(diff, 60)
    return f"{h}s {m}d"
