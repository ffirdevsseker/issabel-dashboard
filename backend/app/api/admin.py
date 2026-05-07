from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta

from app.db.session import get_db
from app.api.deps import require_admin
from app.models.user import User
from app.models.organization import Departman, Ekip
from app.models.cdr import CDR
from app.models.audit import DenetimIzi

router = APIRouter(prefix="/admin", tags=["Admin"])

ADMIN_ONLY = require_admin


@router.get("/overview")
def admin_overview(
    db: Session = Depends(get_db),
    user: User = Depends(ADMIN_ONLY),
):
    today = date.today()
    today_start = datetime(today.year, today.month, today.day)
    today_end = today_start + timedelta(days=1)

    total_users = db.query(func.count(User.id)).filter(User.silindi_mi == False).scalar() or 0
    total_teams = db.query(func.count(Ekip.id)).filter(Ekip.aktif == True).scalar() or 0
    total_depts = db.query(func.count(Departman.id)).scalar() or 0

    today_calls = db.query(func.count(CDR.id)).filter(
        CDR.baslangic_zamani >= today_start,
        CDR.baslangic_zamani < today_end,
    ).scalar() or 0
    today_answered = db.query(func.count(CDR.id)).filter(
        CDR.baslangic_zamani >= today_start,
        CDR.baslangic_zamani < today_end,
        CDR.durum.in_(["cevaplandi", "aktarildi"]),
    ).scalar() or 0

    total_calls_all = db.query(func.count(CDR.id)).scalar() or 0
    answered_all = db.query(func.count(CDR.id)).filter(CDR.durum.in_(["cevaplandi", "aktarildi"])).scalar() or 0
    answer_rate = round(answered_all / total_calls_all * 100, 1) if total_calls_all > 0 else 0.0

    recent_audit = (
        db.query(DenetimIzi)
        .order_by(DenetimIzi.created_at.desc())
        .limit(10)
        .all()
    )

    return {
        "system": {
            "total_users": total_users,
            "total_teams": total_teams,
            "total_departments": total_depts,
        },
        "today_calls": {
            "total": today_calls,
            "answered": today_answered,
            "missed": max(0, today_calls - today_answered),
        },
        "overall_answer_rate": answer_rate,
        "recent_audit": [
            {
                "id": str(a.islem_yapan_id),
                "action": a.eylem,
                "user": str(a.islem_yapan_id),
                "target": f"{a.hedef_tablo} #{a.hedef_id}",
                "olay_zamani": a.created_at.isoformat() if a.created_at else None,
            }
            for a in recent_audit
        ],
    }


@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    user: User = Depends(ADMIN_ONLY),
):
    users = (
        db.query(User)
        .filter(User.silindi_mi == False)
        .order_by(User.ad_soyad.asc())
        .all()
    )
    return [
        {
            "id": str(u.id),
            "username": u.kullanici_adi,
            "full_name": u.ad_soyad,
            "extension": u.dahili_no,
            "role": u.role_name,
            "is_active": not u.silindi_mi,
            "xp": u.xp,
            "seviye": u.seviye,
        }
        for u in users
    ]


@router.get("/teams")
def list_teams(
    db: Session = Depends(get_db),
    user: User = Depends(ADMIN_ONLY),
):
    teams = (
        db.query(Ekip)
        .filter(Ekip.aktif == True)
        .order_by(Ekip.ad.asc())
        .all()
    )
    return [
        {
            "id": str(t.id),
            "isim": t.ad,
            "departman": t.departman.ad if t.departman else None,
            "aktif": t.aktif,
        }
        for t in teams
    ]


@router.get("/departments")
def list_departments(
    db: Session = Depends(get_db),
    user: User = Depends(ADMIN_ONLY),
):
    depts = db.query(Departman).order_by(Departman.ad.asc()).all()
    return [
        {"id": str(d.id), "isim": d.ad, "max_mola_dakika": d.max_mola_dakika}
        for d in depts
    ]


@router.get("/audit")
def list_audit(
    limit: int = 100,
    db: Session = Depends(get_db),
    user: User = Depends(ADMIN_ONLY),
):
    logs = (
        db.query(DenetimIzi)
        .order_by(DenetimIzi.created_at.desc())
        .limit(min(limit, 500))
        .all()
    )
    return [
        {
            "islem_yapan_id": str(a.islem_yapan_id),
            "hedef_tablo": a.hedef_tablo,
            "hedef_id": a.hedef_id,
            "eylem": a.eylem,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in logs
    ]
