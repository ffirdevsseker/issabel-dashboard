"""
Admin · Genel Bakış Komuta Merkezi
────────────────────────────────────
GET /admin/overview/command       → 4 hero KPI + trunk + uyarı tetikleyicileri
GET /admin/overview/hourly        → Saatlik trafik (grafik + mesai_disi flag)
GET /admin/overview/missed-calls  → Kaçan / mesai dışı çağrılar listesi

Şema notu:
  · cagri_kayitlari.bekleme_suresi   = saniye cinsinden bekleme
  · SLA eşiği                        = 45 sn (sabite bağlı)
  · Tahmini ciro kaybı               = CIRO_PER_CAGRI * kaçan_çağrı_sayısı
  · sistem_metrikleri                = tek satır anlık sistem durumu
  · v_gunluk_cagri_ozeti             = (gun, toplam_cagri, cevaplanan, ort_csat)
  · v_saatlik_yogunluk               = (saat, toplam, cevaplanan, kacan, ort_bekleme_sn)
  · v_kuyruk_anlik                   = (bekleyen_sayisi, ort_bekleme_sn, …)
  · aktif_kuyruk_bekleyenler         = canlı kuyruk satırları
"""
from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.async_session import get_async_db
from app.api.deps import require_admin
from app.models.user import User

router = APIRouter(prefix="/admin/overview", tags=["Admin · Genel Bakış"])
ADMIN = require_admin
DEPT  = "Müşteri Hizmetleri"

SLA_ESIK_SN   = 45     # SLA eşiği (saniye)
CIRO_PER_CAGRI = 50.0  # ₺ — kaçan başına tahmini ciro kaybı

# Mesai saatleri (saat cinsinden)
MESAI_BAS = 8
MESAI_BIT = 18


def _mask(num: str | None) -> str:
    if not num:
        return "—"
    s = str(num).strip()
    return s[:4] + "***" + s[-3:] if len(s) >= 7 else "***"


