"""
Admin · Otomasyon Kuralları (CRUD)
────────────────────────────────────
GET    /admin/rules              → tüm kurallar
POST   /admin/rules              → yeni kural oluştur
PUT    /admin/rules/{id}         → kural güncelle
PATCH  /admin/rules/{id}/toggle  → aktif/pasif değiştir
DELETE /admin/rules/{id}         → kural sil

Tablo: otomasyon_kurallari (CREATE TABLE IF NOT EXISTS — ilk çağrıda oluşturulur)
"""
from __future__ import annotations

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

# ─── DDL — idempotent ─────────────────────────────────────────────────────────
_CREATE = text("""
    CREATE TABLE IF NOT EXISTS otomasyon_kurallari (
        id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
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


async def _ensure(db: AsyncSession) -> None:
    await db.execute(_CREATE)
    await db.commit()


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
    row = (await db.execute(text("""
        INSERT INTO otomasyon_kurallari
            (ad, kosul_tipi, kosul_degeri, aksiyon_tipi, aksiyon_degeri, aktif)
        VALUES (:ad, :kt, :kd, :at, :av, :aktif)
        RETURNING *
    """), {
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
