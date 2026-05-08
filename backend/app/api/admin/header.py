"""
Admin Header — Canlı Nabız Endpoint'leri
─────────────────────────────────────────
GET /admin/header/live             → 4 widget için tek çekimde tüm veri
GET /admin/header/critical-alerts  → çan popup'ı için kritik bildirim listesi
GET /admin/header/search?q=...     → omni-search (çağrı / müşteri / personel)

Şema gerçekleri (son_veritabani_yedek-1778176418368.sql):
  · sistem_metrik_gecmisi : aktif_kanal_sayisi, trunk_limiti, alarm_aktif,
                            cpu_kullanimi, ram_kullanimi,
                            toplam_kuyruk_bekleyen, olcum_zamani
  · bildirimler           : id, user_id, hedef_rol (bildirim_hedef enum / NULL),
                            hedef_departman_id, tip (bildirim_tipi enum),
                            baslik, mesaj, referans_tablo, referans_id,
                            okundu_mu (bool), okunma_zamani, oncelik (int),
                            olusturma_tarihi
  · aktif_kuyruk_bekleyenler : id, queue_id, arayan_numara, musteri_id,
                               giris_zamani, oncelik, onceki_birakmalar
  · musteriler            : id, telefon, ad_soyad, toplam_cagri, ort_csat,
                            segment, son_arama_zamani
  · cagri_kayitlari       : id, asterisk_id, user_id, musteri_id,
                            baslangic_zamani, durum, konusma_suresi
  · v_personel_anlik      : id (= kullanicilar.id), anlik_durum (durum_personel enum)
"""
from __future__ import annotations

import re

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.async_session import get_async_db
from app.api.deps import require_admin
from app.models.user import User

router = APIRouter(prefix="/admin/header", tags=["Admin · Header"])
ADMIN = require_admin
DEPT  = "Müşteri Hizmetleri"

_UUID_RE  = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)
_PHONE_RE = re.compile(r"^\+?[\d\s\-]{7,}$")


