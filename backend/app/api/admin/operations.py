"""
Admin · Operasyon Komuta Merkezi (/admin/operations)
─────────────────────────────────────────────────────
Stratejik KPI'lar + supervisor denetimi + ekip karşılaştırma + AI kriz radarı.

Endpoints
─────────
GET  /admin/operations/summary            → kapasite / abandon / verimlilik / CSAT
GET  /admin/operations/supervisors        → MH supervizörleri denetim matrisi
GET  /admin/operations/team-comparison    → MH-A vs MH-B karşılaştırma
GET  /admin/operations/crisis-radar       → en düşük duygu skoruna sahip 5 çağrı
GET  /admin/operations/audit-logs         → supervizör override/karar logları
POST /admin/operations/talimat            → supervizöre talimat gönder + bildirim
POST /admin/operations/override-pending   → bekleyen mola/vardiya'yı toplu karara bağla
POST /admin/operations/training-flag      → personeli eğitime gönder

Şema notları (sporthink_schema_v2):
  · cagri_analiz : duygu_skoru 1-5, ai_ozet
  · sikayetler   : durum (durum_sikayet enum)
  · talimatlar   : gonderen_id, alici_id, durum (durum_talimat enum)
  · molalar      : onay_durumu beklemede/onaylandi/reddedildi
  · vardiya_talepleri : durum (durum_vardiya_talep enum)
  · denetim_izleri : user_id, aksiyon (audit_action enum), tablo_adi, kayit_id,
                     eski_deger, yeni_deger, tarih
  · supervisor_ekip : (supervisor_id, ekip_id) pivot
"""
from __future__ import annotations

import json
from datetime import datetime, date as date_type, timedelta
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.async_session import get_async_db
from app.api.deps import require_admin
from app.models.user import User

router = APIRouter(prefix="/admin/operations", tags=["Admin · Operasyon"])
ADMIN = require_admin

DEPARTMENT_FILTER_NAME = "Müşteri Hizmetleri"


# ═══════════════════════════ Pydantic ════════════════════════════════════════

class TalimatBody(BaseModel):
    alici_id: str
    baslik:   str = Field(..., min_length=3, max_length=200)
    icerik:   Optional[str] = None
    son_teslim: Optional[datetime] = None


class OverridePendingBody(BaseModel):
    supervisor_id: str
    action: Literal["approve", "reject"]
    reason: str = Field("Admin override · toplu karar", max_length=500)
    scope:  Literal["mola", "vardiya", "all"] = "all"


class TrainingFlagBody(BaseModel):
    user_id:  str
    cagri_id: Optional[str] = None
    neden:    str = Field(..., min_length=5, max_length=500)


# ═══════════════════════════ Audit Helper ════════════════════════════════════

