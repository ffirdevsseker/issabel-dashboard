"""
Admin API paketi
────────────────
Tüm admin route'ları burada toplanır:
- core      → /admin/overview, /admin/users, /admin/teams, /admin/audit
- personnel → /admin/personnel/* (V3 Komuta Modeli — master liste, detay, override)

Eski kullanım: app.api.admin (tek dosya)  →  Yeni: app.api.admin (paket).
Geriye uyumluluk: from app.api.admin import router  hâlâ çalışır.
"""
from fastapi import APIRouter

from app.api.admin import core, personnel

router = APIRouter()
router.include_router(core.router)
router.include_router(personnel.router)

__all__ = ["router"]
