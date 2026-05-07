import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import api_router
from app.db.health import check_db_connection
from app.db.session import engine, Base
from app.db.init_db import seed_db
import app.models  # noqa: F401

app = FastAPI(
    title="Issabel Dashboard API",
    version="0.1.0",
)

logger = logging.getLogger(__name__)

@app.on_event("startup")
async def on_startup():
    try:
        # Senkron engine ile tabloları oluştur
        Base.metadata.create_all(bind=engine)
        # Asenkron seeding yap
        await seed_db()
    except Exception as exc:
        logger.warning("Database setup failed", exc_info=exc)


@app.on_event("startup")
async def on_startup_db_check():
    await check_db_connection(raise_on_fail=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
def root():
    return {"status": "ok", "service": "Issabel Dashboard API"}


@app.get("/health")
def health():
    return {"status": "healthy"}