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
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.async_session import get_async_db
from app.api.deps import require_admin
from app.models.user import User

router = APIRouter(prefix="/admin/personnel", tags=["Admin · Personel V3"])
ADMIN = require_admin


# ─── Sayfa kapsamı: hangi departman izlenecek (Müşteri Hizmetleri) ──────────
DEPARTMENT_FILTER_NAME = "Müşteri Hizmetleri"


# ═══════════════════════════ Pydantic ════════════════════════════════════════

class EndBreakBody(BaseModel):
    user_id: str
    sebep: Optional[str] = "Admin override · molayı zorla bitir"


class ManualXpBody(BaseModel):
    user_id: str
    delta:   int
    sebep:   str
    referans_id: Optional[str] = None


# ═══════════════════════════ Audit Helper ════════════════════════════════════

async def _audit(
    db: AsyncSession, admin_id: str, tablo: str, kayit_id: str,
    aksiyon: str, eski: dict, yeni: dict,
) -> None:
    """denetim_izleri'ne JSONB ile kaydeder. aksiyon enum: override / xp_correction."""
    eski_json = json.dumps(eski, default=str, ensure_ascii=False)
    yeni_json = json.dumps(yeni, default=str, ensure_ascii=False)
    try:
        await db.execute(
            text("""
                INSERT INTO denetim_izleri
                    (user_id, aksiyon, tablo_adi, kayit_id,
                     eski_deger, yeni_deger, tarih)
                VALUES
                    (:uid::uuid, :aks::audit_action, :tablo, :kid::uuid,
                     :eski::jsonb, :yeni::jsonb, NOW())
            """),
            {"uid": admin_id, "aks": aksiyon, "tablo": tablo,
             "kid": kayit_id, "eski": eski_json, "yeni": yeni_json},
        )
    except Exception:
        # kayit_id UUID değilse fallback (örn xp_hareketleri BIGSERIAL)
        try:
            await db.execute(
                text("""
                    INSERT INTO denetim_izleri
                        (user_id, aksiyon, tablo_adi,
                         eski_deger, yeni_deger, tarih)
                    VALUES
                        (:uid::uuid, :aks::audit_action, :tablo,
                         :eski::jsonb, :yeni::jsonb, NOW())
                """),
                {"uid": admin_id, "aks": aksiyon, "tablo": tablo,
                 "eski": eski_json, "yeni": yeni_json},
            )
        except Exception:
            pass  # audit kaybedilse de işlem devam etmeli


# ═══════════════════════════ 1. Filter Seçenekleri ═══════════════════════════

@router.get("/filters")
async def get_filters(
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    """Sadece Müşteri Hizmetleri departmanına ait ekipler + tüm roller."""
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
        text("SELECT id, ad FROM roller ORDER BY ad")
    )).fetchall()
    return {
        "ekipler": [{"id": r.id, "ad": r.ad} for r in teams],
        "roller":  [{"id": r.id, "ad": r.ad} for r in roles],
    }


# ═══════════════════════════ 2. Stats (üst özet bar) ═════════════════════════

@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    """Müşteri Hizmetleri personeli durum dağılımı."""
    row = (await db.execute(text("""
        SELECT
            COUNT(*)                                                                 AS toplam,
            COUNT(*) FILTER (WHERE COALESCE(vp.anlik_durum::text,'offline')='aktif')   AS aktif,
            COUNT(*) FILTER (WHERE COALESCE(vp.anlik_durum::text,'offline')='mesgul')  AS mesgul,
            COUNT(*) FILTER (WHERE COALESCE(vp.anlik_durum::text,'offline')='mola')    AS mola,
            COUNT(*) FILTER (WHERE COALESCE(vp.anlik_durum::text,'offline')='offline') AS offline,
            COUNT(*) FILTER (WHERE COALESCE(vp.mola_asimi,FALSE) = TRUE)               AS mola_asimi,
            COUNT(*) FILTER (WHERE vp.sip_durumu::text = 'koptu')                      AS sip_kopuk
        FROM kullanicilar u
        LEFT JOIN departmanlar     d  ON d.id = u.departman_id
        LEFT JOIN v_personel_anlik vp ON vp.id = u.id
        WHERE u.silindi_mi = FALSE
          AND d.ad = :dept
    """), {"dept": DEPARTMENT_FILTER_NAME})).fetchone()

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
    conds:  list[str] = ["u.silindi_mi = FALSE", "d.ad = :dept"]
    params: dict = {
        "lim": per_page,
        "off": (page - 1) * per_page,
        "dept": DEPARTMENT_FILTER_NAME,
    }

    if ekip_id:
        conds.append("u.ekip_id = :ekip_id::uuid")
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
            e.ad                                                    AS ekip,
            d.ad                                                    AS departman,
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
            CASE WHEN COALESCE(vp.mola_asimi, FALSE) THEN 0 ELSE 1 END,
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
            e.ad                                                    AS ekip,
            d.ad                                                    AS departman,
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
        WHERE u.id = :uid::uuid AND u.silindi_mi = FALSE
    """), {"uid": user_id})).fetchone()

    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Personel bulunamadı")

    aktif_mola = (await db.execute(text("""
        SELECT id::text FROM molalar
        WHERE user_id = :uid::uuid AND bitis IS NULL AND onay_durumu = 'onaylandi'
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
        WHERE user_id = :uid::uuid
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
        WHERE pol.user_id = :uid::uuid
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
        WHERE m.user_id = :uid::uuid
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
        WHERE xh.user_id = :uid::uuid
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
            WHERE user_id     = :uid::uuid
              AND bitis        IS NULL
              AND onay_durumu  = 'onaylandi'
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
        text("SELECT COALESCE(xp,0) AS xp FROM kullanicilar WHERE id = :uid::uuid"),
        {"uid": body.user_id},
    )).scalar()
    if cur is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kullanıcı bulunamadı")

    new_xp = max(0, int(cur) + body.delta)

    # xp_hareketleri'ne kaydet — gerçek şema: (user_id, miktar, kaynak, referans_id, aciklama, tarih)
    aciklama = f"[Admin Override · {current_user.kullanici_adi}] {body.sebep}"
    await db.execute(text("""
        INSERT INTO xp_hareketleri (user_id, miktar, kaynak, referans_id, aciklama, tarih)
        VALUES (:uid::uuid, :delta, 'duzeltme', :ref_id, :aciklama, NOW())
    """), {
        "uid":      body.user_id,
        "delta":    body.delta,
        "ref_id":   body.referans_id,
        "aciklama": aciklama,
    })

    # kullanicilar.xp'i güncelle (trigger yoksa elle)
    await db.execute(
        text("UPDATE kullanicilar SET xp = :xp WHERE id = :uid::uuid"),
        {"xp": new_xp, "uid": body.user_id},
    )

    await _audit(
        db, str(current_user.id), "kullanicilar", body.user_id, "xp_correction",
        eski={"xp": int(cur)},
        yeni={"xp": new_xp, "delta": body.delta, "sebep": body.sebep},
    )
    await db.commit()
    return {"ok": True, "eski_xp": int(cur), "yeni_xp": new_xp, "delta": body.delta}