async def _audit(
    db: AsyncSession, admin_id: str, tablo: str, kayit_id: Optional[str],
    aksiyon: str, eski: dict, yeni: dict,
) -> None:
    """
    SAVEPOINT ile izole audit kaydı.
    asyncpg'de try/except içinde DB hatası → connection error state → sonraki
    db.commit() da başarısız olur. SAVEPOINT bunu önler.
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
            break  # başarılı — diğerini deneme
        except Exception:
            try:
                await db.execute(text("ROLLBACK TO SAVEPOINT _audit_sp"))
            except Exception:
                pass  # audit kaybedilse de işlem devam etmeli


# ═══════════════════════════ 1. SUMMARY (KPI Şeridi) ═════════════════════════

@router.get("/summary")
async def operations_summary(
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    """
    Stratejik KPI'lar — sayfanın üst şeridi.
    Tüm sorgular bugüne sınırlı; cagri_kayitlari'nde tarih indeksi varsayılır.
    """
    # Kapasite kullanımı: aktif kuyruk bekleyenler / toplam max_kapasite
    cap = (await db.execute(text("""
        SELECT
            COALESCE(SUM(k.max_kapasite), 0)::int       AS max_kapasite,
            COALESCE(
                (SELECT COUNT(*) FROM aktif_kuyruk_bekleyenler), 0
            )::int                                       AS aktif_bekleyen
        FROM kuyruklar k
        JOIN departmanlar d ON d.id = k.departman_id
        WHERE k.aktif = TRUE AND d.ad = :dept
    """), {"dept": DEPARTMENT_FILTER_NAME})).fetchone()

    # Mesgul personel = anlık aktif çağrı yaklaşığı
    aktif_cagri = (await db.execute(text("""
        SELECT COUNT(*)::int
        FROM kullanicilar u
        JOIN departmanlar d ON d.id = u.departman_id
        LEFT JOIN v_personel_anlik vp ON vp.id = u.id
        WHERE u.silindi_mi = FALSE AND d.ad = :dept
          AND vp.anlik_durum::text = 'mesgul'
    """), {"dept": DEPARTMENT_FILTER_NAME})).scalar() or 0

    max_kap = max(int(cap.max_kapasite or 0), 1)
    kapasite_yuzde = round(aktif_cagri / max_kap * 100, 1)

    # Abandon rate (bugün): kaçan çağrı / toplam
    ab = (await db.execute(text("""
        SELECT
            COUNT(*)                                                            AS toplam,
            COUNT(*) FILTER (WHERE durum::text IN ('cevaplanmadi','mesgul'))    AS kacan
        FROM cagri_kayitlari c
        JOIN departmanlar d ON d.id = c.departman_id
        WHERE d.ad = :dept
          AND c.baslangic_zamani >= CURRENT_DATE
          AND c.baslangic_zamani <  CURRENT_DATE + INTERVAL '1 day'
    """), {"dept": DEPARTMENT_FILTER_NAME})).fetchone()

    toplam = int(ab.toplam or 0)
    kacan  = int(ab.kacan or 0)
    abandon_yuzde = round((kacan / toplam * 100) if toplam else 0, 1)

    # Verimlilik: bugün kazanılan XP / bugün toplam çağrı  (XP per call)
    vrm = (await db.execute(text("""
        SELECT
            COALESCE(SUM(xh.miktar), 0)::int     AS toplam_xp,
            COALESCE(
                (SELECT COUNT(*) FROM cagri_kayitlari c
                 JOIN departmanlar d ON d.id = c.departman_id
                 WHERE d.ad = :dept
                   AND c.baslangic_zamani >= CURRENT_DATE
                   AND c.baslangic_zamani <  CURRENT_DATE + INTERVAL '1 day'),
                0
            )::int                                AS toplam_cagri
        FROM xp_hareketleri xh
        JOIN kullanicilar  u ON u.id = xh.user_id
        JOIN departmanlar  d ON d.id = u.departman_id
        WHERE d.ad = :dept
          AND xh.tarih >= CURRENT_DATE
          AND xh.tarih <  CURRENT_DATE + INTERVAL '1 day'
    """), {"dept": DEPARTMENT_FILTER_NAME})).fetchone()

    toplam_xp = int(vrm.toplam_xp or 0)
    toplam_cagri = int(vrm.toplam_cagri or 0)
    rasyo = round(toplam_xp / toplam_cagri, 2) if toplam_cagri else 0.0

    # CSAT bugün ortalama
    csat = (await db.execute(text("""
        SELECT ROUND(AVG(c.csat_skoru)::numeric, 2)::float AS ort
        FROM cagri_kayitlari c
        JOIN departmanlar d ON d.id = c.departman_id
        WHERE d.ad = :dept
          AND c.csat_skoru IS NOT NULL
          AND c.baslangic_zamani >= CURRENT_DATE
          AND c.baslangic_zamani <  CURRENT_DATE + INTERVAL '1 day'
    """), {"dept": DEPARTMENT_FILTER_NAME})).scalar()

    return {
        "kapasite": {
            "aktif_cagri":   aktif_cagri,
            "max_kapasite":  max_kap,
            "yuzde":         min(100.0, kapasite_yuzde),
            "bekleyen":      int(cap.aktif_bekleyen or 0),
        },
        "abandon": {
            "bugun_toplam":  toplam,
            "bugun_kacan":   kacan,
            "yuzde":         abandon_yuzde,
            "kritik":        abandon_yuzde > 10.0,
        },
        "verimlilik": {
            "toplam_xp_bugun":     toplam_xp,
            "toplam_cagri_bugun":  toplam_cagri,
            "xp_per_cagri":        rasyo,
        },
        "csat": {
            "bugun_ortalama":      float(csat or 0),
        },
    }


# ═══════════════════════════ 2. SUPERVISORS DENETIM MATRISI ══════════════════

@router.get("/supervisors")
async def supervisors_matrix(
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    """
    MH ekiplerini yöneten supervizörler ve denetim metrikleri.
    Her supervisor için: yönettiği ekip, ekip boyutu, bekleyen/karar sayıları.
    """
    rows = (await db.execute(text("""
        WITH mh_supervisors AS (
            SELECT DISTINCT u.id, u.ad_soyad, u.kullanici_adi, u.dahili_no, u.unvan
            FROM kullanicilar u
            JOIN roller r ON r.id = u.rol_id
            WHERE u.silindi_mi = FALSE
              AND LOWER(r.ad) = 'supervisor'
              AND EXISTS (
                  SELECT 1
                  FROM supervisor_ekip se
                  JOIN ekipler ek ON ek.id = se.ekip_id
                  JOIN departmanlar dd ON dd.id = ek.departman_id
                  WHERE se.supervisor_id = u.id AND dd.ad = :dept
              )
        )
        SELECT
            s.id::text                                                    AS id,
            s.ad_soyad,
            s.kullanici_adi,
            s.dahili_no,
            s.unvan,
            COALESCE(string_agg(DISTINCT ek.ad, ' / ' ORDER BY ek.ad), '—') AS yonetilen_ekipler,
            -- Ekip boyutu (yönettiği ekiplerin toplam personel sayısı)
            (
                SELECT COUNT(DISTINCT u2.id)
                FROM kullanicilar u2
                JOIN supervisor_ekip se2 ON se2.ekip_id = u2.ekip_id
                WHERE se2.supervisor_id = s.id
                  AND u2.silindi_mi = FALSE
            )                                                             AS ekip_boyutu,
            -- Bekleyen mola talepleri
            (
                SELECT COUNT(*)
                FROM molalar m
                JOIN kullanicilar u3 ON u3.id = m.user_id
                JOIN supervisor_ekip se3 ON se3.ekip_id = u3.ekip_id
                WHERE se3.supervisor_id = s.id
                  AND m.onay_durumu = 'beklemede'
            )                                                             AS bekleyen_mola,
            -- Bekleyen vardiya talepleri
            (
                SELECT COUNT(*)
                FROM vardiya_talepleri vt
                JOIN kullanicilar u4 ON u4.id = vt.user_id
                JOIN supervisor_ekip se4 ON se4.ekip_id = u4.ekip_id
                WHERE se4.supervisor_id = s.id
                  AND vt.durum::text = 'incelemede'
            )                                                             AS bekleyen_vardiya,
            -- Bekleyen şikayet
            (
                SELECT COUNT(*)
                FROM sikayetler sk
                WHERE sk.supervisor_id = s.id
                  AND sk.durum::text IN ('beklemede','incelemede')
            )                                                             AS bekleyen_sikayet
            -- bugun_karar denetim_izleri'ne bağlı; aşağıda Python'da ayrı try/except ile eklenir
        FROM mh_supervisors s
        LEFT JOIN supervisor_ekip se ON se.supervisor_id = s.id
        LEFT JOIN ekipler         ek ON ek.id = se.ekip_id
        LEFT JOIN departmanlar    dd ON dd.id = ek.departman_id AND dd.ad = :dept
        GROUP BY s.id, s.ad_soyad, s.kullanici_adi, s.dahili_no, s.unvan
        ORDER BY s.ad_soyad
    """), {"dept": DEPARTMENT_FILTER_NAME})).fetchall()

    # bugun_karar: denetim_izleri şeması belirsiz — SAVEPOINT ile her versiyonu dene
    karar_map: dict = {}
    for _sp, sql_attempt in [
        ("_km_sp1", """SELECT user_id::text AS uid, COUNT(*) AS cnt
           FROM denetim_izleri
           WHERE tarih >= CURRENT_DATE
             AND aksiyon::text IN ('update','override','xp_correction')
           GROUP BY user_id"""),
        ("_km_sp2", """SELECT islem_yapan_id::text AS uid, COUNT(*) AS cnt
           FROM denetim_izleri
           WHERE created_at >= CURRENT_DATE
             AND eylem IN ('update','override','xp_correction')
           GROUP BY islem_yapan_id"""),
    ]:
        try:
            await db.execute(text(f"SAVEPOINT {_sp}"))
            audit_rows = (await db.execute(text(sql_attempt))).fetchall()
            await db.execute(text(f"RELEASE SAVEPOINT {_sp}"))
            karar_map = {r.uid: int(r.cnt) for r in audit_rows}
            break  # başarılı
        except Exception:
            try:
                await db.execute(text(f"ROLLBACK TO SAVEPOINT {_sp}"))
            except Exception:
                pass

    return [
        {
            "id":               r.id,
            "ad_soyad":         r.ad_soyad,
            "kullanici_adi":    r.kullanici_adi,
            "dahili_no":        r.dahili_no,
            "unvan":            r.unvan,
            "yonetilen_ekipler": r.yonetilen_ekipler,
            "ekip_boyutu":      int(r.ekip_boyutu or 0),
            "bekleyen_mola":    int(r.bekleyen_mola or 0),
            "bekleyen_vardiya": int(r.bekleyen_vardiya or 0),
            "bekleyen_sikayet": int(r.bekleyen_sikayet or 0),
            "toplam_bekleyen":  int(r.bekleyen_mola or 0)
                              + int(r.bekleyen_vardiya or 0)
                              + int(r.bekleyen_sikayet or 0),
            "bugun_karar":      karar_map.get(r.id, 0),
        }
        for r in rows
    ]


# ═══════════════════════════ 3. EKİP KARŞILAŞTIRMA ═══════════════════════════

@router.get("/team-comparison")
async def team_comparison(
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    """MH ekipleri (MH-A, MH-B, …) bazında bugün karşılaştırma."""
    rows = (await db.execute(text("""
        SELECT
            ek.id::text                                                          AS ekip_id,
            ek.ad                                                                AS ekip_ad,
            -- Personel sayısı
            (
                SELECT COUNT(*) FROM kullanicilar u
                WHERE u.ekip_id = ek.id AND u.silindi_mi = FALSE
            )                                                                    AS personel_sayisi,
            -- Bugünkü çağrı metrikleri
            COALESCE(SUM(CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END), 0)::int  AS bugun_cagri,
            COALESCE(SUM(CASE WHEN c.durum::text IN ('cevaplandi','aktarildi')
                              THEN 1 ELSE 0 END), 0)::int                        AS bugun_cevaplanan,
            COALESCE(SUM(CASE WHEN c.durum::text IN ('cevaplanmadi','mesgul')
                              THEN 1 ELSE 0 END), 0)::int                        AS bugun_kacan,
            ROUND(AVG(c.csat_skoru) FILTER (WHERE c.csat_skoru IS NOT NULL)::numeric, 2)::float
                                                                                 AS ortalama_csat,
            -- Toplam XP (ekibin tüm personelinin)
            (
                SELECT COALESCE(SUM(u.xp), 0)
                FROM kullanicilar u
                WHERE u.ekip_id = ek.id AND u.silindi_mi = FALSE
            )                                                                    AS toplam_xp,
            -- Supervisor adları
            (
                SELECT string_agg(u2.ad_soyad, ' · ' ORDER BY u2.ad_soyad)
                FROM supervisor_ekip se
                JOIN kullanicilar u2 ON u2.id = se.supervisor_id
                WHERE se.ekip_id = ek.id AND u2.silindi_mi = FALSE
            )                                                                    AS supervisor_ad
        FROM ekipler ek
        JOIN departmanlar d ON d.id = ek.departman_id
        LEFT JOIN cagri_kayitlari c ON c.ekip_id = ek.id
            AND c.baslangic_zamani >= CURRENT_DATE
            AND c.baslangic_zamani <  CURRENT_DATE + INTERVAL '1 day'
        WHERE ek.aktif = TRUE AND d.ad = :dept
        GROUP BY ek.id, ek.ad
        ORDER BY ek.ad
    """), {"dept": DEPARTMENT_FILTER_NAME})).fetchall()

    return [
        {
            "ekip_id":          r.ekip_id,
            "ekip_ad":          r.ekip_ad,
            "supervisor_ad":    r.supervisor_ad,
            "personel_sayisi":  int(r.personel_sayisi or 0),
            "bugun_cagri":      int(r.bugun_cagri or 0),
            "bugun_cevaplanan": int(r.bugun_cevaplanan or 0),
            "bugun_kacan":      int(r.bugun_kacan or 0),
            "ortalama_csat":    float(r.ortalama_csat or 0),
            "toplam_xp":        int(r.toplam_xp or 0),
        }
        for r in rows
    ]


# ═══════════════════════════ 4. AI KRIZ RADARI ═══════════════════════════════

@router.get("/crisis-radar")
async def crisis_radar(
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    """En düşük duygu skoruna sahip son çağrılar (öfkeli müşteriler)."""
    rows = (await db.execute(text("""
        SELECT
            ca.id::text                                       AS analiz_id,
            ca.cagri_id::text                                 AS cagri_id,
            ca.ai_ozet,
            ca.duygu_skoru,
            ca.qa_skoru,
            ca.anahtar_kelimeler,
            c.baslangic_zamani,
            c.konusma_suresi,
            c.csat_skoru,
            u.id::text                                        AS personel_id,
            u.ad_soyad                                        AS personel_ad,
            ek.ad                                             AS ekip_ad
        FROM cagri_analiz ca
        JOIN cagri_kayitlari c ON c.id = ca.cagri_id
        JOIN departmanlar    d ON d.id = c.departman_id
        LEFT JOIN kullanicilar u  ON u.id = c.user_id
        LEFT JOIN ekipler     ek ON ek.id = c.ekip_id
        WHERE d.ad = :dept
          AND ca.duygu_skoru IS NOT NULL
          AND ca.duygu_skoru <= 2
          AND c.baslangic_zamani >= CURRENT_DATE - INTERVAL '2 days'
        ORDER BY ca.duygu_skoru ASC, c.baslangic_zamani DESC
        LIMIT :lim
    """), {"dept": DEPARTMENT_FILTER_NAME, "lim": limit})).fetchall()

    return [
        {
            "analiz_id":      r.analiz_id,
            "cagri_id":       r.cagri_id,
            "ai_ozet":        r.ai_ozet,
            "duygu_skoru":    int(r.duygu_skoru) if r.duygu_skoru is not None else None,
            "qa_skoru":       int(r.qa_skoru) if r.qa_skoru is not None else None,
            "anahtar_kelimeler": r.anahtar_kelimeler,
            "baslangic":      r.baslangic_zamani.isoformat() if r.baslangic_zamani else None,
            "konusma_suresi": int(r.konusma_suresi or 0),
            "csat_skoru":     int(r.csat_skoru) if r.csat_skoru is not None else None,
            "personel_id":    r.personel_id,
            "personel_ad":    r.personel_ad,
            "ekip_ad":        r.ekip_ad,
        }
        for r in rows
    ]


# ═══════════════════════════ 5. SUPERVISOR AUDIT LOGS ════════════════════════

@router.get("/audit-logs")
async def audit_logs(
    page:           int           = Query(1,  ge=1),
    page_size:      int           = Query(20, ge=1, le=100),
    only_overrides: bool          = Query(False),
    from_date:      Optional[str] = Query(None),  # YYYY-MM-DD
    to_date:        Optional[str]  = Query(None),  # YYYY-MM-DD
    db:             AsyncSession  = Depends(get_async_db),
    _:              User          = Depends(ADMIN),
):
    """
    Supervizör eylemleri (mola onayı, XP düzeltme, override).
    Sayfalama: page + page_size.
    Tarih filtresi: from_date / to_date (YYYY-MM-DD). Varsayılan: son 7 gün.
    Kolon adları runtime'da information_schema'dan tespit edilir (şema versiyon bağımsız).
    """
    # ── Adım 1: Gerçek kolon adlarını DB'den oku ────────────────────────────────
    try:
        col_rows = (await db.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name   = 'denetim_izleri'
            ORDER BY ordinal_position
        """))).fetchall()
        actual_cols = {r[0] for r in col_rows}
    except Exception as e:
        print(f"[audit-logs] SCHEMA DISCOVERY ERROR: {e}")
        actual_cols = set()

    print(f"[audit-logs] denetim_izleri columns: {sorted(actual_cols)}")

    # ── Adım 2: Kolon adlarını tespit et (iki olası şema versiyonu) ─────────────
    # Şema A (eski model): islem_yapan_id, eylem, hedef_tablo, hedef_id, eski_veri, yeni_veri, created_at
    # Şema B (yeni şema) : user_id,        aksiyon, tablo_adi, kayit_id, eski_deger, yeni_deger, tarih
    if "user_id" in actual_cols:
        C_USER   = "user_id"
        C_EYLEM  = "aksiyon"
        C_TABLO  = "tablo_adi"
        C_KID    = "kayit_id"
        C_ESKI   = "eski_deger"
        C_YENI   = "yeni_deger"
        C_TARIH  = "tarih"
    elif "islem_yapan_id" in actual_cols:
        C_USER   = "islem_yapan_id"
        C_EYLEM  = "eylem"
        C_TABLO  = "hedef_tablo"
        C_KID    = "hedef_id"
        C_ESKI   = "eski_veri"
        C_YENI   = "yeni_veri"
        C_TARIH  = "created_at"
    else:
        # Tablo yok ya da tamamen farklı — boş dön, gerçek kolon listesini logla
        print(f"[audit-logs] UNKNOWN SCHEMA — actual cols: {sorted(actual_cols)}")
        return {"data": [], "total": 0, "page": page, "page_size": page_size,
                "_debug_cols": sorted(actual_cols)}

    # ── Adım 3: Override / tarih filtreleri ─────────────────────────────────────
    aksiyon_filter_sql = ""
    if only_overrides:
        aksiyon_filter_sql = f"AND di.{C_EYLEM}::text IN ('override','xp_correction')"

    # asyncpg tip kuralı: tarih parametreleri Python datetime.date nesnesi olmalı.
    # "date + INTERVAL" SQL ifadesi asyncpg'de tip belirsizliği yaratır →
    # to_date'e +1 gün Python'da eklenir, sorguya saf datetime.date geçilir.
    params: dict = {"lim": page_size, "off": (page - 1) * page_size}
    if from_date or to_date:
        date_parts = []
        if from_date:
            date_parts.append(f"di.{C_TARIH} >= :from_date")
            params["from_date"] = date_type.fromisoformat(from_date)
        if to_date:
            # bitiş günü dahil: to_date < (to_date + 1 gün)
            date_parts.append(f"di.{C_TARIH} < :to_date")
            params["to_date"] = date_type.fromisoformat(to_date) + timedelta(days=1)
        date_sql = "AND " + " AND ".join(date_parts)
    else:
        date_sql = f"AND di.{C_TARIH} >= CURRENT_DATE - INTERVAL '7 days'"

    base_sql = f"""
        FROM denetim_izleri di
        JOIN kullanicilar  u ON u.id = CAST(di.{C_USER} AS uuid)
        JOIN roller        r ON r.id = u.rol_id
        WHERE LOWER(r.ad) IN ('supervisor', 'admin')
          {date_sql}
          {aksiyon_filter_sql}
    """

    # ── Adım 4: Sorguları çalıştır ──────────────────────────────────────────────
    try:
        total_row = (await db.execute(
            text(f"SELECT COUNT(*) {base_sql}"), params
        )).scalar() or 0
    except Exception as e:
        print(f"[audit-logs] COUNT ERROR: {e}")
        print(f"[audit-logs] COUNT SQL: SELECT COUNT(*) {base_sql}")
        raise HTTPException(status_code=500, detail=f"Audit log sayım hatası: {str(e)}")

    try:
        rows = (await db.execute(text(f"""
            SELECT
                di.{C_USER}::text  AS yapan_id,
                di.{C_EYLEM}::text AS aksiyon,
                di.{C_TABLO}       AS tablo_adi,
                di.{C_KID}         AS kayit_id,
                di.{C_ESKI}        AS eski_deger,
                di.{C_YENI}        AS yeni_deger,
                di.{C_TARIH}       AS tarih,
                u.id::text         AS user_id,
                u.ad_soyad         AS user_ad,
                r.ad               AS user_rol
            {base_sql}
            ORDER BY di.{C_TARIH} DESC
            LIMIT :lim OFFSET :off
        """), params)).fetchall()
    except Exception as e:
        print(f"[audit-logs] SELECT ERROR: {e}")
        raise HTTPException(status_code=500, detail=f"Audit log sorgu hatası: {str(e)}")

    data = [
        {
            "id":         r.yapan_id,
            "aksiyon":    r.aksiyon,
            "tablo_adi":  r.tablo_adi,
            "kayit_id":   r.kayit_id,
            "eski_deger": r.eski_deger,
            "yeni_deger": r.yeni_deger,
            "tarih":      r.tarih.isoformat() if r.tarih else None,
            "user_id":    r.user_id,
            "user_ad":    r.user_ad,
            "user_rol":   r.user_rol,
        }
        for r in rows
    ]
    return {"data": data, "total": int(total_row), "page": page, "page_size": page_size}