# ──────────────────────────────────────────────────────────────────────────────
# 1. LIVE PULSE
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/live")
async def header_live(
    db: AsyncSession = Depends(get_async_db),
    _:  User         = Depends(ADMIN),
):
    """
    Tek istekte header için gereken tüm canlı veriler:
    - Personel durum dağılımı (MH departmanı)
    - Kuyruk bekleyen sayısı
    - Sistem metrik gecmisi'nden en son kayıt
    - Kritik okunmamış bildirim sayısı
    """

    # 1. Personel durum (MH)
    personel = (await db.execute(text("""
        SELECT
            COUNT(*) FILTER (WHERE vp.anlik_durum::text = 'aktif')   AS aktif,
            COUNT(*) FILTER (WHERE vp.anlik_durum::text = 'mola')    AS mola,
            COUNT(*) FILTER (WHERE vp.anlik_durum::text = 'mesgul')  AS mesgul
        FROM v_personel_anlik vp
        JOIN kullanicilar  u  ON u.id  = vp.id
        JOIN departmanlar  d  ON d.id  = u.departman_id
        WHERE u.silindi_mi = FALSE
          AND d.ad         = :dept
    """), {"dept": DEPT})).fetchone()

    # 2. Kuyruk bekleyen (MH'ye bağlı kuyruklardaki aktif bekleyenler)
    kuyruk_bekleyen = (await db.execute(text("""
        SELECT COUNT(*)::int
        FROM aktif_kuyruk_bekleyenler akb
        JOIN kuyruklar    k ON k.id = akb.queue_id
        JOIN departmanlar d ON d.id = k.departman_id
        WHERE d.ad = :dept
    """), {"dept": DEPT})).scalar() or 0

    # 3. Sistem metrikler — son kayıt
    metrik = (await db.execute(text("""
        SELECT
            aktif_kanal_sayisi,
            trunk_limiti,
            alarm_aktif,
            cpu_kullanimi,
            ram_kullanimi,
            toplam_kuyruk_bekleyen,
            olcum_zamani
        FROM sistem_metrik_gecmisi
        ORDER BY olcum_zamani DESC
        LIMIT 1
    """))).fetchone()

    # 4. Kritik bildirim sayısı — admin'e veya BT'ye yönelik, okunmamış, oncelik=2
    kritik_sayi = (await db.execute(text("""
        SELECT COUNT(*)::int
        FROM bildirimler
        WHERE oncelik   = 2
          AND okundu_mu = FALSE
    """))).scalar() or 0

    # Sağlık rengi hesapla
    saglik_rengi = "yesil"
    if metrik:
        cpu      = float(metrik.cpu_kullanimi  or 0)
        ram      = float(metrik.ram_kullanimi  or 0)
        alarm    = bool(metrik.alarm_aktif)
        kapasite = (int(metrik.aktif_kanal_sayisi or 0)
                    / max(int(metrik.trunk_limiti or 1), 1) * 100)
        if alarm or cpu > 85 or ram > 85 or kapasite > 90:
            saglik_rengi = "kirmizi"
        elif cpu > 70 or ram > 70 or kapasite > 75:
            saglik_rengi = "sari"

    aktif_kanal  = int(metrik.aktif_kanal_sayisi or 0) if metrik else 0
    trunk_limiti = int(metrik.trunk_limiti       or 0) if metrik else 0

    return {
        "personel": {
            "aktif":  int(personel.aktif  or 0),
            "mola":   int(personel.mola   or 0),
            "mesgul": int(personel.mesgul or 0),
        },
        "kuyruk_bekleyen": kuyruk_bekleyen,
        "sistem": {
            "aktif_kanal":      aktif_kanal,
            "trunk_limiti":     trunk_limiti,
            "kapasite_yuzde":   round(aktif_kanal / max(trunk_limiti, 1) * 100, 1),
            "cpu":              float(metrik.cpu_kullanimi or 0) if metrik else 0.0,
            "ram":              float(metrik.ram_kullanimi or 0) if metrik else 0.0,
            "alarm_aktif":      bool(metrik.alarm_aktif)         if metrik else False,
            "saglik_rengi":     saglik_rengi,
            "olcum_zamani":     metrik.olcum_zamani.isoformat()  if metrik and metrik.olcum_zamani else None,
        },
        "kritik_bildirim_sayisi": kritik_sayi,
    }


# ──────────────────────────────────────────────────────────────────────────────
# 2. KRİTİK UYARI LİSTESİ
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/critical-alerts")
async def critical_alerts(
    limit: int       = Query(20, ge=1, le=50),
    db:    AsyncSession = Depends(get_async_db),
    _:     User         = Depends(ADMIN),
):
    """Çan popup'ı için okunmamış kritik (oncelik=2) bildirimler."""
    rows = (await db.execute(text("""
        SELECT
            id::text,
            tip::text           AS tip,
            baslik,
            mesaj,
            oncelik,
            okundu_mu,
            olusturma_tarihi
        FROM bildirimler
        WHERE oncelik   = 2
          AND okundu_mu = FALSE
        ORDER BY olusturma_tarihi DESC
        LIMIT :lim
    """), {"lim": limit})).fetchall()

    return [
        {
            "id":        r.id,
            "tip":       r.tip,
            "baslik":    r.baslik,
            "mesaj":     r.mesaj,
            "oncelik":   int(r.oncelik),
            "okundu_mu": bool(r.okundu_mu),
            "tarih":     r.olusturma_tarihi.isoformat() if r.olusturma_tarihi else None,
        }
        for r in rows
    ]


