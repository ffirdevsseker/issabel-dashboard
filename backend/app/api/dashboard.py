from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.async_session import get_async_db
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# ─── Yardımcı ──────────────────────────────────────────────────────────────────

def _require_roles(user: User, *roles: str):
    if user.role_name not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Bu endpoint için yetkiniz yok")


# ─── 1. Summary ────────────────────────────────────────────────────────────────

@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    _require_roles(current_user, "admin", "supervisor", "bt")
    today = date.today().isoformat()
    result = {"bekleyen_cagri": 0, "aktif_kanal": 0, "trunk_limiti": 0,
              "cevaplama_orani": 0.0, "ort_csat": 0.0,
              "kanal_alarm": False, "bekleme_alarm": False}
    try:
        r = await db.execute(text("""
            SELECT
                COALESCE(SUM(bekleyen_sayisi), 0)  AS bekleyen,
                COALESCE(AVG(ort_bekleme_sn), 0)   AS ort_bekleme
            FROM v_kuyruk_anlik
        """))
        row = r.fetchone()
        if row:
            result["bekleyen_cagri"]  = int(row.bekleyen)
            result["bekleme_alarm"]   = float(row.ort_bekleme) > 45
    except Exception:
        pass
    try:
        r = await db.execute(text("""
            SELECT aktif_kanal, trunk_limiti FROM sistem_metrikleri LIMIT 1
        """))
        row = r.fetchone()
        if row:
            result["aktif_kanal"]  = int(row.aktif_kanal  or 0)
            result["trunk_limiti"] = int(row.trunk_limiti or 0)
            if row.trunk_limiti:
                result["kanal_alarm"] = (row.aktif_kanal / row.trunk_limiti) > 0.9
    except Exception:
        pass
    try:
        r = await db.execute(text("""
            SELECT COALESCE(AVG(ort_csat), 0) AS csat,
                   COALESCE(SUM(cevaplanan), 0) AS cevaplanan,
                   COALESCE(SUM(toplam_cagri), 0) AS toplam
            FROM v_gunluk_cagri_ozeti WHERE tarih = :today
        """), {"today": today})
        row = r.fetchone()
        if row and row.toplam:
            result["ort_csat"]          = round(float(row.csat), 2)
            result["cevaplama_orani"]   = round(row.cevaplanan / row.toplam * 100, 1)
    except Exception:
        pass
    return result


# ─── 2. Agents ─────────────────────────────────────────────────────────────────

