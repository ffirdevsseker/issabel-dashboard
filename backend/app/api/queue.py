import asyncio
import logging
from datetime import datetime, timezone, date, timedelta

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from jose import JWTError
from sqlalchemy import func

logger = logging.getLogger(__name__)

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.user import User
from app.models.cdr import CDR

router = APIRouter(tags=["Queue"])

_DURUM_LABEL = {
    "cevaplandi":   "Cevaplandı",
    "cevaplanmadi": "Cevapsız",
    "mesgul":       "Meşgul",
    "aktarildi":    "Aktarıldı",
}

# ── Gerçek Zamanlı Event Pub/Sub yapısı ──
event_queues = set()

def broadcast_event(event_dict: dict):
    """Bu metot çağrıldığında o an bağlı olan tüm WebSocket istemcilerine ilgili event'i fırlatır."""
    for q in list(event_queues):
        try:
            q.put_nowait(event_dict)
        except Exception:
            pass


def _user_id_for(user: User):
    if user.role_name == "admin":
        return None
    return user.id


def _seconds_since(ts: datetime | None) -> int:
    if not ts:
        return 0
    now = datetime.now(timezone.utc)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return max(0, int((now - ts).total_seconds()))


def _build_queue_snapshot(db, user_id) -> dict:
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end   = today_start + timedelta(days=1)

    # Bugün açılan ve henüz kapanmamış çağrılar (günlük aktif kuyruk)
    waiting_q = db.query(CDR).filter(
        CDR.bitis_zamani.is_(None),
        CDR.baslangic_zamani >= today_start,
        CDR.baslangic_zamani < today_end,
    )
    if user_id is not None:
        waiting_q = waiting_q.filter(CDR.user_id == user_id)

    waiting_calls = waiting_q.with_entities(func.count()).scalar() or 0

    # Bekleyen çağrıların listesi (max 30)
    waiting_list = waiting_q.order_by(CDR.baslangic_zamani.asc()).limit(30).all()

    wait_durations = [max(0, int(c.bekleme_suresi or 0)) for c in waiting_list]
    longest_wait = max(wait_durations) if wait_durations else 0
    avg_wait = round(sum(wait_durations) / len(wait_durations)) if wait_durations else 0

    # Bugünün özet istatistikleri
    today_base = db.query(CDR).filter(
        CDR.baslangic_zamani >= today_start,
        CDR.baslangic_zamani < today_end,
    )
    if user_id is not None:
        today_base = today_base.filter(CDR.user_id == user_id)

    today_total    = today_base.with_entities(func.count()).scalar() or 0
    today_answered = today_base.filter(CDR.durum == "cevaplandi").with_entities(func.count()).scalar() or 0
    today_missed   = today_total - today_answered

    estimated_pickup = max(5, round(avg_wait * 0.7 + waiting_calls * 4)) if waiting_calls else 0

    return {
        "type": "queue_update",
        "waitingCalls": waiting_calls,
        "longestWaitSeconds": longest_wait,
        "avgWaitSeconds": avg_wait,
        "estimatedPickupSeconds": estimated_pickup,
        "todayTotal": today_total,
        "todayAnswered": today_answered,
        "todayMissed": today_missed,
        "queuedNumbers": [
            {
                "sira":       i + 1,
                "label":      f"Çağrı #{i + 1}",
                "callTime":   c.baslangic_zamani.strftime("%H:%M") if c.baslangic_zamani else "--:--",
                "direction":  "Gelen" if c.yon == "gelen" else "Giden",
                "durum":      _DURUM_LABEL.get(c.durum, c.durum),
                "durum_raw":  c.durum,
                "kategori":   c.kategori or "",
                "waitSeconds": _seconds_since(c.baslangic_zamani),
            }
            for i, c in enumerate(waiting_list)
        ],
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }


@router.websocket("/ws/queue")
async def queue_stream(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token gerekli")
        return

    db = SessionLocal()
    try:
        try:
            payload = decode_access_token(token)
            username = payload.get("sub")
            if not username:
                raise JWTError("Missing subject")
        except JWTError:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Gecersiz token")
            return

        user = db.query(User).filter(User.kullanici_adi == username).first()
        if not user or user.silindi_mi:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Yetkisiz")
            return

        uid = _user_id_for(user)
        await websocket.accept()

        client_queue = asyncio.Queue()
        event_queues.add(client_queue)

        # DB hatalarında WS düşmesin — boş snapshot gönder, yeniden dene
        empty_snapshot = {
            "type": "queue_update",
            "waitingCalls": 0,
            "longestWaitSeconds": 0,
            "avgWaitSeconds": 0,
            "estimatedPickupSeconds": 0,
            "todayTotal": 0,
            "todayAnswered": 0,
            "todayMissed": 0,
            "queuedNumbers": [],
            "updatedAt": None,
        }

        while True:
            try:
                # 1 saniye bekler. Eğer client_queue'dan event gelirse onu yollar.
                # Gelmezse timeout'a düşer ve standart _build_queue_snapshot yollar.
                try:
                    event = await asyncio.wait_for(client_queue.get(), timeout=1.0)
                    await websocket.send_json(event)
                    continue  # Döngü başına dön, snapshot hemen yollama
                except asyncio.TimeoutError:
                    pass

                snapshot = _build_queue_snapshot(db, user_id=uid)
            except Exception as exc:
                logger.warning("queue snapshot başarısız (rollback ediliyor): %s", exc)
                try:
                    db.rollback()
                except Exception:  # noqa: BLE001
                    pass
                snapshot = {**empty_snapshot, "updatedAt": datetime.now(timezone.utc).isoformat()}
            
            await websocket.send_json(snapshot)

    except WebSocketDisconnect:
        pass
    finally:
        if client_queue in event_queues:
            event_queues.remove(client_queue)
        db.close()
