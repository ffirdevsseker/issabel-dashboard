"""
Admin · Gamification Merkezi
─────────────────────────────
Endpoint prefix: /admin/gamification

Endpoints:
  GET    /stats                       → toplam XP, personel sayısı, bu ay XP, en iyi personel
  GET    /xp-logs                     → ?personel_id=&page=&limit=&kategori=&from=&to=
  GET    /xp-rules                    → tüm XP kuralları
  POST   /xp-rules                    → yeni kural
  PUT    /xp-rules/{id}               → kural güncelle
  PATCH  /xp-rules/{id}/toggle        → aktif/pasif değiştir
  DELETE /xp-rules/{id}               → kural sil

Tablolar:
  · xp_hareketleri  (mevcut — id, user_id, miktar, aciklama, kaynak, tarih, referans_id)
  · xp_kurallari    (bu modülde idempotent DDL ile oluşturulur — rules.py pattern'i)
  · kullanicilar    (xp, ad_soyad)
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.async_session import get_async_db
from app.api.deps import require_admin
from app.models.user import User

router = APIRouter(prefix="/admin/gamification", tags=["Admin · Gamification"])
ADMIN = require_admin


# ─── XP Kuralları DDL (idempotent) ──────────────────────────────────────────
_CREATE_XP_RULES = text("""
    CREATE TABLE IF NOT EXISTS xp_kurallari (
        id                UUID         PRIMARY KEY,
        kategori          VARCHAR(64)  NOT NULL,
        aciklama          VARCHAR(256) NOT NULL DEFAULT '',
        xp_miktari        INTEGER      NOT NULL DEFAULT 0,
        aktif             BOOLEAN      NOT NULL DEFAULT TRUE,
        olusturma_tarihi  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        guncelleme_tarihi TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
""")

# İlk açılışta varsayılan kuralları ekle (idempotent — kategori unique varsayımı yok,
# bu yüzden sadece tablo boşsa yüklenir)
_SEED_DEFAULTS = text("""
    INSERT INTO xp_kurallari (id, kategori, aciklama, xp_miktari, aktif)
    SELECT * FROM (VALUES
        (gen_random_uuid(), 'cagri_cevaplama',    'Çağrı cevaplandığında',          5,  TRUE),
        (gen_random_uuid(), 'csat_yuksek',        'CSAT skoru 4-5 alındığında',     15, TRUE),
        (gen_random_uuid(), 'csat_dusuk',         'CSAT skoru 1-2 alındığında',    -10, TRUE),
        (gen_random_uuid(), 'sikayet_olustu',     'Hakkında şikayet oluştuğunda',  -20, TRUE),
        (gen_random_uuid(), 'sikayet_red',        'Şikayet reddedildiğinde (iade)', 20, TRUE),
        (gen_random_uuid(), 'gec_giris',          'Vardiyaya geç giriş',            -5, TRUE),
        (gen_random_uuid(), 'mola_asimi',         'Mola süresi aşımı',              -8, TRUE),
        (gen_random_uuid(), 'manuel',             'Admin tarafından manuel düzeltme', 0, TRUE)
    ) AS t(id, kategori, aciklama, xp_miktari, aktif)
    WHERE NOT EXISTS (SELECT 1 FROM xp_kurallari)
""")

_TABLE_READY: bool = False


async def _ensure(db: AsyncSession) -> None:
    global _TABLE_READY
    if _TABLE_READY:
        return
    await db.execute(_CREATE_XP_RULES)
    try:
        await db.execute(_SEED_DEFAULTS)
    except Exception:
        # gen_random_uuid pgcrypto gerektirir; yoksa seed atlanır, kullanıcı UI'dan ekler
        await db.rollback()
    await db.commit()
    _TABLE_READY = True


# ─── Pydantic ───────────────────────────────────────────────────────────────
class XpRuleBody(BaseModel):
    kategori:   str
    aciklama:   Optional[str] = ""
    xp_miktari: int
    aktif:      bool = True


class XpRuleToggle(BaseModel):
    aktif: bool


def _rule_dict(r) -> dict:
    return {
        "id":                str(r.id),
        "kategori":          r.kategori,
        "aciklama":          r.aciklama or "",
        "xp_miktari":        int(r.xp_miktari or 0),
        "aktif":             bool(r.aktif),
        "olusturma_tarihi":  r.olusturma_tarihi.isoformat()  if r.olusturma_tarihi  else None,
        "guncelleme_tarihi": r.guncelleme_tarihi.isoformat() if r.guncelleme_tarihi else None,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 1. STATS — Özet kartları
# ═══════════════════════════════════════════════════════════════════════════════
@router.get("/stats")
async def gamification_stats(
    db: AsyncSession = Depends(get_async_db),
    _:  User         = Depends(ADMIN),
):
    """
    Sayfa üstünde gösterilen özet kartları:
      - toplam_personel  : aktif personel sayısı (rol=personel)
      - toplam_xp        : tüm personel XP toplamı
      - bu_ay_xp         : bu ay xp_hareketleri toplam pozitif kazanım
      - bu_ay_lider      : bu ay en çok XP kazanan personel
    """
    # `roller` tablosundan role adıyla süzülür — hardcoded rol_id'ye bağımlı değil.
    row = (await db.execute(text("""
        SELECT
            COUNT(*) FILTER (
                WHERE u.silindi_mi = FALSE AND LOWER(r.ad) = 'personel'
            ) AS toplam_personel,
            COALESCE(SUM(u.xp) FILTER (WHERE u.silindi_mi = FALSE), 0)::bigint AS toplam_xp
        FROM kullanicilar u
        LEFT JOIN roller r ON r.id = u.rol_id
    """))).fetchone()

    bu_ay = (await db.execute(text("""
        SELECT COALESCE(SUM(miktar) FILTER (WHERE miktar > 0), 0)::bigint AS bu_ay_xp
        FROM xp_hareketleri
        WHERE tarih >= date_trunc('month', NOW())
    """))).fetchone()

    lider = (await db.execute(text("""
        SELECT
            u.id::text                AS id,
            COALESCE(u.ad_soyad, u.kullanici_adi) AS ad_soyad,
            u.dahili_no               AS dahili_no,
            SUM(xh.miktar)::bigint    AS kazanilan_xp
        FROM xp_hareketleri xh
        JOIN kullanicilar u ON u.id = xh.user_id
        WHERE xh.tarih >= date_trunc('month', NOW())
          AND xh.miktar > 0
          AND u.silindi_mi = FALSE
        GROUP BY u.id, u.ad_soyad, u.kullanici_adi, u.dahili_no
        ORDER BY kazanilan_xp DESC
        LIMIT 1
    """))).fetchone()

    return {
        "toplam_personel": int(row.toplam_personel or 0),
        "toplam_xp":       int(row.toplam_xp or 0),
        "bu_ay_xp":        int(bu_ay.bu_ay_xp or 0),
        "bu_ay_lider":     {
            "id":           lider.id,
            "ad_soyad":     lider.ad_soyad,
            "dahili_no":    lider.dahili_no,
            "kazanilan_xp": int(lider.kazanilan_xp),
        } if lider else None,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 2. XP LOGS — xp_hareketleri (filtreli + sayfalı)
# ═══════════════════════════════════════════════════════════════════════════════
@router.get("/xp-logs")
async def xp_logs(
    personel_id: Optional[str] = Query(None),
    kategori:    Optional[str] = Query(None),  # xp_hareketleri.kaynak ile eşleşir
    from_date:   Optional[str] = Query(None),  # ISO yyyy-mm-dd
    to_date:     Optional[str] = Query(None),
    page:        int            = Query(1,  ge=1),
    limit:       int            = Query(20, ge=1, le=100),
    db: AsyncSession             = Depends(get_async_db),
    _:  User                     = Depends(ADMIN),
):
    """
    XP hareketlerinin filtrelenebilir log'u. Personel ad bilgisi ile join'li döner.
    """
    where = []
    params: dict = {}
    if personel_id:
        where.append("xh.user_id = CAST(:pid AS uuid)")
        params["pid"] = personel_id
    if kategori:
        where.append("xh.kaynak = :kat")
        params["kat"] = kategori
    if from_date:
        where.append("xh.tarih >= CAST(:fd AS timestamptz)")
        params["fd"] = from_date
    if to_date:
        where.append("xh.tarih <= CAST(:td AS timestamptz) + INTERVAL '1 day'")
        params["td"] = to_date

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    # Toplam sayım
    total_row = (await db.execute(
        text(f"SELECT COUNT(*)::int AS n FROM xp_hareketleri xh {where_sql}"),
        params,
    )).fetchone()
    total = int(total_row.n or 0)

    # Sayfa
    params["lim"] = limit
    params["off"] = (page - 1) * limit

    rows = (await db.execute(text(f"""
        SELECT
            xh.id::text       AS id,
            xh.user_id::text  AS personel_id,
            COALESCE(u.ad_soyad, u.kullanici_adi) AS personel_adi,
            u.dahili_no       AS dahili_no,
            xh.miktar         AS miktar,
            COALESCE(xh.kaynak, 'manuel')  AS kategori,
            COALESCE(xh.aciklama, '')      AS aciklama,
            xh.tarih          AS created_at,
            xh.referans_id::text AS referans_id
        FROM xp_hareketleri xh
        LEFT JOIN kullanicilar u ON u.id = xh.user_id
        {where_sql}
        ORDER BY xh.tarih DESC
        LIMIT :lim OFFSET :off
    """), params)).fetchall()

    # Kategori listesi (filtre dropdown için)
    cats = (await db.execute(text(
        "SELECT DISTINCT COALESCE(kaynak, 'manuel') AS k FROM xp_hareketleri ORDER BY k"
    ))).fetchall()

    return {
        "data": [
            {
                "id":           r.id,
                "personel_id":  r.personel_id,
                "personel_adi": r.personel_adi or "—",
                "dahili_no":    r.dahili_no,
                "miktar":       int(r.miktar or 0),
                "kategori":     r.kategori,
                "aciklama":     r.aciklama,
                "created_at":   r.created_at.isoformat() if r.created_at else None,
                "referans_id":  r.referans_id,
            }
            for r in rows
        ],
        "total":      total,
        "page":       page,
        "limit":      limit,
        "kategoriler": [c.k for c in cats],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 3. XP RULES — CRUD
# ═══════════════════════════════════════════════════════════════════════════════
@router.get("/xp-rules")
async def list_xp_rules(
    db: AsyncSession = Depends(get_async_db),
    _:  User         = Depends(ADMIN),
):
    await _ensure(db)
    rows = (await db.execute(
        text("SELECT * FROM xp_kurallari ORDER BY xp_miktari DESC, olusturma_tarihi DESC")
    )).fetchall()
    return [_rule_dict(r) for r in rows]


@router.post("/xp-rules", status_code=status.HTTP_201_CREATED)
async def create_xp_rule(
    body: XpRuleBody,
    db:   AsyncSession = Depends(get_async_db),
    _:    User         = Depends(ADMIN),
):
    await _ensure(db)
    new_id = str(uuid.uuid4())
    row = (await db.execute(text("""
        INSERT INTO xp_kurallari (id, kategori, aciklama, xp_miktari, aktif)
        VALUES (CAST(:id AS uuid), :kat, :ack, :xp, :aktif)
        RETURNING *
    """), {
        "id":    new_id,
        "kat":   body.kategori,
        "ack":   body.aciklama or "",
        "xp":    body.xp_miktari,
        "aktif": body.aktif,
    })).fetchone()
    await db.commit()
    return _rule_dict(row)


@router.put("/xp-rules/{rule_id}")
async def update_xp_rule(
    rule_id: str,
    body:    XpRuleBody,
    db:      AsyncSession = Depends(get_async_db),
    _:       User         = Depends(ADMIN),
):
    await _ensure(db)
    row = (await db.execute(text("""
        UPDATE xp_kurallari
        SET
            kategori          = :kat,
            aciklama          = :ack,
            xp_miktari        = :xp,
            aktif             = :aktif,
            guncelleme_tarihi = NOW()
        WHERE id = CAST(:id AS uuid)
        RETURNING *
    """), {
        "id":    rule_id,
        "kat":   body.kategori,
        "ack":   body.aciklama or "",
        "xp":    body.xp_miktari,
        "aktif": body.aktif,
    })).fetchone()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kural bulunamadı")
    await db.commit()
    return _rule_dict(row)


@router.patch("/xp-rules/{rule_id}/toggle")
async def toggle_xp_rule(
    rule_id: str,
    body:    XpRuleToggle,
    db:      AsyncSession = Depends(get_async_db),
    _:       User         = Depends(ADMIN),
):
    await _ensure(db)
    row = (await db.execute(text("""
        UPDATE xp_kurallari
        SET aktif = :aktif, guncelleme_tarihi = NOW()
        WHERE id = CAST(:id AS uuid)
        RETURNING *
    """), {"id": rule_id, "aktif": body.aktif})).fetchone()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kural bulunamadı")
    await db.commit()
    return _rule_dict(row)


@router.delete("/xp-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_xp_rule(
    rule_id: str,
    db:      AsyncSession = Depends(get_async_db),
    _:       User         = Depends(ADMIN),
):
    await _ensure(db)
    res = await db.execute(
        text("DELETE FROM xp_kurallari WHERE id = CAST(:id AS uuid) RETURNING id"),
        {"id": rule_id},
    )
    if not res.fetchone():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kural bulunamadı")
    await db.commit()