@router.get("/agents")
async def get_agents(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    _require_roles(current_user, "admin", "supervisor")
    try:
        r = await db.execute(text("""
            SELECT id, ad_soyad, departman_adi, anlik_durum,
                   mola_tipi, mola_sure_dk, planlanan_sure_dk,
                   mola_asimi, bugun_toplam_cagri, bugun_ort_csat, unvan
            FROM v_personel_anlik
            ORDER BY mola_asimi DESC NULLS LAST, ad_soyad
        """))
        return [
            {
                "id":                 str(row.id),
                "ad_soyad":          row.ad_soyad,
                "departman_adi":     row.departman_adi,
                "anlik_durum":       row.anlik_durum,
                "mola_tipi":         row.mola_tipi,
                "mola_sure_dk":      int(row.mola_sure_dk       or 0),
                "planlanan_sure_dk": int(row.planlanan_sure_dk  or 0),
                "mola_asimi":        bool(row.mola_asimi),
                "bugun_toplam_cagri":int(row.bugun_toplam_cagri or 0),
                "bugun_ort_csat":    round(float(row.bugun_ort_csat or 0), 2),
                "unvan":             row.unvan,
            }
            for row in r.fetchall()
        ]
    except Exception:
        return []


# ─── 3. Queue Live ─────────────────────────────────────────────────────────────

@router.get("/queue-live")
async def get_queue_live(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    _require_roles(current_user, "admin", "supervisor", "bt")
    try:
        r = await db.execute(text("""
            SELECT a.arayan_numara, q.ad AS kuyruk_adi,
                   a.bekleme_suresi_sn, a.oncelik
            FROM aktif_kuyruk_bekleyenler a
            LEFT JOIN kuyruklar q ON q.id = a.kuyruk_id
            ORDER BY a.oncelik DESC, a.bekleme_suresi_sn DESC
        """))
        return [
            {
                "arayan_numara":    _mask_phone(row.arayan_numara),
                "kuyruk_adi":       row.kuyruk_adi or "—",
                "bekleme_suresi_sn":int(row.bekleme_suresi_sn or 0),
                "oncelik":          int(row.oncelik or 0),
            }
            for row in r.fetchall()
        ]
    except Exception:
        return []


def _mask_phone(num: str | None) -> str:
    if not num:
        return "—"
    s = str(num)
    return s[:4] + "***" + s[-3:] if len(s) >= 7 else "***"


# ─── 4. AI Feed ────────────────────────────────────────────────────────────────

@router.get("/ai-feed")
async def get_ai_feed(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    _require_roles(current_user, "admin", "supervisor")
    try:
        r = await db.execute(text("""
            SELECT k.ad_soyad AS personel_adi,
                   ca.duygu_skoru, ca.ai_ozet,
                   ck.konusma_suresi, ck.csat_skoru
            FROM cagri_analiz ca
            JOIN cagri_kayitlari ck ON ck.id = ca.cagri_id
            JOIN kullanicilar   k  ON k.id  = ck.user_id
            ORDER BY ck.baslangic_zamani DESC
            LIMIT 5
        """))
        return [
            {
                "personel_adi":   row.personel_adi,
                "duygu_skoru":    int(row.duygu_skoru  or 3),
                "ai_ozet":        row.ai_ozet          or "",
                "konusma_suresi": int(row.konusma_suresi or 0),
                "csat_skoru":     int(row.csat_skoru   or 0),
            }
            for row in r.fetchall()
        ]
    except Exception:
        return []


# ─── 5. Issues ─────────────────────────────────────────────────────────────────

@router.get("/issues")
async def get_issues(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    _require_roles(current_user, "admin", "supervisor")
    try:
        r = await db.execute(text("""
            SELECT id AS user_id, ad_soyad,
                   CASE
                       WHEN mola_asimi      THEN 'Mola Aşımı (' || mola_sure_dk || ' dk)'
                       WHEN gec_giris_dk>10 THEN 'Geç Giriş ('  || gec_giris_dk  || ' dk)'
                   END AS sorun
            FROM v_personel_anlik
            WHERE mola_asimi = true OR gec_giris_dk > 10
            ORDER BY mola_asimi DESC, gec_giris_dk DESC
        """))
        return [
            {"user_id": str(row.user_id), "ad_soyad": row.ad_soyad, "sorun": row.sorun}
            for row in r.fetchall()
        ]
    except Exception:
        return []


# ─── 6. End Break ──────────────────────────────────────────────────────────────

@router.post("/actions/end-break")
async def end_break(
    body: dict,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    _require_roles(current_user, "admin")
    user_id = body.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id zorunludur")
    try:
        # Açık molayı kapat
        await db.execute(text("""
            UPDATE molalar SET bitis = NOW()
            WHERE id = (
                SELECT id FROM molalar
                WHERE user_id = :uid AND bitis IS NULL
                ORDER BY baslangic DESC LIMIT 1
            )
        """), {"uid": user_id})
        # Kullanıcı durumunu güncelle
        await db.execute(text("""
            UPDATE kullanicilar SET anlik_durum = 'aktif' WHERE id = :uid
        """), {"uid": user_id})
        await db.commit()
        return {"success": True, "message": "Mola sonlandırıldı."}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Eski endpoint'ler (geriye dönük uyumluluk) ────────────────────────────────

@router.get("/queue-status")
async def get_queue_status(
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(get_current_user),
):
    try:
        r = await db.execute(text("""
            SELECT kuyruk_adi, kuyruk_no, bekleyen_sayisi,
                   ort_bekleme_sn, max_bekleme_sn,
                   esik_asimi_sayisi, doluluk_pct, uyari_esigi_sn
            FROM v_kuyruk_anlik ORDER BY bekleyen_sayisi DESC
        """))
        return [dict(row._mapping) for row in r.fetchall()]
    except Exception:
        return []


@router.get("/agent-status")
async def get_agent_status(
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(get_current_user),
):
    try:
        r = await db.execute(text("""
            SELECT ad_soyad, dahili_no, anlik_durum, mola_tipi,
                   mola_sure_dk, mola_asimi, bugun_toplam_cagri,
                   bugun_cevaplanan, bugun_ort_csat, unvan, departman_adi, ekip_adi
            FROM v_personel_anlik ORDER BY ad_soyad
        """))
        return [dict(row._mapping) for row in r.fetchall()]
    except Exception:
        return []


@router.get("/alarms")
async def get_alarms(
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(get_current_user),
):
    try:
        r = await db.execute(text("""
            SELECT id, tip, baslik, mesaj, oncelik, olusturma_tarihi
            FROM bildirimler WHERE okundu_mu = false AND oncelik >= 1
            ORDER BY oncelik DESC, olusturma_tarihi DESC LIMIT 20
        """))
        return [dict(row._mapping) for row in r.fetchall()]
    except Exception:
        return []


@router.get("/system-metrics")
async def get_system_metrics(
    db: AsyncSession = Depends(get_async_db),
    _: User = Depends(get_current_user),
):
    try:
        r = await db.execute(text(
            "SELECT aktif_kanal, trunk_limiti, alarm_aktif, cpu, ram FROM sistem_metrikleri LIMIT 1"
        ))
        row = r.fetchone()
        if not row:
            return {"aktif_kanal": 0, "trunk_limiti": 0, "alarm_aktif": False, "cpu": 0.0, "ram": 0.0}
        return dict(row._mapping)
    except Exception:
        return {"aktif_kanal": 0, "trunk_limiti": 0, "alarm_aktif": False, "cpu": 0.0, "ram": 0.0}
