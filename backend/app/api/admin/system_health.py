"""
Admin · Sistem Sağlığı & AI İçgörüler
──────────────────────────────────────
GET /admin/system/ai-insights

Gerçek DB şemasına göre yazılmış sorgular:
  · cagri_kayitlari  : baslangic_zamani (DateTime naive), csat_skoru (int),
                       durum (varchar), user_id (UUID)
  · kullanicilar     : id, ad_soyad, dahili_no, silindi_mi
  · sistem_metrikleri: opsiyonel (SAVEPOINT ile güvenli)
  · v_personel_anlik : opsiyonel view (SAVEPOINT ile güvenli)

Not: datetime.utcnow() kullanılır — asyncpg TIMESTAMP WITHOUT TIME ZONE uyumu.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.async_session import get_async_db
from app.api.deps import require_admin
from app.models.user import User

log    = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/system", tags=["Admin · Sistem Sağlığı"])
ADMIN  = require_admin

RENK = {
    "yesil":   {"color": "#10b981", "bg": "rgba(16,185,129,0.08)",  "label": "Sağlıklı"},
    "sari":    {"color": "#f59e0b", "bg": "rgba(245,158,11,0.08)",  "label": "Dikkat"},
    "kirmizi": {"color": "#ef4444", "bg": "rgba(239,68,68,0.08)",   "label": "Kritik"},
}


def _saglik(yuzde: float | None) -> str:
    if yuzde is None:
        return "yesil"
    if yuzde >= 90:
        return "kirmizi"
    if yuzde >= 70:
        return "sari"
    return "yesil"


async def _sp_exec(db: AsyncSession, name: str, sql: str, params: dict | None = None):
    """
    SAVEPOINT ile izole sorgu çalıştırır.
    Tablo/view yoksa ya da hata olursa None döner, session bozulmaz.
    """
    try:
        await db.execute(text(f"SAVEPOINT {name}"))
        result = await db.execute(text(sql), params or {})
        await db.execute(text(f"RELEASE SAVEPOINT {name}"))
        return result
    except Exception as exc:
        log.debug("_sp_exec [%s] failed: %s", name, exc)
        try:
            await db.execute(text(f"ROLLBACK TO SAVEPOINT {name}"))
        except Exception:
            pass
        return None


@router.get("/ai-insights")
async def ai_insights(
    db: AsyncSession = Depends(get_async_db),
    _:  User         = Depends(ADMIN),
):
    # timezone-naive UTC datetime — TIMESTAMP WITHOUT TIME ZONE kolonlarıyla uyumlu
    now         = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yest_start  = today_start - timedelta(days=1)
    week_ago    = today_start - timedelta(days=7)

    # ── 1. Sistem metrikleri (opsiyonel — tablo olmayabilir) ──────────────────
    sm_res = await _sp_exec(db, "_sm_sp", """
        SELECT * FROM sistem_metrikleri
        ORDER BY guncelleme_tarihi DESC LIMIT 1
    """)
    sistem_row = sm_res.fetchone() if sm_res else None

    aktif_kanal  = int(getattr(sistem_row, "aktif_kanal",             0) or 0)
    trunk_limiti = int(getattr(sistem_row, "trunk_limiti",           30) or 30)
    cpu_pct      = float(getattr(sistem_row, "cpu_kullanim_yuzde",    0) or 0)
    bellek_pct   = float(getattr(sistem_row, "bellek_kullanim_yuzde", 0) or 0)
    trunk_pct    = round(aktif_kanal / max(trunk_limiti, 1) * 100, 1)

    sistem_kartlar = [
        {
            "baslik": "Trunk Hat",
            "deger":  f"{aktif_kanal}/{trunk_limiti}",
            "alt":    "aktif / toplam kanal",
            "renk":   _saglik(trunk_pct),
            **RENK[_saglik(trunk_pct)],
        },
        {
            "baslik": "CPU",
            "deger":  f"%{int(cpu_pct)}",
            "alt":    "anlık kullanım",
            "renk":   _saglik(cpu_pct),
            **RENK[_saglik(cpu_pct)],
        },
        {
            "baslik": "Bellek",
            "deger":  f"%{int(bellek_pct)}",
            "alt":    "anlık kullanım",
            "renk":   _saglik(bellek_pct),
            **RENK[_saglik(bellek_pct)],
        },
        {
            "baslik": "Veritabanı",
            "deger":  "Aktif",
            "alt":    "PostgreSQL bağlantısı",
            "renk":   "yesil",
            **RENK["yesil"],
        },
    ]

    # ── 2. Bugün vs Dün çağrı özeti ─────────────────────────────────────────
    # cagri_kayitlari.baslangic_zamani = DateTime (TIMESTAMP WITHOUT TZ) ✓
    bugun_row = (await db.execute(text("""
        SELECT
            COUNT(*)::int                                                AS toplam,
            COUNT(*) FILTER (
                WHERE durum IN ('cevaplandi','aktarildi')
            )::int                                                       AS cevaplanan,
            ROUND(
                AVG(csat_skoru) FILTER (WHERE csat_skoru IS NOT NULL),
                2
            )                                                            AS ort_csat
        FROM cagri_kayitlari
        WHERE baslangic_zamani >= :bas
          AND baslangic_zamani <  :bit
    """), {"bas": today_start, "bit": now})).fetchone()

    dun_row = (await db.execute(text("""
        SELECT COUNT(*)::int AS toplam
        FROM cagri_kayitlari
        WHERE baslangic_zamani >= :bas
          AND baslangic_zamani <  :bit
    """), {"bas": yest_start, "bit": today_start})).fetchone()

    bugun_toplam = int(bugun_row.toplam    or 0)
    bugun_cevap  = int(bugun_row.cevaplanan or 0)
    bugun_csat   = float(bugun_row.ort_csat or 0)
    dun_toplam   = int(dun_row.toplam      or 0)
    fark_yuzde   = round((bugun_toplam - dun_toplam) / max(dun_toplam, 1) * 100, 1)
    cevaplama    = round(bugun_cevap / max(bugun_toplam, 1) * 100, 1)

    cagri_ozeti = {
        "bugun":           bugun_toplam,
        "dun":             dun_toplam,
        "fark_yuzde":      fark_yuzde,
        "cevaplama_orani": cevaplama,
        "ort_csat":        bugun_csat,
    }

    # ── 3. Saatlik trend (son 7 gün ortalaması vs bugün) ─────────────────────
    hft_res = (await db.execute(text("""
        SELECT
            EXTRACT(HOUR FROM baslangic_zamani)::int AS saat,
            (COUNT(*)::float / 7)                    AS ort
        FROM cagri_kayitlari
        WHERE baslangic_zamani >= :bas
        GROUP BY EXTRACT(HOUR FROM baslangic_zamani)
        ORDER BY saat
    """), {"bas": week_ago})).fetchall()

    bug_res = (await db.execute(text("""
        SELECT
            EXTRACT(HOUR FROM baslangic_zamani)::int AS saat,
            COUNT(*)::int                            AS cagri
        FROM cagri_kayitlari
        WHERE baslangic_zamani >= :bas
        GROUP BY EXTRACT(HOUR FROM baslangic_zamani)
        ORDER BY saat
    """), {"bas": today_start})).fetchall()

    saatlik_trend     = [{"saat": r.saat, "ort": round(float(r.ort), 1)} for r in hft_res]
    bugun_saatlik     = [{"saat": r.saat, "cagri": r.cagri} for r in bug_res]

    avg_map   = {r.saat: float(r.ort) for r in hft_res}
    cur_ort   = avg_map.get(now.hour,     1.0)
    next_ort  = avg_map.get(now.hour + 1, cur_ort)
    yog_delta = round((next_ort - cur_ort) / max(cur_ort, 1) * 100, 1)

    # ── 4. En düşük CSAT'li personel (son 7 gün, min 5 çağrı) ───────────────
    # Gerçek şema: cagri_kayitlari.csat_skoru (Integer), kullanicilar.ad_soyad
    dusuk_res = (await db.execute(text("""
        SELECT
            u.ad_soyad,
            u.dahili_no,
            ROUND(AVG(c.csat_skoru), 2) AS ort_csat,
            COUNT(c.id)::int            AS cagri_sayisi
        FROM cagri_kayitlari c
        JOIN kullanicilar u ON u.id = c.user_id
        WHERE c.baslangic_zamani >= :bas
          AND c.csat_skoru IS NOT NULL
          AND u.silindi_mi = FALSE
        GROUP BY u.id, u.ad_soyad, u.dahili_no
        HAVING COUNT(c.id) >= 5
        ORDER BY ort_csat ASC
        LIMIT 5
    """), {"bas": week_ago})).fetchall()

    dusuk_csat = [
        {
            "ad_soyad":    r.ad_soyad,
            "dahili_no":   r.dahili_no,
            "ort_csat":    float(r.ort_csat or 0),
            "cagri_sayisi": r.cagri_sayisi,
        }
        for r in dusuk_res
    ]

    # ── 5. Mola aşımı (opsiyonel — view olmayabilir) ─────────────────────────
    ma_res = await _sp_exec(db, "_ma_sp", """
        SELECT COUNT(*)::int FROM v_personel_anlik WHERE mola_asimi = TRUE
    """)
    mola_asimi = int(ma_res.scalar() or 0) if ma_res else 0

    # ── 6. Risk uyarıları ─────────────────────────────────────────────────────
    riskler: list[dict] = []

    if yog_delta > 15:
        riskler.append({
            "seviye": "uyari",
            "ikon":   "📈",
            "mesaj":  f"Saat {now.hour + 1:02d}:00'de çağrı yoğunluğu ~%{int(abs(yog_delta))} artabilir",
        })
    if mola_asimi > 0:
        riskler.append({
            "seviye": "kritik",
            "ikon":   "⏰",
            "mesaj":  f"{mola_asimi} personel mola süresini aşıyor",
        })
    if dun_toplam > 0 and fark_yuzde > 20:
        riskler.append({
            "seviye": "uyari",
            "ikon":   "⚡",
            "mesaj":  f"Bugün dünden %{int(fark_yuzde)} fazla çağrı — kapasite takibi önerilir",
        })
    if bugun_toplam > 0 and cevaplama < 80:
        riskler.append({
            "seviye": "kritik",
            "ikon":   "🚨",
            "mesaj":  f"Cevaplama oranı %{cevaplama} — SLA riski",
        })
    if trunk_pct >= 80:
        riskler.append({
            "seviye": "kirmizi" if trunk_pct >= 90 else "uyari",
            "ikon":   "📡",
            "mesaj":  f"Trunk hat doluluk oranı %{int(trunk_pct)} — yedek hat kontrolü",
        })

    if not riskler:
        riskler.append({
            "seviye": "tamam",
            "ikon":   "✅",
            "mesaj":  "Tüm göstergeler normal sınırlar içinde",
        })

    return {
        "sistem":           sistem_kartlar,
        "cagri_ozeti":      cagri_ozeti,
        "saatlik_trend":    saatlik_trend,
        "bugun_saatlik":    bugun_saatlik,
        "dusuk_csat":       dusuk_csat,
        "riskler":          riskler,
        "mola_asimi_count": mola_asimi,
    }
