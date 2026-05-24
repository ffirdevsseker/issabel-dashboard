"""
Agent · Kişisel KPI + Ekip Cevapsız Takibi
------------------------------------------
GET  /agent/stats/today          — Kullanıcıya özel bugünkü KPI
GET  /agent/priorities           — Kişisel + ekip öncelikleri
GET  /agent/callbacks            — Bugün cevapsız/meşgul + takip durumu
POST /agent/callbacks/{id}/track — Geri arama durumunu güncelle

Tasarım kararı:
  · answered / total / avg_duration → user_id filtreli  (kişisel)
  · no_answer / busy                → filtre yok        (ekip geneli)
    Cevapsız çağrılarda user_id = NULL olduğundan kişisel filtreyle
    yakalanmazlar; ekip adına geri arama görevi herkese görünür.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.async_session import get_async_db
from app.models.user import User
from app.models.callback import CallbackTakip
from app.services import cdr_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["Agent"])

_EMPTY_STATS = {
    "total_calls":            0,
    "answered_calls":         0,
    "no_answer_calls":        0,
    "busy_calls":             0,
    "failed_calls":           0,
    "total_duration_seconds": 0,
    "avg_duration_seconds":   0.0,
    "answer_rate_percent":    0.0,
}

_REASON_MAP = {
    "cevaplanmadi": "Cevapsız",
    "mesgul":       "Meşgul Hat",
}

_TAKIP_LABEL = {
    "bekliyor":    "Bekliyor",
    "arandı":      "Arandı",
    "ulasilamadi": "Ulaşılamadı",
    "tamamlandi":  "Tamamlandı",
}


# ── GET /agent/stats/today ───────────────────────────────────────────────────
@router.get("/stats/today")
async def agent_today_stats(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """
    Kişisel performans + ekip cevapsız sayısı.
    DB hatasında sıfırlanmış güvenli payload döner — frontend çökmesin.
    """
    try:
        personal = await cdr_service.get_call_stats(
            db, user_id=current_user.id, today_only=True
        )
        team = await cdr_service.get_call_stats(
            db, user_id=None, today_only=True
        )
    except Exception as exc:
        logger.warning("agent_today_stats başarısız: %s", exc)
        personal = dict(_EMPTY_STATS)
        team = dict(_EMPTY_STATS)
    return {
        # Kişisel: bu agent'ın çağrıları
        "total_calls":            personal["total_calls"],
        "answered_calls":         personal["answered_calls"],
        "avg_duration_seconds":   personal["avg_duration_seconds"],
        "total_duration_seconds": personal["total_duration_seconds"],
        "answer_rate_percent":    personal["answer_rate_percent"],
        # Kişisel cevapsız (header için)
        "my_no_answer_calls":     personal["no_answer_calls"] + personal["busy_calls"],
        # Ekip geneli (referans / dashboard KPI için)
        "no_answer_calls":        team["no_answer_calls"],
        "busy_calls":             team["busy_calls"],
        "failed_calls":           team["failed_calls"],
        "team_total":             team["total_calls"],
        "team_answered":          team["answered_calls"],
    }


# ── GET /agent/priorities ────────────────────────────────────────────────────
@router.get("/priorities")
async def agent_priorities(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    """Kişisel CDR verisi + ekip cevapsızlarından türetilen öncelikler."""
    try:
        personal = await cdr_service.get_call_stats(
            db, user_id=current_user.id, today_only=True
        )
        team = await cdr_service.get_call_stats(
            db, user_id=None, today_only=True
        )
    except Exception as exc:
        logger.warning("agent_priorities başarısız: %s", exc)
        return []
    priorities = []

    # Ekip geneli cevapsız (geri arama görevi)
    missed = team["no_answer_calls"] + team["busy_calls"]
    if missed > 0:
        priorities.append({
            "id":          "missed_callbacks",
            "priority":    "high",
            "title":       f"Ekipte {missed} cevapsız çağrı geri aranmayı bekliyor",
            "description": "Bugün cevaplanmayan ve meşgul çağrılar",
            "status":      "pending",
        })

    # Kişisel ortalama süre uyarısı
    avg_sec = personal["avg_duration_seconds"]
    if avg_sec > 300:
        over = int(avg_sec - 300)
        priorities.append({
            "id":          "long_duration",
            "priority":    "medium",
            "title":       f"Görüşme ortalamanız {int(avg_sec // 60)}dk {int(avg_sec % 60)}sn",
            "description": f"5 dakika hedefini {over // 60}dk {over % 60}sn aşıyor",
            "status":      "pending",
        })

    # Kişisel çağrı özeti
    total    = personal["total_calls"]
    answered = personal["answered_calls"]
    rate     = personal["answer_rate_percent"]
    if total > 0:
        priorities.append({
            "id":          "call_summary",
            "priority":    "low",
            "title":       f"Bugün {answered} çağrı cevapladınız",
            "description": f"Kişisel yanıt oranınız: %{round(rate, 1)}",
            "status":      "pending" if rate < 80 else "completed",
            "progress":    min(100, int(rate)),
        })

    if total == 0:
        priorities.append({
            "id":          "no_calls_yet",
            "priority":    "low",
            "title":       "Bugün henüz çağrı almadınız",
            "description": "Çağrılarınız geldikçe istatistikler burada görünecek",
            "status":      "completed",
        })

    return priorities


# ── GET /agent/callbacks ─────────────────────────────────────────────────────
@router.get("/callbacks")
async def agent_callbacks(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(15, ge=1, le=50),
):
    """Bugünkü cevapsız/meşgul + takip durumu (varsayılan: en fazla 15 kayıt).
    callback_takip tablosu yoksa veya CDR sorgusu çökerse boş liste döner.
    """
    # 1) CDR cevapsız listesi (bugün filtreli, limit ile kısıtlı)
    try:
        rows = await cdr_service.get_today_missed_calls(db, user_id=current_user.id)
        rows = rows[:limit]
    except Exception as exc:
        logger.warning("agent_callbacks CDR sorgusu başarısız: %s", exc)
        return []

    # 2) Takip kayıtları (tablo yoksa boş map kullan)
    cdr_ids = [row.id for row in rows]
    takip_map: dict[uuid.UUID, CallbackTakip] = {}
    if cdr_ids:
        try:
            stmt = select(CallbackTakip).where(CallbackTakip.cdr_id.in_(cdr_ids))
            result = await db.execute(stmt)
            for t in result.scalars().all():
                if t.cdr_id not in takip_map or t.guncelleme_zamani > takip_map[t.cdr_id].guncelleme_zamani:
                    takip_map[t.cdr_id] = t
        except Exception as exc:
            logger.warning("callback_takip sorgusu başarısız (tablo yok olabilir): %s", exc)
            # Boş map ile devam et — her satır "bekliyor" olarak işlenir
            await db.rollback()

    # 3) Satırları serileştir
    result_list = []
    for i, row in enumerate(rows, start=1):
        try:
            t: datetime = row.baslangic_zamani
            takip = takip_map.get(row.id)
            takip_durum = takip.durum if takip else "bekliyor"

            result_list.append({
                "id":          str(row.id),
                "name":        f"Müşteri #{i}",
                "reason":      _REASON_MAP.get(row.durum, row.durum),
                "time":        t.strftime("%H:%M") if t else "--:--",
                "age":         _age_label(t),
                "durum":       row.durum,
                "detail":      _REASON_MAP.get(row.durum, row.durum),
                "kategori":    row.kategori or "",
                "takip_durum": takip_durum,
                "takip_label": _TAKIP_LABEL.get(takip_durum, takip_durum),
            })
        except Exception as exc:
            logger.warning("Callback satırı serileştirilemedi (id=%s): %s", getattr(row, "id", "?"), exc)
            continue

    return result_list


# ── POST /agent/callbacks/{cdr_id}/track ─────────────────────────────────────
class TrackPayload(BaseModel):
    durum: Literal["bekliyor", "arandı", "ulasilamadi", "tamamlandi"]


@router.post("/callbacks/{cdr_id}/track")
async def track_callback(
    cdr_id: uuid.UUID,
    payload: TrackPayload,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    try:
        stmt = select(CallbackTakip).where(
            CallbackTakip.cdr_id   == cdr_id,
            CallbackTakip.agent_id == current_user.id,
        )
        result = await db.execute(stmt)
        takip = result.scalar_one_or_none()

        if takip:
            takip.durum = payload.durum
            takip.guncelleme_zamani = datetime.now(timezone.utc)
        else:
            takip = CallbackTakip(
                cdr_id   = cdr_id,
                agent_id = current_user.id,
                durum    = payload.durum,
            )
            db.add(takip)

        await db.commit()
        return {
            "cdr_id":      str(cdr_id),
            "takip_durum": takip.durum,
            "takip_label": _TAKIP_LABEL.get(takip.durum, takip.durum),
        }
    except Exception as exc:
        logger.warning("track_callback başarısız (cdr_id=%s): %s", cdr_id, exc)
        await db.rollback()
        # 503: tablo yok / DB problemi — frontend optimistic UI'ı koruyabilir
        raise HTTPException(
            status_code=503,
            detail="Takip kaydı oluşturulamadı (callback_takip tablosu hazır olmayabilir).",
        )


# ── GET /agent/ami-status ────────────────────────────────────────────────────
@router.get("/ami-status")
async def agent_ami_status(
    current_user: User = Depends(get_current_user),
):
    """AMI bağlantısının gerçek durumunu döner."""
    try:
        from app.ami.listener import get_manager
        manager = get_manager()
        connected = manager is not None and getattr(manager, "_protocol", None) is not None
    except Exception:
        connected = False
    return {"connected": connected}


def _age_label(dt: datetime | None) -> str:
    if dt is None:
        return "–"
    diff = int((datetime.now(timezone.utc) - dt).total_seconds() / 60)
    if diff < 1:
        return "şimdi"
    if diff < 60:
        return f"{diff} dk"
    h, m = divmod(diff, 60)
    return f"{h}s {m}d"
