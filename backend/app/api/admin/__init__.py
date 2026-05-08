"""
Admin API paketi
────────────────
Tüm admin route'ları burada toplanır:
- core      → /admin/overview, /admin/users, /admin/teams, /admin/audit
- personnel → /admin/personnel/* (V3 Komuta Modeli — master liste, detay, override)
- warroom   → /admin/war-room/* (Canlı Operasyon — aktif çağrı, kuyruk, personel radar)

Eski kullanım: app.api.admin (tek dosya)  →  Yeni: app.api.admin (paket).
Geriye uyumluluk: from app.api.admin import router  hâlâ çalışır.
"""
from fastapi import APIRouter

from app.api.admin import core, personnel, operations, header, overview, warroom

router = APIRouter()
router.include_router(core.router)
router.include_router(personnel.router)
router.include_router(operations.router)
router.include_router(header.router)
router.include_router(overview.router)
router.include_router(warroom.router)

__all__ = ["router"]
