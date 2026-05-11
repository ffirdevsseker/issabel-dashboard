from fastapi import APIRouter

from app.api.agent import kb, stats

router = APIRouter()
router.include_router(kb.router)
router.include_router(stats.router)
