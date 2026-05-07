import asyncio
from datetime import datetime, timezone, date, timedelta

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from jose import JWTError
from sqlalchemy import func

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.user import User
from app.models.cdr import CDR

router = APIRouter(tags=["Queue"])


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
    # Gercek bekleyen = bitis_zamani IS NULL (hala acik cagri)
    waiting_q = db.query(CDR).filter(CDR.bitis_zamani.is_(None))
    if user_id is not None:
        waiting_q = waiting_q.filter(CDR.user_id == user_id)

    waiting_calls = waiting_q.with_entities(func.count()).scalar() or 0

    # Bekleyen cagrilarin listesi (max 30)
    waiting_list = waiting_q.order_by(CDR.baslangic_zamani.asc()).limit(30).all()

    wait_durations = [max(0, int(c.bekleme_suresi or 0)) for c in waiting_list]
    longest_wait = max(wait_durations) if wait_durations else 0
    avg_wait = round(sum(wait_durations) / len(wait_durations)) if wait_durations else 0

    # Bugunun kacan/cevapsiz cagrilari (referans icin)
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_end = today_start + timedelta(days=1)
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
                "number": str(c.user_id or "Bilinmeyen"),
                "waitSeconds": _seconds_since(c.baslangic_zamani),
                "disposition": c.durum,
            }
            for c in waiting_list
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

        while True:
            snapshot = _build_queue_snapshot(db, user_id=uid)
            await websocket.send_json(snapshot)
            await asyncio.sleep(1)

    except WebSocketDisconnect:
        return
    finally:
        db.close()
