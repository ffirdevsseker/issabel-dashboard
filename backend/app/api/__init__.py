"""
API router toplama noktası
──────────────────────────
Her rol kendi paketinde / dosyasında. Yeni endpoint açarken:
- Cross-role          → kök seviye (auth.py, cdr.py, queue.py, ...)
- Agent'a özel        → app/api/agent/
- Supervisor'a özel   → app/api/supervisor/
- Admin'e özel        → app/api/admin/  (core, personnel, ...)
"""
from fastapi import APIRouter

from app.api import auth, cdr, queue, gamification, reports, dashboard, staff
from app.api.agent import router as agent_router
from app.api.supervisor import router as supervisor_router
from app.api.admin import router as admin_router

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(cdr.router)
api_router.include_router(queue.router)
api_router.include_router(gamification.router)
api_router.include_router(reports.router)
api_router.include_router(dashboard.router)
api_router.include_router(agent_router)
api_router.include_router(supervisor_router)
api_router.include_router(admin_router)
api_router.include_router(staff.router)   # /staff/* — Personel Yönetim Merkezi
