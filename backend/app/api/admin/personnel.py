"""
Admin · Personel Yönetimi (V3 Komuta Modeli)
────────────────────────────────────────────
Müşteri Hizmetleri departmanı personellerinin yönetildiği tek admin sayfası.

ŞEMA NOTLARI (sporthink_schema_v2.sql):
  · kullanicilar : NO `email`. departman_id NOT NULL, ekip_id NULL olabilir.
                   anlik_durum/sip_durumu ENUM (cast::text gerekir).
  · v_personel_anlik : kullanıcı id kolonu `id` (NOT user_id).
                        sip_durumu/anlik_durum ENUM → karşılaştırırken ::text cast.
  · molalar : planlanan_sure_dk row'da var, mola_turleri tablosu YOK.
  · xp_hareketleri : (user_id, miktar, kaynak, referans_id, aciklama, tarih)
                     kaynak ENUM-CHECK: 'duzeltme' = admin override için.
                     'sebep' YOK → 'aciklama' kullan.
                     'olusturan_id' YOK.
  · personel_oturum_loglari : login_zamani, logout_zamani (NOT cikis_zamani).
  · denetim_izleri : (user_id, aksiyon, tablo_adi, kayit_id, eski_deger, yeni_deger, ip_adresi, tarih)
                     aksiyon ENUM: 'override', 'xp_correction', 'create', 'update', 'delete'.
"""
from __future__ import annotations

import json
import uuid
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.async_session import get_async_db
from app.api.deps import require_admin
from app.models.user import User
from app.core.security import hash_password

router = APIRouter(prefix="/admin/personnel", tags=["Admin · Personel V3"])
ADMIN = require_admin


# ─── Sayfa kapsamı: hangi departman izlenecek (Müşteri Hizmetleri) ──────────
DEPARTMENT_FILTER_NAME = "Müşteri Hizmetleri"

# Bu sayfada gösterilen roller — backend hard-limit
SCOPE_ROLES = ("personel", "supervisor")

# "MH kapsamındaki kullanıcı" SQL koşulu:
#   · departman_id doğrudan Müşteri Hizmetleri  (personeller, MH'a bağlı supervizörler)
#   · VEYA supervisor_ekip üzerinden MH'a ait bir ekibi yönetiyor (dış supervizörler)
#   · VEYA rolü supervisor + tüm MH ekiplerini görmek istiyoruz (ekip ataması yoksa bile)
MH_SCOPE_CLAUSE = """
    (
        d.ad = :dept
        OR EXISTS (
            SELECT 1
            FROM supervisor_ekip se
            JOIN ekipler          ek ON ek.id = se.ekip_id
            JOIN departmanlar     dd ON dd.id = ek.departman_id
            WHERE se.supervisor_id = u.id
              AND dd.ad = :dept
        )
    )
"""


# ─── kilitli kolonu DDL (safe — IF NOT EXISTS) ───────────────────────────────
_KILITLI_ENSURED: bool = False


