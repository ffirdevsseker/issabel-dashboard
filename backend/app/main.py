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
        # Senkron engine ile tabloları oluştur — eksik tabloları (örn. callback_takip) ekler
        Base.metadata.create_all(bind=engine)
        created_tables = sorted(Base.metadata.tables.keys())
        logger.info("DB tabloları hazır (%d tane): %s", len(created_tables), ", ".join(created_tables[:8]) + ("..." if len(created_tables) > 8 else ""))
        # Asenkron seeding yap
        await seed_db()
    except Exception as exc:
        logger.error("Uygulama başlangıcında DB kurulumu başarısız — login çalışmayabilir", exc_info=exc)


@app.on_event("startup")
async def on_startup_db_check():
    await check_db_connection(raise_on_fail=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
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