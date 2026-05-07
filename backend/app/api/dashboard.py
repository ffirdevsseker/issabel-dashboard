from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.async_session import get_async_db
from app.api.deps import require_admin
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

_EMPTY_SUMMARY = {
    "toplam_cagri": 0, "cevaplanan": 0, "kacan": 0,
    "cevaplama_orani": 0.0, "ort_csat": 0.0,
    "ort_bekleme_sn": 0, "ort_konusma_sn": 0,
}
_EMPTY_METRICS = {
    "aktif_kanal": 0, "trunk_limiti": 0,
    "alarm_aktif": False, "cpu": 0.0, "ram": 0.0,
}


@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(require_admin),
):
    try:
        today = date.today().isoformat()
        r = await db.execute(text("""
            SELECT
                COALESCE(SUM(toplam_cagri),  0) AS toplam,
                COALESCE(SUM(cevaplanan),    0) AS cevaplanan,
                COALESCE(SUM(kacan),         0) AS kacan,
                COALESCE(AVG(ort_csat),      0) AS ort_csat,
                COALESCE(AVG(ort_bekleme_sn),0) AS ort_bekleme,
                COALESCE(AVG(ort_konusma_sn),0) AS ort_konusma
            FROM v_gunluk_cagri_ozeti
            WHERE tarih = :today
        """), {"today": today})
        row = r.fetchone()
        if not row or not row.toplam:
            return _EMPTY_SUMMARY
        toplam, cevaplanan = int(row.toplam), int(row.cevaplanan)
        return {
            "toplam_cagri":   toplam,
            "cevaplanan":     cevaplanan,
            "kacan":          int(row.kacan),
            "cevaplama_orani": round(cevaplanan / toplam * 100, 1) if toplam else 0.0,
            "ort_csat":       round(float(row.ort_csat),    2),
            "ort_bekleme_sn": int(row.ort_bekleme),
            "ort_konusma_sn": int(row.ort_konusma),
        }
    except Exception:
        return _EMPTY_SUMMARY


@router.get("/queue-status")
async def get_queue_status(
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(require_admin),
):
    try:
        r = await db.execute(text("""
            SELECT kuyruk_adi, kuyruk_no, bekleyen_sayisi,
                   ort_bekleme_sn, max_bekleme_sn,
                   esik_asimi_sayisi, doluluk_pct, uyari_esigi_sn
            FROM v_kuyruk_anlik
            ORDER BY bekleyen_sayisi DESC
        """))
        return [
            {
                "kuyruk_adi":       row.kuyruk_adi,
                "kuyruk_no":        row.kuyruk_no,
                "bekleyen_sayisi":  int(row.bekleyen_sayisi  or 0),
                "ort_bekleme_sn":   int(row.ort_bekleme_sn   or 0),
                "max_bekleme_sn":   int(row.max_bekleme_sn   or 0),
                "esik_asimi_sayisi":int(row.esik_asimi_sayisi or 0),
                "doluluk_pct":      round(float(row.doluluk_pct or 0), 1),
                "uyari_esigi_sn":   int(row.uyari_esigi_sn   or 0),
            }
            for row in r.fetchall()
        ]
    except Exception:
        return []


@router.get("/agent-status")
async def get_agent_status(
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(require_admin),
):
    try:
        r = await db.execute(text("""
            SELECT ad_soyad, dahili_no, anlik_durum, mola_tipi,
                   mola_sure_dk, mola_asimi, bugun_toplam_cagri,
                   bugun_cevaplanan, bugun_ort_csat,
                   unvan, departman_adi, ekip_adi
            FROM v_personel_anlik
            ORDER BY ad_soyad
        """))
        return [
            {
                "ad_soyad":          row.ad_soyad,
                "dahili_no":         row.dahili_no,
                "anlik_durum":       row.anlik_durum,
                "mola_tipi":         row.mola_tipi,
                "mola_sure_dk":      int(row.mola_sure_dk       or 0),
                "mola_asimi":        bool(row.mola_asimi),
                "bugun_toplam_cagri":int(row.bugun_toplam_cagri or 0),
                "bugun_cevaplanan":  int(row.bugun_cevaplanan   or 0),
                "bugun_ort_csat":    round(float(row.bugun_ort_csat or 0), 2),
                "unvan":             row.unvan,
                "departman_adi":     row.departman_adi,
                "ekip_adi":          row.ekip_adi,
            }
            for row in r.fetchall()
        ]
    except Exception:
        return []


@router.get("/alarms")
async def get_alarms(
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(require_admin),
):
    try:
        r = await db.execute(text("""
            SELECT id, tip, baslik, mesaj, oncelik, olusturma_tarihi
            FROM bildirimler
            WHERE okundu_mu = false AND oncelik >= 1
            ORDER BY oncelik DESC, olusturma_tarihi DESC
            LIMIT 20
        """))
        return [
            {
                "id":               str(row.id),
                "tip":              row.tip,
                "baslik":           row.baslik,
                "mesaj":            row.mesaj,
                "oncelik":          int(row.oncelik),
                "olusturma_tarihi": row.olusturma_tarihi.isoformat()
                                    if row.olusturma_tarihi else None,
            }
            for row in r.fetchall()
        ]
    except Exception:
        return []


@router.get("/system-metrics")
async def get_system_metrics(
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(require_admin),
):
    try:
        r = await db.execute(text("""
            SELECT aktif_kanal, trunk_limiti, alarm_aktif, cpu, ram
            FROM sistem_metrikleri
            LIMIT 1
        """))
        row = r.fetchone()
        if not row:
            return _EMPTY_METRICS
        return {
            "aktif_kanal":  int(row.aktif_kanal   or 0),
            "trunk_limiti": int(row.trunk_limiti   or 0),
            "alarm_aktif":  bool(row.alarm_aktif),
            "cpu":          round(float(row.cpu    or 0), 1),
            "ram":          round(float(row.ram    or 0), 1),
        }
    except Exception:
        return _EMPTY_METRICS
