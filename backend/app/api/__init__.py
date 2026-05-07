from fastapi import APIRouter

from app.api import auth, cdr, queue, gamification, reports, admin, dashboard
from app.api.agent import router as agent_router
from app.api.supervisor import router as supervisor_router

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(cdr.router)
api_router.include_router(queue.router)
api_router.include_router(gamification.router)
api_router.include_router(reports.router)
api_router.include_router(agent_router)
api_router.include_router(supervisor_router)
api_router.include_router(admin.router)
api_router.include_router(dashboard.router)
