from fastapi import APIRouter

from app.api.agent import kb

router = APIRouter()
router.include_router(kb.router)