async def _ensure_kilitli_col(db: AsyncSession) -> None:
    """
    kullanicilar.kilitli kolonu yoksa ekler.
    SAVEPOINT pattern: asyncpg'de DDL hatası session'ı bozar; ROLLBACK TO
    SAVEPOINT ile kurtarırız ve flag'i FALSE bırakırız (bir sonraki istekte tekrar dener).
    """
    global _KILITLI_ENSURED
    if _KILITLI_ENSURED:
        return
    try:
        await db.execute(text("SAVEPOINT _klt_sp"))
        await db.execute(text(
            "ALTER TABLE kullanicilar "
            "ADD COLUMN IF NOT EXISTS kilitli BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        await db.execute(text("RELEASE SAVEPOINT _klt_sp"))
        await db.commit()
        _KILITLI_ENSURED = True
    except Exception:
        try:
            await db.execute(text("ROLLBACK TO SAVEPOINT _klt_sp"))
        except Exception:
            pass


# ═══════════════════════════ Pydantic ════════════════════════════════════════

class EndBreakBody(BaseModel):
    user_id: str
    sebep: Optional[str] = "Admin override · molayı zorla bitir"


class ManualXpBody(BaseModel):
    user_id: str
    delta:   int
    # Sprint 7-C: manuel XP müdahaleleri için "Neden" zorunlu (min 3 karakter, max 256)
    sebep:   str = Field(..., min_length=3, max_length=256)
    referans_id: Optional[str] = None


class UpdatePersonnelBody(BaseModel):
    rol:       Optional[str] = None   # "personel" | "supervisor"
    ekip_id:   Optional[str] = None   # UUID string or "" → NULL
    dahili_no: Optional[str] = None   # extension; "" → NULL


class CreatePersonnelBody(BaseModel):
    ad_soyad:     str
    kullanici_adi: str
    dahili_no:    Optional[str] = None
    rol:          str  # "personel" | "supervisor"
    ekip_id:      Optional[str] = None
    sifre:        str


class ResetPasswordBody(BaseModel):
    yeni_sifre: str


class LockBody(BaseModel):
    kilitli: bool


# ═══════════════════════════ Audit Helper ════════════════════════════════════

async def _audit(
    db: AsyncSession, admin_id: str, tablo: str, kayit_id: Optional[str],
    aksiyon: str, eski: dict, yeni: dict,
) -> None:
    """
    denetim_izleri'ne JSONB ile kaydeder.

    SAVEPOINT kullanır: asyncpg'de try/except içindeki bir DB hatası connection'ı
    "error state"'e alır; sonraki db.commit() da başarısız olur.
    SAVEPOINT → ROLLBACK TO SAVEPOINT ile session state korunur.
    """
    eski_json = json.dumps(eski, default=str, ensure_ascii=False)
    yeni_json = json.dumps(yeni, default=str, ensure_ascii=False)

    # İki olası şema versiyonu sırayla denenir; SAVEPOINT her biri izole eder.
    _INSERT_ATTEMPTS = [
        # Şema B (yeni): user_id, aksiyon, tablo_adi, kayit_id, eski_deger, yeni_deger, tarih
        ("""INSERT INTO denetim_izleri
                (user_id, aksiyon, tablo_adi, kayit_id, eski_deger, yeni_deger, tarih)
            VALUES
                (CAST(:uid AS uuid), :aks, :tablo, :kid,
                 CAST(:eski AS json), CAST(:yeni AS json), NOW())""",
         {"uid": admin_id, "aks": aksiyon, "tablo": tablo,
          "kid": kayit_id or "", "eski": eski_json, "yeni": yeni_json}),
        # Şema A (eski model): islem_yapan_id, eylem, hedef_tablo, hedef_id, eski_veri, yeni_veri, created_at
        ("""INSERT INTO denetim_izleri
                (islem_yapan_id, eylem, hedef_tablo, hedef_id, eski_veri, yeni_veri, created_at)
            VALUES
                (CAST(:uid AS uuid), :aks, :tablo, :kid,
                 CAST(:eski AS json), CAST(:yeni AS json), NOW())""",
         {"uid": admin_id, "aks": aksiyon, "tablo": tablo,
          "kid": kayit_id or "", "eski": eski_json, "yeni": yeni_json}),
    ]
    for _sql, _params in _INSERT_ATTEMPTS:
        try:
            await db.execute(text("SAVEPOINT _audit_sp"))
            await db.execute(text(_sql), _params)
            await db.execute(text("RELEASE SAVEPOINT _audit_sp"))
            break  # başarılı
        except Exception:
            try:
                await db.execute(text("ROLLBACK TO SAVEPOINT _audit_sp"))
            except Exception:
                pass


# ═══════════════════════════ 1. Filter Seçenekleri ═══════════════════════════

@router.get("/filters")
async def get_filters(
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    """Sadece Müşteri Hizmetleri ekipleri + sayfa kapsamındaki roller (personel, supervisor)."""
    teams = (await db.execute(
        text("""
            SELECT e.id::text, e.ad
            FROM ekipler e
            JOIN departmanlar d ON d.id = e.departman_id
            WHERE e.aktif = TRUE AND d.ad = :dept
            ORDER BY e.ad
        """),
        {"dept": DEPARTMENT_FILTER_NAME},
    )).fetchall()
    roles = (await db.execute(
        text("""
            SELECT id, ad FROM roller
            WHERE LOWER(ad) = ANY(:roles)
            ORDER BY
                CASE LOWER(ad) WHEN 'supervisor' THEN 1 WHEN 'personel' THEN 2 ELSE 3 END
        """),
        {"roles": list(SCOPE_ROLES)},
    )).fetchall()
    return {
        "ekipler": [{"id": r.id, "ad": r.ad} for r in teams],
        "roller":  [{"id": r.id, "ad": r.ad} for r in roles],
    }


# ═══════════════════════════ 1b. Haftalık Devam Panosu ═══════════════════════

@router.get("/attendance")
async def get_attendance(
    week_offset: int = Query(0),      # 0=bu hafta, -1=geçen hafta, +1=gelecek hafta
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    """
    MH personeli için haftalık devam matrisi.
    week_offset: 0=bu hafta, -1=geçen hafta, +1=gelecek hafta (Pazartesi bazlı).

    Dönüş:
      week_start, week_end, personnel:[{id,ad_soyad,ekip,rol}], attendance:{id:[7 gün]}
    Her gün: planned("09:00-18:00" hafta içi | null hafta sonu),
             actual_in/actual_out (HH:MM), late, early(0 şimdilik), bov, brk
    """
    # Hafta başı (Pazartesi) hesapla
    today = date.today()
    days_since_monday = today.weekday()          # Mon=0 … Sun=6
    this_monday = today - timedelta(days=days_since_monday)
    week_start  = this_monday + timedelta(weeks=week_offset)
    week_end    = week_start + timedelta(days=6)

    # MH personeli listesi (max 100)
    personel_rows = (await db.execute(text(f"""
        SELECT
            u.id::text                                          AS id,
            u.ad_soyad,
            COALESCE(e.ad,
                (SELECT ek2.ad FROM supervisor_ekip se3
                 JOIN ekipler ek2 ON ek2.id = se3.ekip_id
                 JOIN departmanlar dd2 ON dd2.id = ek2.departman_id
                 WHERE se3.supervisor_id = u.id AND dd2.ad = :dept
                 ORDER BY ek2.ad LIMIT 1)
            )                                                   AS ekip,
            r.ad                                                AS rol
        FROM kullanicilar u
        LEFT JOIN roller       r ON r.id = u.rol_id
        LEFT JOIN ekipler      e ON e.id = u.ekip_id
        LEFT JOIN departmanlar d ON d.id = u.departman_id
        WHERE u.silindi_mi = FALSE
          AND LOWER(r.ad) = ANY(:scope_roles)
          AND {MH_SCOPE_CLAUSE}
        ORDER BY u.ad_soyad
        LIMIT 100
    """), {
        "dept":        DEPARTMENT_FILTER_NAME,
        "scope_roles": list(SCOPE_ROLES),
    })).fetchall()

    personnel = [{"id": r.id, "ad_soyad": r.ad_soyad, "ekip": r.ekip, "rol": r.rol}
                 for r in personel_rows]
    if not personnel:
        return {
            "week_start": week_start.isoformat(),
            "week_end":   week_end.isoformat(),
            "personnel":  [],
            "attendance": {},
        }

    uid_list = [p["id"] for p in personnel]

    # Oturum kayıtları (giriş/çıkış) — hafta boyunca, uid_list içinde
    sess_rows = (await db.execute(text("""
        SELECT
            pol.user_id::text                                    AS uid,
            DATE(pol.login_zamani)                               AS gun,
            TO_CHAR(MIN(pol.login_zamani), 'HH24:MI')            AS ilk_giris,
            TO_CHAR(MAX(pol.logout_zamani), 'HH24:MI')           AS son_cikis,
            MAX(COALESCE(pol.gec_giris_dk, 0))                   AS gec_giris_dk
        FROM personel_oturum_loglari pol
        WHERE DATE(pol.login_zamani) BETWEEN :ws AND :we
          AND pol.user_id::text = ANY(:uids)
        GROUP BY pol.user_id, DATE(pol.login_zamani)
    """), {"ws": week_start, "we": week_end, "uids": uid_list})).fetchall()

    # Mola kayıtları — hafta boyunca
    mola_rows = (await db.execute(text("""
        SELECT
            m.user_id::text                                      AS uid,
            DATE(m.baslangic)                                    AS gun,
            ROUND(SUM(EXTRACT(EPOCH FROM
                (COALESCE(m.bitis, NOW()) - m.baslangic)
            ) / 60))::int                                        AS toplam_mola_dk,
            BOOL_OR(COALESCE(m.sure_asimi, FALSE))               AS bov
        FROM molalar m
        WHERE DATE(m.baslangic) BETWEEN :ws AND :we
          AND m.user_id::text = ANY(:uids)
        GROUP BY m.user_id, DATE(m.baslangic)
    """), {"ws": week_start, "we": week_end, "uids": uid_list})).fetchall()

    # Python'da indeksle
    sess_map = {}
    for r in sess_rows:
        sess_map[(r.uid, r.gun)] = r
    mola_map = {}
    for r in mola_rows:
        mola_map[(r.uid, r.gun)] = r

    # Her personel × 7 gün → gün verisi
    attendance: dict = {}
    for p in personnel:
        days = []
        for offset in range(7):
            dag = week_start + timedelta(days=offset)
            dow = dag.weekday()   # 0=Mon … 6=Sun
            is_workday = dow < 5  # Pzt-Cum

            sess = sess_map.get((p["id"], dag))
            mola = mola_map.get((p["id"], dag))

            days.append({
                "planned":    "09:00-18:00" if is_workday else None,
                "actual_in":  sess.ilk_giris   if sess else None,
                "actual_out": sess.son_cikis   if sess else None,
                "late":       int(sess.gec_giris_dk or 0) if sess else 0,
                "early":      0,  # çıkış saati şemada yok
                "bov":        bool(mola.bov)  if mola else False,
                "brk":        int(mola.toplam_mola_dk or 0) if mola else 0,
            })
        attendance[p["id"]] = days

    return {
        "week_start": week_start.isoformat(),
        "week_end":   week_end.isoformat(),
        "personnel":  personnel,
        "attendance": attendance,
    }


# ═══════════════════════════ 2. Stats (üst özet bar) ═════════════════════════

@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    """Müşteri Hizmetleri kapsamı (personel + MH supervizörleri) durum dağılımı."""
    row = (await db.execute(text(f"""
        SELECT
            COUNT(*)                                                                 AS toplam,
            COUNT(*) FILTER (WHERE COALESCE(vp.anlik_durum::text,'offline')='aktif')   AS aktif,
            COUNT(*) FILTER (WHERE COALESCE(vp.anlik_durum::text,'offline')='mesgul')  AS mesgul,
            COUNT(*) FILTER (WHERE COALESCE(vp.anlik_durum::text,'offline')='mola')    AS mola,
            COUNT(*) FILTER (WHERE COALESCE(vp.anlik_durum::text,'offline')='offline') AS offline,
            COUNT(*) FILTER (WHERE COALESCE(vp.mola_asimi,FALSE) = TRUE)               AS mola_asimi,
            COUNT(*) FILTER (WHERE vp.sip_durumu::text = 'koptu')                      AS sip_kopuk
        FROM kullanicilar u
        LEFT JOIN roller           r  ON r.id = u.rol_id
        LEFT JOIN departmanlar     d  ON d.id = u.departman_id
        LEFT JOIN v_personel_anlik vp ON vp.id = u.id
        WHERE u.silindi_mi = FALSE
          AND LOWER(r.ad) = ANY(:scope_roles)
          AND {MH_SCOPE_CLAUSE}
    """), {
        "dept": DEPARTMENT_FILTER_NAME,
        "scope_roles": list(SCOPE_ROLES),
    })).fetchone()

    if not row:
        return {"toplam": 0, "aktif": 0, "mesgul": 0, "mola": 0,
                "offline": 0, "mola_asimi": 0, "sip_kopuk": 0}

    return {
        "toplam":     int(row.toplam or 0),
        "aktif":      int(row.aktif or 0),
        "mesgul":     int(row.mesgul or 0),
        "mola":       int(row.mola or 0),
        "offline":    int(row.offline or 0),
        "mola_asimi": int(row.mola_asimi or 0),
        "sip_kopuk":  int(row.sip_kopuk or 0),
    }


# ═══════════════════════════ 3. Master Liste ═════════════════════════════════

@router.get("")
async def list_personnel(
    page:     int           = Query(1,  ge=1),
    per_page: int           = Query(50, ge=1, le=200),
    ekip_id:  Optional[str] = Query(None),
    rol:      Optional[str] = Query(None),       # rol adı
    rol_id:   Optional[int] = Query(None),
    durum:    Optional[str] = Query(None),       # aktif | mola | offline | mesgul
    q:        Optional[str] = Query(None),       # arama
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    """
    Müşteri Hizmetleri personelinin master listesi.
    Mola aşımı yapanlar liste başında.
    """
    conds:  list[str] = [
        "u.silindi_mi = FALSE",
        "LOWER(r.ad) = ANY(:scope_roles)",
        MH_SCOPE_CLAUSE.strip(),
    ]
    params: dict = {
        "lim": per_page,
        "off": (page - 1) * per_page,
        "dept": DEPARTMENT_FILTER_NAME,
        "scope_roles": list(SCOPE_ROLES),
    }

    # Ekip filtresi: hem direkt ekip üyesi hem ekibi yöneten supervisor
    if ekip_id:
        conds.append("""
            (
                u.ekip_id = CAST(:ekip_id AS uuid)
                OR EXISTS (
                    SELECT 1 FROM supervisor_ekip se2
                    WHERE se2.supervisor_id = u.id
                      AND se2.ekip_id = CAST(:ekip_id AS uuid)
                )
            )
        """)
        params["ekip_id"] = ekip_id
    if rol_id is not None:
        conds.append("u.rol_id = :rol_id")
        params["rol_id"] = rol_id
    if rol:
        conds.append("LOWER(r.ad) = LOWER(:rol_ad)")
        params["rol_ad"] = rol
    if durum:
        conds.append("LOWER(COALESCE(vp.anlik_durum::text,'offline')) = LOWER(:durum)")
        params["durum"] = durum
    if q:
        conds.append(
            "(u.ad_soyad ILIKE :q OR u.kullanici_adi ILIKE :q OR COALESCE(u.dahili_no,'') ILIKE :q)"
        )
        params["q"] = f"%{q}%"

    where = " AND ".join(conds)

    rows = (await db.execute(text(f"""
        SELECT
            u.id::text                                              AS id,
            u.ad_soyad,
            u.kullanici_adi,
            u.dahili_no,
            r.ad                                                    AS rol,
            -- Personel için kendi ekibi; supervisor için yönettiği ilk MH ekibi
            COALESCE(
                e.ad,
                (
                    SELECT ek2.ad
                    FROM supervisor_ekip se3
                    JOIN ekipler         ek2 ON ek2.id = se3.ekip_id
                    JOIN departmanlar    dd2 ON dd2.id = ek2.departman_id
                    WHERE se3.supervisor_id = u.id AND dd2.ad = :dept
                    ORDER BY ek2.ad
                    LIMIT 1
                )
            )                                                       AS ekip,
            e.id::text                                              AS ekip_id,
            COALESCE(d.ad, :dept)                                   AS departman,
            COALESCE(vp.anlik_durum::text, 'offline')               AS anlik_durum,
            CASE
                WHEN COALESCE(vp.mola_asimi, FALSE)
                THEN GREATEST(0,
                       COALESCE(vp.mola_sure_dk, 0)::int
                       - COALESCE(vp.planlanan_sure_dk, 0)::int)
                ELSE 0
            END                                                     AS mola_asimi_dk,
            COALESCE(vp.bugun_toplam_cagri, 0)                      AS bugun_cagri,
            COALESCE(vp.bugun_ort_csat, 0)                          AS bugun_csat,
            COALESCE(u.xp,     0)                                   AS xp,
            COALESCE(u.seviye, 1)                                   AS seviye,
            u.unvan,
            COALESCE(vp.sip_durumu::text, 'koptu')                  AS sip_durumu,
            COUNT(*) OVER ()                                        AS toplam
        FROM kullanicilar u
        LEFT JOIN roller            r  ON r.id = u.rol_id
        LEFT JOIN ekipler           e  ON e.id = u.ekip_id
        LEFT JOIN departmanlar      d  ON d.id = u.departman_id
        LEFT JOIN v_personel_anlik  vp ON vp.id = u.id
        WHERE {where}
        ORDER BY
            -- Mola aşımı en üstte
            CASE WHEN COALESCE(vp.mola_asimi, FALSE) THEN 0 ELSE 1 END,
            -- Supervizörler personellerden önce
            CASE LOWER(r.ad) WHEN 'supervisor' THEN 0 ELSE 1 END,
            CASE COALESCE(vp.anlik_durum::text,'offline')
                WHEN 'aktif'  THEN 1
                WHEN 'mesgul' THEN 2
                WHEN 'mola'   THEN 3
                ELSE 4
            END,
            u.ad_soyad
        LIMIT :lim OFFSET :off
    """), params)).fetchall()

    total = int(rows[0].toplam) if rows else 0
    items = [
        {
            "id":            r.id,
            "ad_soyad":      r.ad_soyad,
            "kullanici_adi": r.kullanici_adi,
            "dahili_no":     r.dahili_no,
            "rol":           r.rol,
            "ekip":          r.ekip,
            "ekip_id":       r.ekip_id,
            "departman":     r.departman,
            "anlik_durum":   r.anlik_durum,
            "mola_asimi_dk": int(r.mola_asimi_dk or 0),
            "bugun_cagri":   int(r.bugun_cagri or 0),
            "bugun_csat":    float(r.bugun_csat or 0),
            "xp":            int(r.xp or 0),
            "seviye":        int(r.seviye or 1),
            "unvan":         r.unvan,
            "sip_durumu":    r.sip_durumu,
        }
        for r in rows
    ]
    return {
        "items":    items,
        "total":    total,
        "toplam":   total,
        "page":     page,
        "per_page": per_page,
    }


# ═══════════════════════════ 4. Konsolide Detay ══════════════════════════════

@router.get("/{user_id}/details")
async def get_details(
    user_id: str,
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    """Profil + 4 sekme verisi tek istekte."""

    p = (await db.execute(text("""
        SELECT
            u.id::text                                              AS id,
            u.ad_soyad,
            u.kullanici_adi,
            u.dahili_no,
            r.ad                                                    AS rol,
            COALESCE(
                e.ad,
                (
                    SELECT ek2.ad
                    FROM supervisor_ekip se3
                    JOIN ekipler         ek2 ON ek2.id = se3.ekip_id
                    JOIN departmanlar    dd2 ON dd2.id = ek2.departman_id
                    WHERE se3.supervisor_id = u.id AND dd2.ad = :dept
                    ORDER BY ek2.ad
                    LIMIT 1
                )
            )                                                       AS ekip,
            COALESCE(d.ad, :dept)                                   AS departman,
            COALESCE(u.xp, 0)                                       AS xp,
            COALESCE(u.seviye, 1)                                   AS seviye,
            u.unvan,
            COALESCE(vp.anlik_durum::text, 'offline')               AS anlik_durum,
            COALESCE(vp.sip_durumu::text, 'koptu')                  AS sip_durumu,
            CASE
                WHEN COALESCE(vp.mola_asimi, FALSE)
                THEN GREATEST(0,
                       COALESCE(vp.mola_sure_dk, 0)::int
                       - COALESCE(vp.planlanan_sure_dk, 0)::int)
                ELSE 0
            END                                                     AS mola_asimi_dk,
            COALESCE(vp.bugun_toplam_cagri, 0)                      AS bugun_cagri,
            COALESCE(vp.bugun_ort_csat, 0)                          AS bugun_csat
        FROM kullanicilar u
        LEFT JOIN roller            r  ON r.id = u.rol_id
        LEFT JOIN ekipler           e  ON e.id = u.ekip_id
        LEFT JOIN departmanlar      d  ON d.id = u.departman_id
        LEFT JOIN v_personel_anlik  vp ON vp.id = u.id
        WHERE u.id = CAST(:uid AS uuid) AND u.silindi_mi = FALSE
    """), {"uid": user_id, "dept": DEPARTMENT_FILTER_NAME})).fetchone()

    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Personel bulunamadı")

    aktif_mola = (await db.execute(text("""
        SELECT id::text FROM molalar
        WHERE user_id = CAST(:uid AS uuid) AND bitis IS NULL AND onay_durumu = 'onaylandi'
        ORDER BY baslangic ASC LIMIT 1
    """), {"uid": user_id})).scalar()

    profil = {
        "id":            p.id,
        "ad_soyad":      p.ad_soyad,
        "kullanici_adi": p.kullanici_adi,
        "dahili_no":     p.dahili_no,
        "rol":           p.rol,
        "ekip":          p.ekip,
        "departman":     p.departman,
        "xp":            int(p.xp or 0),
        "seviye":        int(p.seviye or 1),
        "unvan":         p.unvan,
        "anlik_durum":   p.anlik_durum,
        "sip_durumu":    p.sip_durumu,
        "mola_asimi_dk": int(p.mola_asimi_dk or 0),
        "bugun_cagri":   int(p.bugun_cagri or 0),
        "bugun_csat":    float(p.bugun_csat or 0),
        "aktif_mola_id": aktif_mola,
    }

    # Sekme 1 · 7 günlük performans
    perf_rows = (await db.execute(text("""
        SELECT
            DATE(baslangic_zamani)                                                AS gun,
            COUNT(*)                                                              AS toplam,
            COUNT(*) FILTER (WHERE durum::text IN ('cevaplandi','aktarildi'))     AS cevaplanan,
            ROUND(AVG(csat_skoru) FILTER (WHERE csat_skoru IS NOT NULL)::numeric, 2)
                                                                                  AS ort_csat
        FROM cagri_kayitlari
        WHERE user_id = CAST(:uid AS uuid)
          AND baslangic_zamani >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY DATE(baslangic_zamani)
        ORDER BY gun
    """), {"uid": user_id})).fetchall()

    # Sekme 2 · Vardiya & Oturum (son 14 gün)
    sess_rows = (await db.execute(text("""
        SELECT
            pol.id::text                  AS id,
            DATE(pol.login_zamani)        AS tarih,
            pol.login_zamani,
            pol.logout_zamani,
            COALESCE(pol.gec_giris_dk, 0) AS gec_giris_dk,
            pol.ip_adresi
        FROM personel_oturum_loglari pol
        WHERE pol.user_id = CAST(:uid AS uuid)
          AND pol.login_zamani >= CURRENT_DATE - INTERVAL '13 days'
        ORDER BY pol.login_zamani DESC
        LIMIT 30
    """), {"uid": user_id})).fetchall()

    # Sekme 3 · Mola geçmişi (son 30 gün) — planlanan_sure_dk row'da
    break_rows = (await db.execute(text("""
        SELECT
            m.id::text                                                            AS id,
            m.tip                                                                 AS tur,
            m.baslangic,
            m.bitis,
            COALESCE(m.planlanan_sure_dk, 0)                                      AS planlanan_dk,
            ROUND(EXTRACT(EPOCH FROM (COALESCE(m.bitis, NOW()) - m.baslangic))::numeric / 60, 1)
                                                                                  AS gerceklesen_dk,
            m.onay_durumu,
            (m.bitis IS NULL)                                                     AS devam_ediyor,
            COALESCE(m.sure_asimi, FALSE)                                         AS sure_asimi
        FROM molalar m
        WHERE m.user_id = CAST(:uid AS uuid)
          AND m.baslangic >= CURRENT_DATE - INTERVAL '29 days'
        ORDER BY m.baslangic DESC
        LIMIT 50
    """), {"uid": user_id})).fetchall()

    # Sekme 4 · XP hareketleri (son 50)
    xp_rows = (await db.execute(text("""
        SELECT
            xh.id::text     AS id,
            xh.miktar,
            xh.aciklama     AS sebep,
            xh.kaynak,
            xh.tarih        AS created_at,
            xh.referans_id::text AS referans_id
        FROM xp_hareketleri xh
        WHERE xh.user_id = CAST(:uid AS uuid)
        ORDER BY xh.tarih DESC
        LIMIT 50
    """), {"uid": user_id})).fetchall()

    return {
        "profil": profil,
        "performans": [
            {
                "gun":        str(r.gun),
                "toplam":     int(r.toplam or 0),
                "cevaplanan": int(r.cevaplanan or 0),
                "ort_csat":   float(r.ort_csat or 0),
            }
            for r in perf_rows
        ],
        "oturumlar": [
            {
                "id":            r.id,
                "tarih":         str(r.tarih) if r.tarih else None,
                "login_zamani":  r.login_zamani.isoformat()  if r.login_zamani  else None,
                "cikis_zamani":  r.logout_zamani.isoformat() if r.logout_zamani else None,
                "gec_giris_dk":  int(r.gec_giris_dk or 0),
                "ip_adresi":     r.ip_adresi,
            }
            for r in sess_rows
        ],
        "molalar": [
            {
                "id":             r.id,
                "tur":            r.tur,
                "baslangic":      r.baslangic.isoformat() if r.baslangic else None,
                "bitis":          r.bitis.isoformat()     if r.bitis     else None,
                "planlanan_dk":   int(r.planlanan_dk or 0),
                "gerceklesen_dk": float(r.gerceklesen_dk or 0),
                "onay_durumu":    r.onay_durumu,
                "devam_ediyor":   bool(r.devam_ediyor),
                "sure_asimi":     bool(r.sure_asimi),
            }
            for r in break_rows
        ],
        "xp_gecmisi": [
            {
                "id":           r.id,
                "miktar":       int(r.miktar or 0),
                "sebep":        r.sebep,
                "kaynak":       r.kaynak,
                "created_at":   r.created_at.isoformat() if r.created_at else None,
                "olusturan_ad": None,  # şemada olusturan_id yok
            }
            for r in xp_rows
        ],
    }


# ═══════════════════════════ 5. Override · Molayı Bitir ══════════════════════

@router.post("/override/end-break")
async def override_end_break(
    body: EndBreakBody,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(ADMIN),
):
    """Aktif onaylı molayı zorla bitirir + denetim_izleri (aksiyon='override')."""
    now = datetime.utcnow()
    row = (await db.execute(
        text("""
            UPDATE molalar
            SET bitis = :now
            WHERE user_id          = CAST(:uid AS uuid)
              AND bitis             IS NULL
              AND onay_durumu::text = 'onaylandi'
            RETURNING id::text AS id, baslangic
        """),
        {"now": now, "uid": body.user_id},
    )).fetchone()

    if not row:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Bu kullanıcıya ait aktif onaylı mola bulunamadı",
        )

    await _audit(
        db, str(current_user.id), "molalar", row.id, "override",
        eski={"bitis": None, "durum": "devam_ediyor"},
        yeni={"bitis": now.isoformat(), "sebep": body.sebep,
              "yapan_id": str(current_user.id)},
    )
    await db.commit()
    return {"ok": True, "mola_id": row.id, "bitis": now.isoformat()}


# ═══════════════════════════ 6. Override · Manuel XP ═════════════════════════

@router.post("/override/manual-xp")
async def override_manual_xp(
    body: ManualXpBody,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(ADMIN),
):
    """
    XP ekler/çıkarır:
      · xp_hareketleri'ne kaynak='duzeltme' satırı atar (şemada izinli enum değer)
      · kullanicilar.xp güncellenir
      · denetim_izleri'ne aksiyon='xp_correction' kaydı atılır
    """
    if body.delta == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "XP delta sıfır olamaz")

    cur = (await db.execute(
        text("SELECT COALESCE(xp,0) AS xp FROM kullanicilar WHERE id = CAST(:uid AS uuid)"),
        {"uid": body.user_id},
    )).scalar()
    if cur is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kullanıcı bulunamadı")

    new_xp = max(0, int(cur) + body.delta)

    # xp_hareketleri'ne kaydet — gerçek şema: (user_id, miktar, kaynak, referans_id, aciklama, tarih)
    aciklama = f"[Admin Override · {current_user.kullanici_adi}] {body.sebep}"
    await db.execute(text("""
        INSERT INTO xp_hareketleri (user_id, miktar, kaynak, referans_id, aciklama, tarih)
        VALUES (CAST(:uid AS uuid), :delta, 'duzeltme', :ref_id, :aciklama, NOW())
    """), {
        "uid":      body.user_id,
        "delta":    body.delta,
        "ref_id":   body.referans_id,
        "aciklama": aciklama,
    })

    # kullanicilar.xp'i güncelle (trigger yoksa elle)
    await db.execute(
        text("UPDATE kullanicilar SET xp = :xp WHERE id = CAST(:uid AS uuid)"),
        {"xp": new_xp, "uid": body.user_id},
    )

    await _audit(
        db, str(current_user.id), "kullanicilar", body.user_id, "xp_correction",
        eski={"xp": int(cur)},
        yeni={"xp": new_xp, "delta": body.delta, "sebep": body.sebep},
    )
    await db.commit()
    return {"ok": True, "eski_xp": int(cur), "yeni_xp": new_xp, "delta": body.delta}


# ═══════════════════════════ 7. Personel Güncelle ════════════════════════════

@router.patch("/{user_id}")
async def update_personnel(
    user_id: str,
    body:    UpdatePersonnelBody,
    db:      AsyncSession = Depends(get_async_db),
    current_user: User   = Depends(ADMIN),
):
    """
    Personelin rol / ekip / dahili bilgilerini günceller.
    Yalnızca request body'de gelen (model_fields_set) alanlar işlenir.
    ekip_id = "" → NULL (ekip kaldır).
    """
    set_clauses: list[str] = []
    params: dict = {"uid": user_id}

    if "rol" in body.model_fields_set and body.rol:
        rol_id = (await db.execute(
            text("SELECT id::text FROM roller WHERE LOWER(ad) = LOWER(:rol) LIMIT 1"),
            {"rol": body.rol},
        )).scalar()
        if not rol_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Rol bulunamadı: {body.rol}")
        set_clauses.append("rol_id = CAST(:rol_id AS uuid)")
        params["rol_id"] = rol_id

    if "ekip_id" in body.model_fields_set:
        if body.ekip_id:
            set_clauses.append("ekip_id = CAST(:ekip_id AS uuid)")
            params["ekip_id"] = body.ekip_id
        else:
            set_clauses.append("ekip_id = NULL")

    if "dahili_no" in body.model_fields_set:
        set_clauses.append("dahili_no = :dahili_no")
        params["dahili_no"] = body.dahili_no or None

    if not set_clauses:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Güncellenecek alan belirtilmedi")

    set_clauses.append("guncelleme_tarihi = NOW()" if False else "")  # placeholder removed below
    set_clauses = [c for c in set_clauses if c]  # temizle

    row = (await db.execute(text(f"""
        UPDATE kullanicilar
        SET {', '.join(set_clauses)}
        WHERE id = CAST(:uid AS uuid) AND silindi_mi = FALSE
        RETURNING
            id::text            AS id,
            ad_soyad,
            kullanici_adi,
            dahili_no,
            ekip_id::text       AS ekip_id
    """), params)).fetchone()

    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Personel bulunamadı")

    # Ekip adını çek
    ekip_ad = None
    if row.ekip_id:
        ekip_ad = (await db.execute(
            text("SELECT ad FROM ekipler WHERE id = CAST(:eid AS uuid)"),
            {"eid": row.ekip_id},
        )).scalar()

    # Rol adını çek
    rol_ad = (await db.execute(
        text("""
            SELECT r.ad FROM kullanicilar u
            JOIN roller r ON r.id = u.rol_id
            WHERE u.id = CAST(:uid AS uuid)
        """),
        {"uid": user_id},
    )).scalar()

    eski = {"uid": user_id}
    yeni = {k: v for k, v in {
        "rol":       body.rol       if "rol"      in body.model_fields_set else None,
        "ekip_id":   body.ekip_id   if "ekip_id"  in body.model_fields_set else None,
        "dahili_no": body.dahili_no if "dahili_no" in body.model_fields_set else None,
        "yapan":     current_user.kullanici_adi,
    }.items() if v is not None}

    await _audit(db, str(current_user.id), "kullanicilar", user_id, "update", eski=eski, yeni=yeni)
    await db.commit()
    return {
        "ok":           True,
        "id":           row.id,
        "ad_soyad":     row.ad_soyad,
        "kullanici_adi": row.kullanici_adi,
        "dahili_no":    row.dahili_no,
        "ekip_id":      row.ekip_id,
        "ekip":         ekip_ad,
        "rol":          rol_ad,
    }


# ═══════════════════════════ 8. Yeni Personel Oluştur ════════════════════════

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_personnel(
    body: CreatePersonnelBody,
    db:   AsyncSession = Depends(get_async_db),
    current_user: User = Depends(ADMIN),
):
    """
    Yeni personel / supervisor oluşturur.
    · departman_id: 'Müşteri Hizmetleri' departmanı otomatik atanır.
    · rol_id: roller tablosundan ad ile bulunur.
    · UUID Python tarafında üretilir (pgcrypto bağımlılığı yok).
    · Şifre bcrypt ile hash'lenir.
    · denetim_izleri'ne aksiyon='create' kaydı atılır.
    """
    # 1. departman_id (MH)
    dept_id = (await db.execute(
        text("SELECT id::text FROM departmanlar WHERE ad = :dept LIMIT 1"),
        {"dept": DEPARTMENT_FILTER_NAME},
    )).scalar()
    if not dept_id:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR,
                            "Müşteri Hizmetleri departmanı bulunamadı")

    # 2. rol_id
    rol_id = (await db.execute(
        text("SELECT id::text FROM roller WHERE LOWER(ad) = LOWER(:rol) LIMIT 1"),
        {"rol": body.rol},
    )).scalar()
    if not rol_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST,
                            f"Rol bulunamadı: {body.rol}")

    # 3. kullanici_adi benzersizlik kontrolü
    exists = (await db.execute(
        text("SELECT 1 FROM kullanicilar WHERE LOWER(kullanici_adi) = LOWER(:ka) LIMIT 1"),
        {"ka": body.kullanici_adi},
    )).scalar()
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            "Bu kullanıcı adı zaten kullanılıyor")

    new_id    = str(uuid.uuid4())
    sifre_hash = hash_password(body.sifre)

    row = (await db.execute(text("""
        INSERT INTO kullanicilar
            (id, ad_soyad, kullanici_adi, dahili_no,
             sifre_hash, rol_id, departman_id, ekip_id,
             xp, seviye, silindi_mi)
        VALUES
            (CAST(:id AS uuid), :ad, :ka, :dahili,
             :sifre, CAST(:rol_id AS uuid), CAST(:dept_id AS uuid),
             CASE WHEN :ekip_id IS NULL THEN NULL ELSE CAST(:ekip_id AS uuid) END,
             0, 1, FALSE)
        RETURNING id::text AS id, ad_soyad, kullanici_adi, dahili_no
    """), {
        "id":      new_id,
        "ad":      body.ad_soyad,
        "ka":      body.kullanici_adi,
        "dahili":  body.dahili_no,
        "sifre":   sifre_hash,
        "rol_id":  rol_id,
        "dept_id": dept_id,
        "ekip_id": body.ekip_id,
    })).fetchone()

    await _audit(
        db, str(current_user.id), "kullanicilar", new_id, "create",
        eski={},
        yeni={
            "ad_soyad":     body.ad_soyad,
            "kullanici_adi": body.kullanici_adi,
            "rol":          body.rol,
            "olusturan":    current_user.kullanici_adi,
        },
    )
    await db.commit()
    return {
        "ok":           True,
        "id":           row.id,
        "ad_soyad":     row.ad_soyad,
        "kullanici_adi": row.kullanici_adi,
        "dahili_no":    row.dahili_no,
    }


# ═══════════════════════════ 8. Şifre Sıfırla ════════════════════════════════

@router.patch("/{user_id}/reset-password")
async def reset_password(
    user_id: str,
    body:    ResetPasswordBody,
    db:      AsyncSession = Depends(get_async_db),
    current_user: User = Depends(ADMIN),
):
    """Personelin şifresini admin tarafından zorla sıfırlar."""
    exists = (await db.execute(
        text("SELECT id::text FROM kullanicilar WHERE id = CAST(:uid AS uuid) AND silindi_mi = FALSE"),
        {"uid": user_id},
    )).scalar()
    if not exists:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Personel bulunamadı")

    new_hash = hash_password(body.yeni_sifre)
    await db.execute(
        text("UPDATE kullanicilar SET sifre_hash = :h WHERE id = CAST(:uid AS uuid)"),
        {"h": new_hash, "uid": user_id},
    )
    await _audit(
        db, str(current_user.id), "kullanicilar", user_id, "update",
        eski={"sifre_hash": "***"},
        yeni={"sifre_hash": "***RESET***", "yapan": current_user.kullanici_adi},
    )
    await db.commit()
    return {"ok": True}


# ═══════════════════════════ 9. Hesap Kilitle / Aç ═══════════════════════════

@router.patch("/{user_id}/lock")
async def lock_user(
    user_id: str,
    body:    LockBody,
    db:      AsyncSession = Depends(get_async_db),
    current_user: User = Depends(ADMIN),
):
    """Hesabı kilitler (kilitli=true) veya kilidi açar (kilitli=false)."""
    await _ensure_kilitli_col(db)

    row = (await db.execute(
        text("""
            UPDATE kullanicilar
            SET kilitli = :kilitli
            WHERE id = CAST(:uid AS uuid) AND silindi_mi = FALSE
            RETURNING id::text, kilitli
        """),
        {"kilitli": body.kilitli, "uid": user_id},
    )).fetchone()

    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Personel bulunamadı")

    await _audit(
        db, str(current_user.id), "kullanicilar", user_id, "update",
        eski={"kilitli": not body.kilitli},
        yeni={"kilitli": body.kilitli, "yapan": current_user.kullanici_adi},
    )
    await db.commit()
    return {"ok": True, "kilitli": bool(row.kilitli)}


# ═══════════════════════════ 10. Soft Delete ══════════════════════════════════

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_personnel(
    user_id: str,
    db:      AsyncSession = Depends(get_async_db),
    current_user: User = Depends(ADMIN),
):
    """
    Personeli pasif eder (silindi_mi = TRUE). Gerçek DB satırı silinmez.
    Önce personelin var olup olmadığını kontrol eder, sonra günceller.
    """
    row = (await db.execute(
        text("""
            UPDATE kullanicilar
            SET silindi_mi = TRUE
            WHERE id = CAST(:uid AS uuid) AND silindi_mi = FALSE
            RETURNING id::text
        """),
        {"uid": user_id},
    )).fetchone()

    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Personel bulunamadı veya zaten pasif")

    await _audit(
        db, str(current_user.id), "kullanicilar", user_id, "delete",
        eski={"silindi_mi": False},
        yeni={"silindi_mi": True, "yapan": current_user.kullanici_adi},
    )
    await db.commit()
