from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, datetime, timedelta

from app.db.session import get_db
from app.models.cdr import CDR
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/summary")
def get_reports_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    today_start = datetime(today.year, today.month, today.day)
    today_end = today_start + timedelta(days=1)

    total_calls = db.query(func.count(CDR.id)).scalar() or 0
    answered    = db.query(func.count(CDR.id)).filter(CDR.durum.in_(["cevaplandi", "aktarildi"])).scalar() or 0
    abandoned   = db.query(func.count(CDR.id)).filter(CDR.durum.in_(["cevaplanmadi", "mesgul"])).scalar() or 0
    avg_duration = (
        db.query(func.avg(CDR.konusma_suresi)).filter(CDR.durum == "cevaplandi").scalar() or 0
    )
    avg_m, avg_s = int(avg_duration // 60), int(avg_duration % 60)

    # Saatlik grafik — bugün 08-18
    hourly_gelen = (
        db.query(
            extract("hour", CDR.baslangic_zamani).label("hour"),
            func.count(CDR.id).label("cnt"),
        )
        .filter(CDR.baslangic_zamani >= today_start, CDR.baslangic_zamani < today_end)
        .group_by(extract("hour", CDR.baslangic_zamani))
        .all()
    )
    hourly_cevap = (
        db.query(
            extract("hour", CDR.baslangic_zamani).label("hour"),
            func.count(CDR.id).label("cnt"),
        )
        .filter(
            CDR.baslangic_zamani >= today_start,
            CDR.baslangic_zamani < today_end,
            CDR.durum.in_(["cevaplandi", "aktarildi"]),
        )
        .group_by(extract("hour", CDR.baslangic_zamani))
        .all()
    )

    gelen_map = {int(r.hour): r.cnt for r in hourly_gelen}
    cevap_map = {int(r.hour): r.cnt for r in hourly_cevap}

    hourly_chart = []
    for h in range(8, 19):
        g = gelen_map.get(h, 0)
        c = cevap_map.get(h, 0)
        hourly_chart.append({
            "name": f"{h:02d}:00",
            "gelen": g,
            "cevaplanan": c,
            "kacan": max(0, g - c),
        })

    # Temsilci performansı — kullanicilar üzerinden
    personel = (
        db.query(User)
        .filter(User.silindi_mi == False, User.rol_id == 3)
        .order_by(User.xp.desc())
        .limit(20)
        .all()
    )

    agents = []
    for u in personel:
        user_calls = db.query(func.count(CDR.id)).filter(
            CDR.user_id == u.id, CDR.durum.in_(["cevaplandi", "aktarildi"])
        ).scalar() or 0
        avg_sec = db.query(func.avg(CDR.konusma_suresi)).filter(
            CDR.user_id == u.id, CDR.durum == "cevaplandi"
        ).scalar() or 0
        avg_sec = int(avg_sec)
        agents.append({
            "id": str(u.id),
            "name": u.ad_soyad or u.kullanici_adi,
            "calls": user_calls,
            "avgTime": f"{avg_sec // 60}m {avg_sec % 60}s",
            "csat": None,
        })

    return {
        "kpis": [
            {"label": "Toplam Çağrı", "value": str(total_calls), "trend": None, "trendType": None},
            {"label": "Cevaplanan", "value": str(answered), "trend": None, "trendType": None},
            {"label": "Kaçan Çağrı", "value": str(abandoned), "trend": None, "trendType": None},
            {"label": "Ort. Süre", "value": f"{avg_m}m {avg_s}s", "trend": None, "trendType": None},
        ],
        "hourly_chart": hourly_chart,
        "agents": agents,
    }