# ──────────────────────────────────────────────────────────────────────────────
# 1. COMMAND  —  Hero KPI'lar
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/command")
async def command_metrics(
    db: AsyncSession = Depends(get_async_db),
    _:  User         = Depends(ADMIN),
):
    """
    Dört hero kart + trunk doluluk + uyarı tetikleyicileri.
    Tüm sorgular MH departmanına sınırlı.
    """

    # ── 1. Bugünkü çağrı özeti + SLA ─────────────────────────────────────────
    bugun_row = (await db.execute(text("""
        SELECT
            COUNT(*)::int                                                         AS toplam,
            COUNT(*) FILTER (WHERE durum::text IN ('cevaplandi','aktarildi'))::int AS cevaplanan,
            COUNT(*) FILTER (WHERE durum::text IN ('cevaplanmadi','mesgul'))::int  AS kacan,
            -- SLA: cevaplanan ve bekleme_suresi <= eşik
            COUNT(*) FILTER (
                WHERE durum::text IN ('cevaplandi','aktarildi')
                  AND bekleme_suresi IS NOT NULL
                  AND bekleme_suresi <= :esik
            )::int                                                                AS sla_karsilayan,
            COUNT(*) FILTER (
                WHERE durum::text IN ('cevaplandi','aktarildi')
                  AND bekleme_suresi IS NOT NULL
            )::int                                                                AS sla_toplam,
            ROUND(AVG(csat_skoru) FILTER (WHERE csat_skoru IS NOT NULL)::numeric, 2)::float
                                                                                  AS ort_csat
        FROM cagri_kayitlari c
        JOIN departmanlar d ON d.id = c.departman_id
        WHERE d.ad = :dept
          AND c.baslangic_zamani >= CURRENT_DATE
          AND c.baslangic_zamani <  CURRENT_DATE + INTERVAL '1 day'
    """), {"dept": DEPT, "esik": SLA_ESIK_SN})).fetchone()

    # ── 2. Dünkü toplam (trend için) ─────────────────────────────────────────
    dun_toplam = (await db.execute(text("""
        SELECT COUNT(*)::int AS toplam
        FROM cagri_kayitlari c
        JOIN departmanlar d ON d.id = c.departman_id
        WHERE d.ad = :dept
          AND c.baslangic_zamani >= CURRENT_DATE - INTERVAL '1 day'
          AND c.baslangic_zamani <  CURRENT_DATE
    """), {"dept": DEPT})).scalar() or 0

    # ── 3. Anlık kuyruk bekleyen (MH) ─────────────────────────────────────────
    kuyruk_row = (await db.execute(text("""
        SELECT
            COUNT(*)::int                                                       AS bekleyen,
            COALESCE(
                AVG(EXTRACT(EPOCH FROM (NOW() - akb.giris_zamani)))::int,
                0
            )                                                                   AS ort_bekleme_sn,
            COALESCE(
                MAX(EXTRACT(EPOCH FROM (NOW() - akb.giris_zamani)))::int,
                0
            )                                                                   AS max_bekleme_sn
        FROM aktif_kuyruk_bekleyenler akb
        JOIN kuyruklar    k ON k.id = akb.queue_id
        JOIN departmanlar d ON d.id = k.departman_id
        WHERE d.ad = :dept
    """), {"dept": DEPT})).fetchone()

    # ── 4. Trunk doluluk ─────────────────────────────────────────────────────
    trunk_row = None
    try:
        trunk_row = (await db.execute(text("""
            SELECT aktif_kanal_sayisi, trunk_limiti, alarm_aktif,
                   COALESCE(cpu_kullanimi, 0) AS cpu,
                   COALESCE(ram_kullanimi, 0) AS ram
            FROM sistem_metrikleri
            LIMIT 1
        """))).fetchone()
    except Exception:
        pass

    # ── 5. Mola aşımı sayısı ─────────────────────────────────────────────────
    mola_asimi = (await db.execute(text("""
        SELECT COUNT(*)::int
        FROM v_personel_anlik vp
        JOIN kullanicilar u  ON u.id = vp.id
        JOIN departmanlar d  ON d.id = u.departman_id
        WHERE u.silindi_mi = FALSE
          AND d.ad         = :dept
          AND vp.mola_asimi = TRUE
    """), {"dept": DEPT})).scalar() or 0

    # ── Hesaplamalar ─────────────────────────────────────────────────────────
    bugun_toplam  = int(bugun_row.toplam      or 0)
    cevaplanan    = int(bugun_row.cevaplanan  or 0)
    kacan         = int(bugun_row.kacan       or 0)
    sla_karsi     = int(bugun_row.sla_karsilayan or 0)
    sla_toplam    = int(bugun_row.sla_toplam  or 0)
    dun           = int(dun_toplam            or 0)

    degisim_pct = round((bugun_toplam - dun) / dun * 100, 1) if dun > 0 else 0.0
    sla_yuzde   = round(sla_karsi / sla_toplam * 100, 1) if sla_toplam > 0 else 0.0

    bekleyen     = int(kuyruk_row.bekleyen      or 0)
    ort_bekleme  = int(kuyruk_row.ort_bekleme_sn or 0)
    max_bekleme  = int(kuyruk_row.max_bekleme_sn or 0)

    aktif_kanal  = int(trunk_row.aktif_kanal_sayisi or 0) if trunk_row else 0
    trunk_limiti = int(trunk_row.trunk_limiti       or 0) if trunk_row else 0
    alarm_aktif  = bool(trunk_row.alarm_aktif)             if trunk_row else False
    trunk_pct    = round(aktif_kanal / trunk_limiti * 100, 1) if trunk_limiti else 0.0

    # ── Uyarı tetikleyicileri ─────────────────────────────────────────────────
    uyarilar: list[dict] = []
    if trunk_pct > 90 or alarm_aktif:
        uyarilar.append({
            "seviye": "kirmizi",
            "mesaj": f"Trunk kapasitesi kritik: %{trunk_pct} dolu ({aktif_kanal}/{trunk_limiti} kanal)",
        })
    elif trunk_pct > 75:
        uyarilar.append({
            "seviye": "turuncu",
            "mesaj": f"Trunk kapasitesi yüksek: %{trunk_pct} dolu",
        })

    if ort_bekleme > SLA_ESIK_SN:
        uyarilar.append({
            "seviye": "turuncu",
            "mesaj": f"Kuyruk bekleme süresi eşiği aşıldı — ort. {ort_bekleme}sn (eşik: {SLA_ESIK_SN}sn)",
        })

    if bekleyen > 15:
        uyarilar.append({
            "seviye": "turuncu",
            "mesaj": f"Anlık kuyrukta {bekleyen} çağrı bekliyor",
        })

    if mola_asimi > 0:
        uyarilar.append({
            "seviye": "turuncu",
            "mesaj": f"{mola_asimi} personel mola süresini aştı",
        })

    if sla_yuzde < 70 and sla_toplam > 10:
        uyarilar.append({
            "seviye": "kirmizi",
            "mesaj": f"SLA oranı kritik: %{sla_yuzde} (hedef: %80)",
        })

    return {
        "gunluk_cagri": {
            "bugun":        bugun_toplam,
            "dun":          dun,
            "cevaplanan":   cevaplanan,
            "kacan":        kacan,
            "degisim_pct":  degisim_pct,
            "trend":        "up" if degisim_pct >= 0 else "down",
        },
        "sla": {
            "yuzde":         sla_yuzde,
            "esik_sn":       SLA_ESIK_SN,
            "karsilayan":    sla_karsi,
            "toplam":        sla_toplam,
            "hedef_yuzde":   80.0,
            "alarm":         sla_yuzde < 70 and sla_toplam > 10,
        },
        "kacan": {
            "sayi":              kacan,
            "tahmini_ciro":      round(kacan * CIRO_PER_CAGRI, 0),
            "ciro_per_cagri":    CIRO_PER_CAGRI,
            "alarm":             kacan > 20,
        },
        "kuyruk": {
            "bekleyen":      bekleyen,
            "ort_bekleme_sn": ort_bekleme,
            "max_bekleme_sn": max_bekleme,
            "alarm":         ort_bekleme > SLA_ESIK_SN or bekleyen > 20,
        },
        "trunk": {
            "aktif_kanal":   aktif_kanal,
            "trunk_limiti":  trunk_limiti,
            "yuzde":         trunk_pct,
            "alarm_aktif":   alarm_aktif,
            "cpu":           float(trunk_row.cpu or 0) if trunk_row else 0.0,
            "ram":           float(trunk_row.ram or 0) if trunk_row else 0.0,
        },
        "uyarilar": uyarilar,
    }


