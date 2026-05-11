"""
Admin · Otomasyon Kuralları (CRUD)
────────────────────────────────────
GET    /admin/rules              → tüm kurallar
POST   /admin/rules              → yeni kural oluştur
PUT    /admin/rules/{id}         → kural güncelle
PATCH  /admin/rules/{id}/toggle  → aktif/pasif değiştir
DELETE /admin/rules/{id}         → kural sil

Tablo: otomasyon_kurallari (CREATE TABLE IF NOT EXISTS — ilk sunucu başlatılışında oluşturulur)

Not:
  · UUID Python tarafında (uuid.uuid4) üretilir — gen_random_uuid() / pgcrypto bağımlılığı yok.
  · _TABLE_READY bayrağı: DDL her istekte değil yalnızca ilk kez çalışır.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.db.async_session import get_async_db
from app.api.deps import require_admin
from app.models.user import User

router = APIRouter(prefix="/admin/rules", tags=["Admin · Otomasyon"])
ADMIN = require_admin

# ─── DDL — idempotent (UUID default YOK — Python tarafından sağlanır) ──────────
_CREATE = text("""
    CREATE TABLE IF NOT EXISTS otomasyon_kurallari (
        id                UUID         PRIMARY KEY,
        ad                VARCHAR(128) NOT NULL,
        kosul_tipi        VARCHAR(64)  NOT NULL,
        kosul_degeri      NUMERIC      NOT NULL DEFAULT 0,
        aksiyon_tipi      VARCHAR(64)  NOT NULL,
        aksiyon_degeri    VARCHAR(256) NOT NULL DEFAULT '',
        aktif             BOOLEAN      NOT NULL DEFAULT TRUE,
        olusturma_tarihi  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        guncelleme_tarihi TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
""")

# Kural tetiklenme logu — scheduler/worker bu tabloya yazacak (henüz yazıcı yok)
_CREATE_HISTORY = text("""
    CREATE TABLE IF NOT EXISTS kural_tetiklenmeleri (
        id               UUID         PRIMARY KEY,
        kural_id         UUID         NOT NULL REFERENCES otomasyon_kurallari(id) ON DELETE CASCADE,
        tetiklenme_zamani TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        kosul_anlik_deger NUMERIC,
        aksiyon_ozeti    VARCHAR(512) NOT NULL DEFAULT '',
        etkilenen_sayi   INTEGER      NOT NULL DEFAULT 0,
        basarili         BOOLEAN      NOT NULL DEFAULT TRUE,
        detay            JSONB
    )
""")
_CREATE_HIST_IDX = text("""
    CREATE INDEX IF NOT EXISTS ix_kural_tetik_zaman
        ON kural_tetiklenmeleri (kural_id, tetiklenme_zamani DESC)
""")

# DDL her process'te yalnızca bir kez çalışır
_TABLE_READY: bool = False


async def _ensure(db: AsyncSession) -> None:
    global _TABLE_READY
    if _TABLE_READY:
        return
    await db.execute(_CREATE)
    await db.execute(_CREATE_HISTORY)
    await db.execute(_CREATE_HIST_IDX)
    await db.commit()
    _TABLE_READY = True


# ─── Pydantic ─────────────────────────────────────────────────────────────────
class RuleBody(BaseModel):
    ad:             str
    kosul_tipi:     str
    kosul_degeri:   float
    aksiyon_tipi:   str
    aksiyon_degeri: Optional[str] = ""
    aktif:          bool = True


class ToggleBody(BaseModel):
    aktif: bool


# ─── Helper ───────────────────────────────────────────────────────────────────
def _to_dict(r) -> dict:
    return {
        "id":               str(r.id),
        "ad":               r.ad,
        "kosul_tipi":       r.kosul_tipi,
        "kosul_degeri":     float(r.kosul_degeri or 0),
        "aksiyon_tipi":     r.aksiyon_tipi,
        "aksiyon_degeri":   r.aksiyon_degeri or "",
        "aktif":            bool(r.aktif),
        "olusturma_tarihi":  r.olusturma_tarihi.isoformat()  if r.olusturma_tarihi  else None,
        "guncelleme_tarihi": r.guncelleme_tarihi.isoformat() if r.guncelleme_tarihi else None,
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────
@router.get("")
async def list_rules(
    db: AsyncSession = Depends(get_async_db),
    _:  User         = Depends(ADMIN),
):
    await _ensure(db)
    rows = (await db.execute(
        text("SELECT * FROM otomasyon_kurallari ORDER BY olusturma_tarihi DESC")
    )).fetchall()
    return [_to_dict(r) for r in rows]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_rule(
    body: RuleBody,
    db:   AsyncSession = Depends(get_async_db),
    _:    User         = Depends(ADMIN),
):
    await _ensure(db)
    new_id = str(uuid.uuid4())
    row = (await db.execute(text("""
        INSERT INTO otomasyon_kurallari
            (id, ad, kosul_tipi, kosul_degeri, aksiyon_tipi, aksiyon_degeri, aktif)
        VALUES (CAST(:id AS uuid), :ad, :kt, :kd, :at, :av, :aktif)
        RETURNING *
    """), {
        "id":    new_id,
        "ad":    body.ad,
        "kt":    body.kosul_tipi,
        "kd":    body.kosul_degeri,
        "at":    body.aksiyon_tipi,
        "av":    body.aksiyon_degeri or "",
        "aktif": body.aktif,
    })).fetchone()
    await db.commit()
    return _to_dict(row)


@router.put("/{rule_id}")
async def update_rule(
    rule_id: str,
    body:    RuleBody,
    db:      AsyncSession = Depends(get_async_db),
    _:       User         = Depends(ADMIN),
):
    row = (await db.execute(text("""
        UPDATE otomasyon_kurallari
        SET
            ad                = :ad,
            kosul_tipi        = :kt,
            kosul_degeri      = :kd,
            aksiyon_tipi      = :at,
            aksiyon_degeri    = :av,
            aktif             = :aktif,
            guncelleme_tarihi = NOW()
        WHERE id = :id::uuid
        RETURNING *
    """), {
        "id":    rule_id,
        "ad":    body.ad,
        "kt":    body.kosul_tipi,
        "kd":    body.kosul_degeri,
        "at":    body.aksiyon_tipi,
        "av":    body.aksiyon_degeri or "",
        "aktif": body.aktif,
    })).fetchone()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kural bulunamadı")
    await db.commit()
    return _to_dict(row)


@router.patch("/{rule_id}/toggle")
async def toggle_rule(
    rule_id: str,
    body:    ToggleBody,
    db:      AsyncSession = Depends(get_async_db),
    _:       User         = Depends(ADMIN),
):
    row = (await db.execute(text("""
        UPDATE otomasyon_kurallari
        SET aktif = :aktif, guncelleme_tarihi = NOW()
        WHERE id = :id::uuid
        RETURNING *
    """), {"id": rule_id, "aktif": body.aktif})).fetchone()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kural bulunamadı")
    await db.commit()
    return _to_dict(row)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: str,
    db:      AsyncSession = Depends(get_async_db),
    _:       User         = Depends(ADMIN),
):
    res = await db.execute(
        text("DELETE FROM otomasyon_kurallari WHERE id = :id::uuid RETURNING id"),
        {"id": rule_id},
    )
    if not res.fetchone():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kural bulunamadı")
    await db.commit()


# ─── Tetiklenme Geçmişi ──────────────────────────────────────────────────────
# Not: kural_tetiklenmeleri tablosu kurulu; gerçek scheduler/worker bu tabloya
# yazdığında geçmiş otomatik dolar. Şu an boş ise UI "henüz tetiklenme yok" gösterir.

def _hist_dict(r) -> dict:
    return {
        "id":                str(r.id),
        "kural_id":          str(r.kural_id),
        "kural_ad":          getattr(r, "kural_ad", None),
        "tetiklenme_zamani": r.tetiklenme_zamani.isoformat() if r.tetiklenme_zamani else None,
        "kosul_anlik_deger": float(r.kosul_anlik_deger) if r.kosul_anlik_deger is not None else None,
        "aksiyon_ozeti":     r.aksiyon_ozeti or "",
        "etkilenen_sayi":    int(r.etkilenen_sayi or 0),
        "basarili":          bool(r.basarili),
    }


@router.get("/history")
async def list_recent_history(
    limit: int = 50,
    db:    AsyncSession = Depends(get_async_db),
    _:     User         = Depends(ADMIN),
):
    """Son tetiklenmeler (tüm kurallar, en yeniden eskiye)."""
    await _ensure(db)
    limit = max(1, min(limit, 200))
    rows = (await db.execute(text("""
        SELECT
            kt.id, kt.kural_id, kt.tetiklenme_zamani,
            kt.kosul_anlik_deger, kt.aksiyon_ozeti,
            kt.etkilenen_sayi, kt.basarili,
            ok.ad AS kural_ad
        FROM kural_tetiklenmeleri kt
        LEFT JOIN otomasyon_kurallari ok ON ok.id = kt.kural_id
        ORDER BY kt.tetiklenme_zamani DESC
        LIMIT :lim
    """), {"lim": limit})).fetchall()
    return [_hist_dict(r) for r in rows]


@router.get("/{rule_id}/history")
async def list_rule_history(
    rule_id: str,
    limit:   int = 20,
    db:      AsyncSession = Depends(get_async_db),
    _:       User         = Depends(ADMIN),
):
    """Tek bir kurala ait tetiklenme geçmişi."""
    await _ensure(db)
    limit = max(1, min(limit, 100))
    rows = (await db.execute(text("""
        SELECT
            kt.id, kt.kural_id, kt.tetiklenme_zamani,
            kt.kosul_anlik_deger, kt.aksiyon_ozeti,
            kt.etkilenen_sayi, kt.basarili,
            ok.ad AS kural_ad
        FROM kural_tetiklenmeleri kt
        LEFT JOIN otomasyon_kurallari ok ON ok.id = kt.kural_id
        WHERE kt.kural_id = CAST(:rid AS uuid)
        ORDER BY kt.tetiklenme_zamani DESC
        LIMIT :lim
    """), {"rid": rule_id, "lim": limit})).fetchall()
    return [_hist_dict(r) for r in rows]
