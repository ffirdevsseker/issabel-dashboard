from fastapi import APIRouter

from app.api.supervisor import approvals, shifts, breaks

router = APIRouter(prefix="/supervisor", tags=["Supervisor"])
router.include_router(approvals.router)
router.include_router(shifts.router)
router.include_router(breaks.router)