# ──────────────────────────────────────────────────────────────────────────────
# 2. HOURLY  —  Saatlik trafik grafiği
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/hourly")
async def hourly_traffic(
    db: AsyncSession = Depends(get_async_db),
    _:  User         = Depends(ADMIN),
):
    """
    Saatlik çağrı yoğunluğu — mesai_disi boolean eklenerek döner.
    Mesai saatleri: 08:00–18:00.
    """
    try:
        rows = (await db.execute(text("""
            SELECT
                TO_CHAR(saat, 'HH24:MI')         AS saat_label,
                EXTRACT(HOUR FROM saat)::int       AS saat_no,
                toplam,
                cevaplanan,
                kacan,
                COALESCE(ort_bekleme_sn, 0)        AS ort_bekleme_sn
            FROM v_saatlik_yogunluk
            WHERE saat >= NOW() - INTERVAL '24 hours'
            ORDER BY saat ASC
        """))).fetchall()
    except Exception:
        return []

    return [
        {
            "saat":         row.saat_label,
            "saat_no":      int(row.saat_no),
            "toplam":       int(row.toplam       or 0),
            "cevaplanan":   int(row.cevaplanan   or 0),
            "kacan":        int(row.kacan        or 0),
            "ort_bekleme":  int(row.ort_bekleme_sn or 0),
            "mesai_disi":   not (MESAI_BAS <= int(row.saat_no) < MESAI_BIT),
        }
        for row in rows
    ]


# ──────────────────────────────────────────────────────────────────────────────
# 3. MISSED CALLS  —  Kaçan / mesai dışı çağrılar
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/missed-calls")
async def missed_calls(
    limit:  int  = Query(20, ge=1, le=100),
    sadece_mesai_disi: bool = Query(False),
    db: AsyncSession = Depends(get_async_db),
    _:  User         = Depends(ADMIN),
):
    """
    Kaçan çağrılar (durum = cevaplanmadi / mesgul) ve/veya
    mesai dışı gelen çağrılar. Son 2 gün.
    """
    mesai_filter = "AND c.mesai_disi = TRUE" if sadece_mesai_disi else ""

    try:
        rows = (await db.execute(text(f"""
            SELECT
                c.id::text                                                     AS id,
                c.baslangic_zamani,
                c.durum::text                                                  AS durum,
                c.bekleme_suresi,
                c.mesai_disi,
                COALESCE(m.telefon, c.id::text)                                AS arayan_numara,
                m.ad_soyad                                                     AS musteri_ad,
                k.ad                                                           AS kuyruk_adi,
                k.id::text                                                     AS kuyruk_id
            FROM cagri_kayitlari c
            JOIN departmanlar   d ON d.id = c.departman_id
            LEFT JOIN musteriler m ON m.id = c.musteri_id
            LEFT JOIN kuyruklar  k ON k.id = c.queue_id
            WHERE d.ad = :dept
              AND (c.durum::text IN ('cevaplanmadi','mesgul') OR c.mesai_disi = TRUE)
              AND c.baslangic_zamani >= CURRENT_DATE - INTERVAL '2 days'
              {mesai_filter}
            ORDER BY c.baslangic_zamani DESC
            LIMIT :lim
        """), {"dept": DEPT, "lim": limit})).fetchall()
    except Exception:
        return []

    return [
        {
            "id":            r.id,
            "tarih":         r.baslangic_zamani.isoformat() if r.baslangic_zamani else None,
            "tarih_kisa":    (
                r.baslangic_zamani.strftime("%d.%m %H:%M")
                if r.baslangic_zamani else "—"
            ),
            "durum":         r.durum,
            "mesai_disi":    bool(r.mesai_disi),
            "bekleme_sn":    int(r.bekleme_suresi or 0),
            "arayan_numara": _mask(r.arayan_numara),
            "musteri_ad":    r.musteri_ad,
            "kuyruk_adi":    r.kuyruk_adi or "Genel Kuyruk",
            "kuyruk_id":     r.kuyruk_id,
        }
        for r in rows
    ]
