"""Audit log helper — denetim_izleri tablosuna yazar."""
from typing import Optional, Any, Dict
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import Request

from app.models.audit import DenetimIzi
from app.models.user import User


def write_audit(
    db: Session,
    user: Optional[User],
    *,
    action: str,
    target_type: str = "",
    target_id: str = "",
    sonuc: str = "basarili",
    critical: bool = False,
    gerekce: Optional[str] = None,
    detay: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
) -> Optional[DenetimIzi]:
    """Denetim izleri tablosuna kayıt yazar. Otomatik commit YOK."""
    if user is None:
        return None

    extra = {}
    if gerekce:
        extra["gerekce"] = gerekce
    if detay:
        extra.update(detay)

    log = DenetimIzi(
        islem_yapan_id=user.id,
        hedef_tablo=target_type or "",
        hedef_id=str(target_id) if target_id else "",
        eylem=action,
        eski_veri=None,
        yeni_veri=extra if extra else None,
        created_at=datetime.now(timezone.utc),
    )
    db.add(log)
    db.flush()
    return log
