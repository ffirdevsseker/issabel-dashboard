"""Mola Yönetimi — Supervisor (gerçek DB şemasına göre)."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.core.scope import apply_user_scope, supervisor_can_act_on_personel
from app.models.user import User
from app.models.break_ import Mola

router = APIRouter(prefix="/breaks", tags=["Supervisor — Mola"])
SUPERVISOR_OR_ADMIN = require_role(["supervisor", "admin"])


@router.get("/")
def list_breaks(
    durum: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(SUPERVISOR_OR_ADMIN),
):
    """Ekibin mola kayıtları."""
    q = db.query(Mola)
    q = apply_user_scope(q, user, Mola.user_id, db)
    if durum:
        q = q.filter(Mola.onay_durumu == durum)
    results = q.order_by(Mola.baslangic.desc()).limit(200).all()
    return [
        {
            "id": str(m.id),
            "user_id": str(m.user_id),
            "tip": m.tip,
            "baslangic": m.baslangic.isoformat() if m.baslangic else None,
            "bitis": m.bitis.isoformat() if m.bitis else None,
            "onay_durumu": m.onay_durumu,
            "supervisor_id": str(m.supervisor_id) if m.supervisor_id else None,
        }
        for m in results
    ]


@router.get("/active")
def active_breaks(
    db: Session = Depends(get_db),
    user: User = Depends(SUPERVISOR_OR_ADMIN),
):
    """Aktif molalar (onaylandi + bitmemiş)."""
    now = datetime.utcnow()
    q = db.query(Mola).filter(
        Mola.onay_durumu == "onaylandi",
        Mola.baslangic <= now,
        Mola.bitis >= now,
    )
    q = apply_user_scope(q, user, Mola.user_id, db)
    results = q.limit(100).all()
    return [
        {
            "id": str(m.id),
            "user_id": str(m.user_id),
            "tip": m.tip,
            "baslangic": m.baslangic.isoformat() if m.baslangic else None,
            "bitis": m.bitis.isoformat() if m.bitis else None,
        }
        for m in results
    ]


@router.post("/{mola_id}/decide")
def decide_break(
    mola_id: str,
    karar: str,
    db: Session = Depends(get_db),
    user: User = Depends(SUPERVISOR_OR_ADMIN),
):
    """Bekleyen mola talebini onayla / reddet."""
    from uuid import UUID
    try:
        mid = UUID(mola_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Geçersiz mola id")

    mola = db.query(Mola).filter(Mola.id == mid).first()
    if not mola:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mola talebi bulunamadı")
    if not supervisor_can_act_on_personel(db, user, mola.user_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Bu personel sizin ekibinizde değil")

    mola.onay_durumu = "onaylandi" if karar == "onayla" else "reddedildi"
    mola.supervisor_id = user.id
    db.commit()
    return {"success": True, "onay_durumu": mola.onay_durumu}


@router.get("/rules")
def list_break_rules(
    db: Session = Depends(get_db),
    user: User = Depends(SUPERVISOR_OR_ADMIN),
):
    """Mola kuralları — departmanlar tablosundaki max_mola_dakika."""
    from app.models.organization import Departman, Ekip
    team_ids = []
    if user.role_name != "admin":
        from app.core.scope import get_supervisor_team_ids
        team_ids = get_supervisor_team_ids(db, user)

    ekipler = db.query(Ekip).filter(
        Ekip.aktif == True,
        *([Ekip.id.in_(team_ids)] if team_ids and user.role_name != "admin" else []),
    ).all()

    result = []
    for e in ekipler:
        dept = e.departman
        result.append({
            "ekip_id": str(e.id),
            "ekip_ad": e.ad,
            "max_mola_dakika": dept.max_mola_dakika if dept else 60,
        })
    return result
