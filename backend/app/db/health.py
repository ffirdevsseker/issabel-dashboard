import logging
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import text

from app.db.async_session import async_engine


logger = logging.getLogger(__name__)


async def check_db_connection(raise_on_fail: bool = True) -> bool:
    last_exc: Optional[Exception] = None

    for attempt in range(2):
        try:
            async with async_engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            return True
        except Exception as exc:
            last_exc = exc
            if attempt == 0:
                try:
                    await async_engine.dispose()
                except Exception as dispose_exc:
                    logger.warning("Failed to dispose async engine", exc_info=dispose_exc)

    logger.warning("Database connection check failed", exc_info=last_exc)
    if raise_on_fail:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Veritabani baglantisi yok. Lutfen daha sonra tekrar deneyin.",
        )
    return False
