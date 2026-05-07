"""Vardiya Yönetimi — Supervisor (gerçek DB şemasına göre)."""
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_db, require_role
from app.core.scope import (
    apply_user_scope, get_supervisor_team_ids, get_team_personel_ids,
)
from app.models.user import User
from app.models.shift import Vardiya, VardiyaTalep

router = APIRouter(prefix="/shifts", tags=["Supervisor — Vardiya"])
SUPERVISOR_OR_ADMIN = require_role(["supervisor", "admin"])


@router.get("/team")
def team_personel(
    db: Session = Depends(get_db),
    user: User = Depends(SUPERVISOR_OR_ADMIN),
):
    """Supervisor'ın ekibindeki personeli döner."""
    if user.role_name == "admin":
        users = db.query(User).filter(User.silindi_mi == False, User.rol_id == 3).all()
    else:
        team_ids = get_supervisor_team_ids(db, user)
        per_ids = get_team_personel_ids(db, team_ids)
        users = db.query(User).filter(User.id.in_(per_ids)).all() if per_ids else []

    return [
        {
            "id": str(u.id),
            "username": u.kullanici_adi,
            "full_name": u.ad_soyad,
            "extension": u.dahili_no,
            "role": u.role_name,
        }
        for u in users
    ]


@router.get("/")
def list_shifts(
    start: date = Query(...),
    end: date = Query(...),
    db: Session = Depends(get_db),
    user: User = Depends(SUPERVISOR_OR_ADMIN),
):
    if (end - start).days > 60:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Maks 60 günlük aralık")

    q = db.query(Vardiya).filter(Vardiya.tarih >= start, Vardiya.tarih <= end)
    q = apply_user_scope(q, user, Vardiya.user_id, db)
    results = q.order_by(Vardiya.tarih.asc()).all()

    return [
        {
            "id": str(v.id),
            "user_id": str(v.user_id),
            "tarih": v.tarih.isoformat() if v.tarih else None,
            "baslangic_saat": v.baslangic_saat,
            "bitis_saat": v.bitis_saat,
        }
        for v in results
    ]


@router.get("/calendar-summary")
def calendar_summary(
    year: int = Query(..., ge=2020, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
    user: User = Depends(SUPERVISOR_OR_ADMIN),
):
    import calendar as cal_module
    days_in_month = cal_module.monthrange(year, month)[1]
    start = date(year, month, 1)
    end = date(year, month, days_in_month)

    if user.role_name == "admin":
        per_ids = [u.id for u in db.query(User).filter(User.silindi_mi == False).all()]
    else:
        team_ids = get_supervisor_team_ids(db, user)
        per_ids = get_team_personel_ids(db, team_ids)

    total_personel = len(per_ids)

    vardiyalar = (
        db.query(Vardiya)
        .filter(
            Vardiya.tarih >= start,
            Vardiya.tarih <= end,
            *([Vardiya.user_id.in_(per_ids)] if per_ids else []),
        )
        .all()
    )

    day_map: dict[date, int] = {}
    for v in vardiyalar:
        d = v.tarih
        day_map[d] = day_map.get(d, 0) + 1

    result = []
    for day_0 in range(days_in_month):
        d = date(year, month, day_0 + 1)
        result.append({
            "tarih": d.isoformat(),
            "working": day_map.get(d, 0),
            "total": total_personel,
            "night": 0,
            "leave": 0,
            "pending": 0,
        })
    return result


@router.get("/weekly-stats")
def weekly_stats(
    start: date = Query(...),
    end: date = Query(...),
    db: Session = Depends(get_db),
    user: User = Depends(SUPERVISOR_OR_ADMIN),
):
    if (end - start).days > 14:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Maks 14 günlük aralık")

    if user.role_name == "admin":
        per_ids = [u.id for u in db.query(User).filter(User.silindi_mi == False).all()]
    else:
        team_ids = get_supervisor_team_ids(db, user)
        per_ids = get_team_personel_ids(db, team_ids)

    total_personel = len(per_ids)
    days = (end - start).days + 1
    toplam_slot = total_personel * days

    atanan_slot = db.query(func.count(Vardiya.id)).filter(
        Vardiya.tarih >= start,
        Vardiya.tarih <= end,
        *([Vardiya.user_id.in_(per_ids)] if per_ids else []),
    ).scalar() or 0

    bekleyen = db.query(func.count(VardiyaTalep.id)).filter(
        VardiyaTalep.talep_tarihi >= datetime.combine(start, datetime.min.time()),
        VardiyaTalep.talep_tarihi <= datetime.combine(end, datetime.max.time()),
        VardiyaTalep.durum == "beklemede",
        *([VardiyaTalep.user_id.in_(per_ids)] if per_ids else []),
    ).scalar() or 0

    doluluk = round((atanan_slot / toplam_slot) * 100, 1) if toplam_slot > 0 else 0.0

    return {
        "toplam_planlanan_saat": 0.0,
        "atanmamis_slot": max(0, toplam_slot - atanan_slot),
        "fazla_mesai_personel": 0,
        "bekleyen_talep": bekleyen,
        "doluluk_oran": doluluk,
    }