@router.get("/debug-schema")
async def debug_schema(
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    """
    Geliştirme aracı — denetim_izleri tablosunun gerçek kolon adlarını döndürür.
    Üretimde bu endpoint'i kaldırın.
    """
    rows = (await db.execute(text("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'denetim_izleri'
        ORDER BY ordinal_position
    """))).fetchall()
    return {
        "table": "denetim_izleri",
        "columns": [
            {"name": r[0], "type": r[1], "nullable": r[2]}
            for r in rows
        ],
    }


# ═══════════════════════════ 6. POST · TALİMAT GÖNDER ════════════════════════

@router.post("/talimat")
async def gonder_talimat(
    body: TalimatBody,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(ADMIN),
):
    """
    Supervizöre talimat gönderir:
      · talimatlar tablosuna satır
      · bildirimler tablosuna oncelik=2 (kritik) bildirim → modal düşürür
      · denetim_izleri'ne aksiyon='create'
    """
    # Alıcı supervisor mı doğrula
    role_row = (await db.execute(
        text("""
            SELECT r.ad FROM kullanicilar u
            JOIN roller r ON r.id = u.rol_id
            WHERE u.id = :uid::uuid AND u.silindi_mi = FALSE
        """),
        {"uid": body.alici_id},
    )).fetchone()
    if not role_row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Alıcı bulunamadı")
    if role_row.ad.lower() not in ("supervisor", "personel"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Talimat sadece supervisor veya personele gönderilebilir",
        )

    # talimatlar
    talimat_id = (await db.execute(text("""
        INSERT INTO talimatlar (gonderen_id, alici_id, baslik, icerik, son_teslim, durum)
        VALUES (:gid::uuid, :aid::uuid, :bas, :ic, :son, 'beklemede')
        RETURNING id::text
    """), {
        "gid": str(current_user.id),
        "aid": body.alici_id,
        "bas": body.baslik,
        "ic":  body.icerik,
        "son": body.son_teslim,
    })).scalar()

    # bildirimler — modal-style kritik
    try:
        await db.execute(text("""
            INSERT INTO bildirimler
                (user_id, tip, baslik, mesaj, referans_tablo, referans_id, oncelik)
            VALUES
                (:uid::uuid, 'talimat', :bas, :ic, 'talimatlar', :ref::uuid, 2)
        """), {
            "uid": body.alici_id,
            "bas": f"⚠ ADMIN TALİMAT: {body.baslik}",
            "ic":  body.icerik or "(ek not yok)",
            "ref": talimat_id,
        })
    except Exception:
        pass  # bildirimler tipi enumında 'talimat' yoksa atla

    await _audit(
        db, str(current_user.id), "talimatlar", talimat_id, "create",
        eski={},
        yeni={"alici_id": body.alici_id, "baslik": body.baslik},
    )
    await db.commit()
    return {"ok": True, "talimat_id": talimat_id}


# ═══════════════════════════ 7. POST · OVERRIDE PENDING ══════════════════════

@router.post("/override-pending")
async def override_pending(
    body: OverridePendingBody,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(ADMIN),
):
    """
    Bir supervizörün bekleyen mola/vardiya taleplerini Admin tek tıkla
    toplu onaylar/reddeder. Audit log'a her satır için kayıt atar.
    """
    new_status_mola    = "onaylandi"   if body.action == "approve" else "reddedildi"
    new_status_vardiya = "onaylandi"   if body.action == "approve" else "reddedildi"

    affected_mola = 0
    affected_vardiya = 0

    # Mola
    if body.scope in ("mola", "all"):
        mola_rows = (await db.execute(text("""
            UPDATE molalar
            SET onay_durumu = :stat, supervisor_id = :sid::uuid
            WHERE onay_durumu = 'beklemede'
              AND user_id IN (
                  SELECT u.id FROM kullanicilar u
                  JOIN supervisor_ekip se ON se.ekip_id = u.ekip_id
                  WHERE se.supervisor_id = :sid::uuid
              )
            RETURNING id::text AS id
        """), {"stat": new_status_mola, "sid": body.supervisor_id})).fetchall()
        affected_mola = len(mola_rows)
        for row in mola_rows:
            await _audit(
                db, str(current_user.id), "molalar", row.id, "override",
                eski={"onay_durumu": "beklemede"},
                yeni={"onay_durumu": new_status_mola,
                      "sebep": body.reason, "yapan": "admin_bulk"},
            )

    # Vardiya
    if body.scope in ("vardiya", "all"):
        vard_status = "onaylandi" if body.action == "approve" else "reddedildi"
        try:
            vard_rows = (await db.execute(text("""
                UPDATE vardiya_talepleri
                SET durum = :stat::durum_vardiya_talep, admin_id = :aid::uuid
                WHERE durum::text = 'incelemede'
                  AND user_id IN (
                      SELECT u.id FROM kullanicilar u
                      JOIN supervisor_ekip se ON se.ekip_id = u.ekip_id
                      WHERE se.supervisor_id = :sid::uuid
                  )
                RETURNING id::text AS id
            """), {
                "stat": vard_status, "aid": str(current_user.id),
                "sid":  body.supervisor_id,
            })).fetchall()
            affected_vardiya = len(vard_rows)
            for row in vard_rows:
                await _audit(
                    db, str(current_user.id), "vardiya_talepleri", row.id, "override",
                    eski={"durum": "incelemede"},
                    yeni={"durum": vard_status,
                          "sebep": body.reason, "yapan": "admin_bulk"},
                )
        except Exception:
            pass  # enum değer farkı

    await db.commit()
    return {
        "ok": True,
        "supervisor_id": body.supervisor_id,
        "action":        body.action,
        "affected_mola":    affected_mola,
        "affected_vardiya": affected_vardiya,
    }


# ═══════════════════════════ 8. POST · TRAINING FLAG ═════════════════════════

@router.post("/training-flag")
async def training_flag(
    body: TrainingFlagBody,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(ADMIN),
):
    """
    Personeli eğitime gönder — talimatlar'a kayıt + audit.
    """
    # Kullanıcının var olduğunu doğrula (FK ihlalinden kaçın)
    exists = (await db.execute(
        text("SELECT 1 FROM kullanicilar WHERE id = CAST(:uid AS uuid) AND silindi_mi = FALSE"),
        {"uid": body.user_id},
    )).fetchone()
    if not exists:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Personel bulunamadı")

    # talimatlar.durum enum değeri sisteme göre değişebilir; SAVEPOINT ile güvenli INSERT
    talimat_id = None
    try:
        await db.execute(text("SAVEPOINT _tf_sp"))
        talimat_id = (await db.execute(text("""
            INSERT INTO talimatlar (gonderen_id, alici_id, baslik, icerik, durum)
            VALUES (CAST(:gid AS uuid), CAST(:aid AS uuid),
                    'Eğitim Programı — Düşük CSAT/Duygu Skorlu Çağrı',
                    :ic, 'beklemede')
            RETURNING id::text
        """), {
            "gid": str(current_user.id),
            "aid": body.user_id,
            "ic":  f"Sebep: {body.neden}\nReferans çağrı: {body.cagri_id or '—'}",
        })).scalar()
        await db.execute(text("RELEASE SAVEPOINT _tf_sp"))
    except Exception:
        # durum enum'u 'beklemede' değil; fallback: enum cast olmadan dene
        try:
            await db.execute(text("ROLLBACK TO SAVEPOINT _tf_sp"))
            await db.execute(text("SAVEPOINT _tf_sp2"))
            talimat_id = (await db.execute(text("""
                INSERT INTO talimatlar (gonderen_id, alici_id, baslik, icerik)
                VALUES (CAST(:gid AS uuid), CAST(:aid AS uuid),
                        'Eğitim Programı — Düşük CSAT/Duygu Skorlu Çağrı', :ic)
                RETURNING id::text
            """), {
                "gid": str(current_user.id),
                "aid": body.user_id,
                "ic":  f"Sebep: {body.neden}\nReferans çağrı: {body.cagri_id or '—'}",
            })).scalar()
            await db.execute(text("RELEASE SAVEPOINT _tf_sp2"))
        except Exception as e2:
            try:
                await db.execute(text("ROLLBACK TO SAVEPOINT _tf_sp2"))
            except Exception:
                pass
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                f"Eğitim kaydı oluşturulamadı: {e2}",
            )

    await _audit(
        db, str(current_user.id), "talimatlar", talimat_id, "create",
        eski={},
        yeni={"tip": "training_flag", "user_id": body.user_id,
              "cagri_id": body.cagri_id, "neden": body.neden},
    )
    await db.commit()
    return {"ok": True, "talimat_id": talimat_id}