# ──────────────────────────────────────────────────────────────────────────────
# 3. OMNI-SEARCH
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/search")
async def omni_search(
    q:     str          = Query(..., min_length=2, max_length=100),
    limit: int          = Query(5,  ge=1, le=20),
    db:    AsyncSession = Depends(get_async_db),
    _:     User         = Depends(ADMIN),
):
    """
    Üç modda çalışır:
    - UUID  → cagri_kayitlari.id ile direkt eşleştirme
    - Telefon pattern → musteriler.telefon ILIKE
    - Diğer  → kullanicilar.ad_soyad + musteriler.ad_soyad ILIKE
    """
    q_stripped = q.strip()
    results    = {"cagrilar": [], "personel": [], "musteriler": []}

    if _UUID_RE.match(q_stripped):
        rows = (await db.execute(text("""
            SELECT
                c.id::text,
                c.baslangic_zamani,
                c.durum::text      AS durum,
                c.konusma_suresi,
                u.ad_soyad         AS personel_ad,
                m.telefon          AS musteri_tel,
                m.ad_soyad         AS musteri_ad
            FROM cagri_kayitlari c
            LEFT JOIN kullanicilar u ON u.id = c.user_id
            LEFT JOIN musteriler   m ON m.id = c.musteri_id
            WHERE c.id = :uuid::uuid
            LIMIT :lim
        """), {"uuid": q_stripped, "lim": limit})).fetchall()

        results["cagrilar"] = [
            {
                "id":          r.id,
                "tarih":       r.baslangic_zamani.isoformat() if r.baslangic_zamani else None,
                "durum":       r.durum,
                "sure":        int(r.konusma_suresi or 0),
                "personel":    r.personel_ad,
                "musteri_tel": r.musteri_tel,
                "musteri_ad":  r.musteri_ad,
            }
            for r in rows
        ]

    elif _PHONE_RE.match(q_stripped):
        phone_q = q_stripped.replace(" ", "").replace("-", "")
        rows = (await db.execute(text("""
            SELECT
                m.id::text,
                m.telefon,
                m.ad_soyad,
                m.toplam_cagri,
                m.ort_csat,
                m.segment
            FROM musteriler m
            WHERE REPLACE(REPLACE(m.telefon, ' ', ''), '-', '') ILIKE :tel
            ORDER BY m.son_arama_zamani DESC NULLS LAST
            LIMIT :lim
        """), {"tel": f"%{phone_q}%", "lim": limit})).fetchall()

        results["musteriler"] = [
            {
                "id":           r.id,
                "telefon":      r.telefon,
                "ad_soyad":     r.ad_soyad,
                "toplam_cagri": int(r.toplam_cagri or 0),
                "ort_csat":     float(r.ort_csat or 0),
                "segment":      r.segment,
            }
            for r in rows
        ]

    else:
        like_q = f"%{q_stripped}%"

        personel_rows = (await db.execute(text("""
            SELECT
                u.id::text,
                u.ad_soyad,
                u.dahili_no,
                u.unvan,
                vp.anlik_durum::text AS durum
            FROM kullanicilar u
            LEFT JOIN v_personel_anlik vp ON vp.id = u.id
            WHERE u.silindi_mi = FALSE
              AND u.ad_soyad ILIKE :q
            ORDER BY u.ad_soyad
            LIMIT :lim
        """), {"q": like_q, "lim": limit})).fetchall()

        results["personel"] = [
            {
                "id":        r.id,
                "ad_soyad":  r.ad_soyad,
                "dahili_no": r.dahili_no,
                "unvan":     r.unvan,
                "durum":     r.durum,
            }
            for r in personel_rows
        ]

        musteri_rows = (await db.execute(text("""
            SELECT
                m.id::text,
                m.telefon,
                m.ad_soyad,
                m.toplam_cagri,
                m.ort_csat,
                m.segment
            FROM musteriler m
            WHERE m.ad_soyad ILIKE :q
            ORDER BY m.son_arama_zamani DESC NULLS LAST
            LIMIT :lim
        """), {"q": like_q, "lim": limit})).fetchall()

        results["musteriler"] = [
            {
                "id":           r.id,
                "telefon":      r.telefon,
                "ad_soyad":     r.ad_soyad,
                "toplam_cagri": int(r.toplam_cagri or 0),
                "ort_csat":     float(r.ort_csat or 0),
                "segment":      r.segment,
            }
            for r in musteri_rows
        ]

    return results
