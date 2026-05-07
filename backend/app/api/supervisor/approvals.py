"""Onay Merkezi (Approval Center) — Supervisor (gerçek DB şemasına göre)."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_role
from app.core.scope import apply_user_scope, supervisor_can_act_on_personel
from app.models.user import User
from app.models.complaint import Sikayet
from app.models.kb import KbOneri
from app.models.shift import VardiyaTalep
from app.models.break_ import Mola

router = APIRouter(prefix="/approvals", tags=["Supervisor — Onay Merkezi"])
SUPERVISOR_OR_ADMIN = require_role(["supervisor", "admin"])


@router.get("/summary")
def summary(
    db: Session = Depends(get_db),
    user: User = Depends(SUPERVISOR_OR_ADMIN),
):
    sk_q = apply_user_scope(
        db.query(Sikayet).filter(Sikayet.durum.in_(["olusturuldu", "supervisor_inceleme"])),
        user, Sikayet.personel_id, db,
    )
    vt_q = apply_user_scope(
        db.query(VardiyaTalep).filter(VardiyaTalep.durum == "beklemede"),
        user, VardiyaTalep.user_id, db,
    )
    kb_q = apply_user_scope(
        db.query(KbOneri).filter(KbOneri.durum == "beklemede"),
        user, KbOneri.oneren_id, db,
    )
    mola_q = apply_user_scope(
        db.query(Mola).filter(Mola.onay_durumu == "beklemede"),
        user, Mola.user_id, db,
    )

    sk = sk_q.count()
    vt = vt_q.count()
    kb = kb_q.count()
    ml = mola_q.count()

    return {
        "bekleyen_sikayet": sk,
        "bekleyen_vardiya_talep": vt,
        "bekleyen_kb_oneri": kb,
        "bekleyen_mola": ml,
        "toplam": sk + vt + kb + ml,
    }


@router.get("/complaints")
def list_complaints(
    durum: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(SUPERVISOR_OR_ADMIN),
):
    q = db.query(Sikayet)
    q = apply_user_scope(q, user, Sikayet.personel_id, db)
    if durum:
        q = q.filter(Sikayet.durum == durum)
    else:
        q = q.filter(Sikayet.durum.in_(["olusturuldu", "supervisor_inceleme"]))
    results = q.order_by(Sikayet.tarih.desc()).limit(200).all()
    return [
        {
            "id": str(s.id),
            "personel_id": str(s.personel_id),
            "kategori": s.kategori,
            "aciklama": s.aciklama,
            "durum": s.durum,
            "tarih": s.tarih.isoformat() if s.tarih else None,
        }
        for s in results
    ]


@router.post("/complaints/{complaint_id}/decide")
def decide_complaint(
    complaint_id: str,
    karar: str,
    gerekce: str = "",
    db: Session = Depends(get_db),
    user: User = Depends(SUPERVISOR_OR_ADMIN),
):
    from uuid import UUID
    try:
        cid = UUID(complaint_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Geçersiz id")

    sikayet = db.query(Sikayet).filter(Sikayet.id == cid).first()
    if not sikayet:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Şikayet bulunamadı")
    if not supervisor_can_act_on_personel(db, user, sikayet.personel_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Yetkiniz yok")

    sikayet.durum = "onaylandi" if karar == "onayla" else "reddedildi"
    sikayet.supervisor_id = user.id
    sikayet.supervisor_notu = gerekce
    sikayet.supervisor_tarih = datetime.utcnow()
    db.commit()
    return {"success": True}


@router.get("/shift-requests")
def list_shift_requests(
    durum: str | None = "beklemede",
    db: Session = Depends(get_db),
    user: User = Depends(SUPERVISOR_OR_ADMIN),
):
    q = db.query(VardiyaTalep)
    q = apply_user_scope(q, user, VardiyaTalep.user_id, db)
    if durum:
        q = q.filter(VardiyaTalep.durum == durum)
    results = q.order_by(VardiyaTalep.created_at.desc()).limit(200).all()
    return [
        {
            "id": str(r.id),
            "user_id": str(r.user_id),
            "durum": r.durum,
            "gerekce": r.gerekce,
            "talep_tarihi": r.talep_tarihi.isoformat() if r.talep_tarihi else None,
        }
        for r in results
    ]


@router.get("/kb-suggestions")
def list_kb_suggestions(
    durum: str | None = "beklemede",
    db: Session = Depends(get_db),
    user: User = Depends(SUPERVISOR_OR_ADMIN),
):
    q = db.query(KbOneri)
    q = apply_user_scope(q, user, KbOneri.oneren_id, db)
    if durum:
        q = q.filter(KbOneri.durum == durum)
    results = q.order_by(KbOneri.created_at.desc()).limit(200).all()
    return [
        {
            "id": str(o.id),
            "baslik": o.baslik,
            "durum": o.durum,
            "oneren_id": str(o.oneren_id) if o.oneren_id else None,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in results
    ]


@router.post("/kb-suggestions/{sug_id}/decide")
def decide_kb_suggestion(
    sug_id: str,
    karar: str,
    gerekce: str = "",
    db: Session = Depends(get_db),
    user: User = Depends(SUPERVISOR_OR_ADMIN),
):
    from uuid import UUID
    try:
        sid = UUID(sug_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Geçersiz id")

    oneri = db.query(KbOneri).filter(KbOneri.id == sid).first()
    if not oneri:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Öneri bulunamadı")

    oneri.durum = "onaylandi" if karar == "onayla" else "reddedildi"
    oneri.supervisor_id = user.id
    oneri.supervisor_notu = gerekce
    db.commit()
    return {"success": True}
