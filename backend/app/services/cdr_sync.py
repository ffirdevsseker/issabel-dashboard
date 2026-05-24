"""
backend/app/services/cdr_sync.py
──────────────────────────────────
Issabel MariaDB asteriskcdrdb.cdr → PostgreSQL cagri_kayitlari sync servisi.

Her 30 saniyede bir son sync zamanından sonraki kayıtları çeker ve
asterisk_id UNIQUE kısıtı sayesinde çakışmaları sessizce atlar.
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

import pymysql
import pymysql.cursors
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.core.config import settings
from app.db.async_session import AsyncSessionLocal
from app.models.cdr import CDR
from app.models.user import User

logger = logging.getLogger(__name__)

# İlk çalışmada son 1 saatin CDR'larını al
_last_sync: datetime = datetime.now(timezone.utc) - timedelta(hours=1)

# dahili_no → UUID önbelleği (listener ile ayrı, bu servis kendi önbelleğini tutar)
_ext_cache: dict[str, Optional[uuid.UUID]] = {}

_DISPOSITION_MAP: dict[str, str] = {
    "ANSWERED":  "cevaplandi",
    "NO ANSWER": "cevaplanmadi",
    "BUSY":      "mesgul",
    "FAILED":    "cevaplanmadi",
}

_GELEN_DCONTEXTS = {"from-pstn", "from-trunk", "from-sip-external", "from-did", "from-provider"}


def _map_yon(dcontext: str) -> str:
    dc = dcontext.lower().strip()
    if dc in _GELEN_DCONTEXTS or "pstn" in dc or "trunk" in dc or "provider" in dc:
        return "gelen"
    if "internal" in dc:
        return "giden"
    return "gelen"


def _fetch_new_cdrs(since: datetime) -> list[dict]:
    """
    Senkron MariaDB sorgusu — asyncio.to_thread ile çalıştırılır.

    Aynı uniqueid'ye sahip birden fazla satır varsa (örn. kuyruk kanalları
    tek çağrı için N satır üretir) ROW_NUMBER() window function ile
    billsec en yüksek olanı, eşitlik durumunda calldate en erkeni seçilir.
    """
    since_naive = since.replace(tzinfo=None)  # MariaDB DATETIME timezone bilgisi taşımaz
    conn = pymysql.connect(
        host=settings.MARIADB_HOST,
        user=settings.MARIADB_USER,
        password=settings.MARIADB_PASSWORD,
        database=settings.MARIADB_DB,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,
        connect_timeout=5,
    )
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM (
                    SELECT *,
                           ROW_NUMBER() OVER (
                               PARTITION BY uniqueid
                               ORDER BY billsec DESC, calldate ASC
                           ) AS rn
                    FROM cdr
                    WHERE calldate > %s
                ) ranked
                WHERE rn = 1
                ORDER BY calldate ASC
                LIMIT 500
                """,
                (since_naive,),
            )
            rows = cur.fetchall()
            # rn sütununu temizle — CDR modelinde karşılığı yok
            for row in rows:
                row.pop("rn", None)
            return rows
    finally:
        conn.close()


async def _resolve_user_id(extension: str) -> Optional[uuid.UUID]:
    if not extension:
        return None
    if extension in _ext_cache:
        return _ext_cache[extension]
    try:
        async with AsyncSessionLocal() as db:
            uid: Optional[uuid.UUID] = await db.scalar(
                select(User.id).where(User.dahili_no == extension).limit(1)
            )
            _ext_cache[extension] = uid
            return uid
    except Exception as exc:
        logger.warning("Extension %s → user_id çözümlenemedi: %s", extension, exc)
        return None


async def _sync_batch(rows: list[dict]) -> int:
    """Çekilen satırları PostgreSQL'e yazar, kaç satır yazıldığını döner."""
    if not rows:
        return 0

    written = 0
    async with AsyncSessionLocal() as db:
        for row in rows:
            uniqueid = str(row.get("uniqueid") or "").strip()
            if not uniqueid:
                continue

            disposition = (row.get("disposition") or "").upper().strip()
            durum = _DISPOSITION_MAP.get(disposition, "cevaplanmadi")

            dcontext = str(row.get("dcontext") or "")
            yon = _map_yon(dcontext)

            src = str(row.get("src") or "").strip()
            user_id = await _resolve_user_id(src)

            calldate: Optional[datetime] = row.get("calldate")
            if calldate is None:
                start = datetime.now(timezone.utc)
            elif calldate.tzinfo is None:
                start = calldate.replace(tzinfo=timezone(timedelta(hours=3)))
            else:
                start = calldate

            duration = int(row.get("duration") or 0)
            billsec  = int(row.get("billsec") or 0)
            konusma  = billsec
            bekleme  = max(0, duration - billsec)
            end      = start + timedelta(seconds=duration)

            recording = str(row.get("recordingfile") or "").strip() or None

            stmt = pg_insert(CDR.__table__).values(
                id               = uuid.uuid4(),
                asterisk_id      = uniqueid,
                user_id          = user_id,
                yon              = yon,
                durum            = durum,
                kategori         = None,
                baslangic_zamani = start,
                bitis_zamani     = end,
                konusma_suresi   = konusma,
                bekleme_suresi   = bekleme,
                ses_kaydi_url    = recording,
                ivr_yolu         = None,
            ).on_conflict_do_nothing(index_elements=["asterisk_id"])
            await db.execute(stmt)
            written += 1

        await db.commit()

    return written


async def start_cdr_sync() -> None:
    global _last_sync

    if not settings.MARIADB_PASSWORD:
        logger.warning(
            "MARIADB_PASSWORD boş — CDR sync devre dışı. "
            ".env dosyasına veya ortam değişkenlerine MariaDB şifresini ekleyin."
        )
        return

    logger.info(
        "CDR sync servisi başladı (her 5s, MariaDB %s/%s → PostgreSQL).",
        settings.MARIADB_HOST, settings.MARIADB_DB,
    )

    while True:
        await asyncio.sleep(5)
        try:
            since = _last_sync
            rows: list[dict] = await asyncio.to_thread(_fetch_new_cdrs, since)

            if rows:
                written = await _sync_batch(rows)
                logger.info(
                    "CDR sync: %d/%d satır yazıldı (since=%s)",
                    written, len(rows), since.strftime("%H:%M:%S"),
                )
                # Son gelen satırın zamanını kullan — sabit 30s pencere yerine
                # kesin sınır takibi yapar ve yeniden başlatma sonrası da güvenli çalışır
                last_calldate: Optional[datetime] = rows[-1].get("calldate")
                if last_calldate:
                    if last_calldate.tzinfo is None:
                        last_calldate = last_calldate.replace(tzinfo=timezone.utc)
                    _last_sync = last_calldate
                else:
                    _last_sync = datetime.now(timezone.utc)
            else:
                logger.debug("CDR sync: yeni kayıt yok.")

        except pymysql.Error as exc:
            logger.error("CDR sync MariaDB hatası: %s", exc)
        except Exception as exc:
            logger.error("CDR sync hatası: %s", exc, exc_info=True)
