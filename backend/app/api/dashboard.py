from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db.async_session import get_async_db
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# ─── Yardımcılar ──────────────────────────────────────────────────────────────

def _require_roles(user: User, *roles: str):
    if user.role_name not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Bu endpoint için yetkiniz yok")

def _mask_phone(num: str | None) -> str:
    if not num:
        return "—"
    s = str(num)
    return s[:4] + "***" + s[-3:] if len(s) >= 7 else "***"

# Sadece müşteri hizmetleri personeli filtresi
_MH_FILTER = """
    p.id IN (
        SELECT k.id FROM kullanicilar k
        JOIN roller r ON r.id = k.rol_id
        WHERE r.ad = 'personel'
    )
"""


# ─── 1. Header Stats ──────────────────────────────────────────────────────────

@router.get("/header-stats")
async def get_header_stats(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    _require_roles(current_user, "admin", "supervisor", "bt")

    result = {
        "aktif": 0, "mola": 0, "mesgul": 0, "offline": 0,
        "mola_asimi_sayisi": 0,
        "kuyruk_bekleyen": 0,
        "kritik_bildirim": 0,
        "toplam_bildirim": 0,
        "sistem_saglik": "Yeşil",
        "sistem_saglik_renk": "#10b981",
        "son_bildirimler": [],
    }

    try:
        r = await db.execute(text(f"""
            SELECT
                COUNT(*) FILTER (WHERE p.anlik_durum = 'aktif')   AS aktif,
                COUNT(*) FILTER (WHERE p.anlik_durum = 'mola')    AS mola,
                COUNT(*) FILTER (WHERE p.anlik_durum = 'mesgul')  AS mesgul,
                COUNT(*) FILTER (WHERE p.anlik_durum = 'offline') AS offline,
                COUNT(*) FILTER (WHERE p.mola_asimi = true)       AS mola_asimi
            FROM v_personel_anlik p
            WHERE {_MH_FILTER}
        """))
        row = r.fetchone()
        if row:
            result["aktif"]             = int(row.aktif       or 0)
            result["mola"]              = int(row.mola        or 0)
            result["mesgul"]            = int(row.mesgul      or 0)
            result["offline"]           = int(row.offline     or 0)
            result["mola_asimi_sayisi"] = int(row.mola_asimi  or 0)
    except Exception:
        pass

    try:
        r = await db.execute(text("""
            SELECT COALESCE(SUM(bekleyen_sayisi), 0) FROM v_kuyruk_anlik
        """))
        result["kuyruk_bekleyen"] = int(r.scalar() or 0)
    except Exception:
        pass

    try:
        r = await db.execute(text("""
            SELECT
                COUNT(*) FILTER (WHERE oncelik >= 2) AS kritik,
                COUNT(*)                              AS toplam
            FROM bildirimler WHERE okundu_mu = false
        """))
        row = r.fetchone()
        if row:
            result["kritik_bildirim"] = int(row.kritik or 0)
            result["toplam_bildirim"] = int(row.toplam or 0)
    except Exception:
        pass

    try:
        r = await db.execute(text("""
            SELECT baslik, mesaj FROM bildirimler
            WHERE okundu_mu = false AND oncelik >= 1
            ORDER BY oncelik DESC, olusturma_tarihi DESC
            LIMIT 4
        """))
        result["son_bildirimler"] = [
            {"baslik": row.baslik, "mesaj": row.mesaj or ""}
            for row in r.fetchall()
        ]
    except Exception:
        pass

    try:
        r = await db.execute(text("""
            SELECT aktif_kanal_sayisi, trunk_limiti, alarm_aktif
            FROM sistem_metrikleri LIMIT 1
        """))
        row = r.fetchone()
        if row:
            pct = 0
            if row.trunk_limiti and row.trunk_limiti > 0:
                pct = int((row.aktif_kanal_sayisi or 0) / row.trunk_limiti * 100)
            kritik = result["kritik_bildirim"]
            asim   = result["mola_asimi_sayisi"]
            if row.alarm_aktif or pct > 90 or kritik >= 3:
                result["sistem_saglik"]      = "Kırmızı"
                result["sistem_saglik_renk"] = "#ef4444"
            elif pct > 70 or asim > 0 or kritik > 0:
                result["sistem_saglik"]      = "Sarı"
                result["sistem_saglik_renk"] = "#f59e0b"
    except Exception:
        pass

    return result


# ─── 2. Summary ───────────────────────────────────────────────────────────────

@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    _require_roles(current_user, "admin", "supervisor", "bt")
    today = date.today().isoformat()
    result = {
        "bekleyen_cagri": 0, "aktif_kanal": 0, "trunk_limiti": 0,
        "cevaplama_orani": 0.0, "ort_csat": 0.0,
        "kanal_alarm": False, "bekleme_alarm": False,
    }

    try:
        r = await db.execute(text("""
            SELECT
                COALESCE(SUM(bekleyen_sayisi), 0) AS bekleyen,
                COALESCE(AVG(ort_bekleme_sn), 0)  AS ort_bekleme
            FROM v_kuyruk_anlik
        """))
        row = r.fetchone()
        if row:
            result["bekleyen_cagri"] = int(row.bekleyen)
            result["bekleme_alarm"]  = float(row.ort_bekleme) > 45
    except Exception:
        pass

    try:
        r = await db.execute(text("""
            SELECT aktif_kanal_sayisi, trunk_limiti FROM sistem_metrikleri LIMIT 1
        """))
        row = r.fetchone()
        if row:
            result["aktif_kanal"]  = int(row.aktif_kanal_sayisi or 0)
            result["trunk_limiti"] = int(row.trunk_limiti       or 0)
            if row.trunk_limiti:
                result["kanal_alarm"] = (row.aktif_kanal_sayisi / row.trunk_limiti) > 0.9
    except Exception:
        pass

    try:
        r = await db.execute(text("""
            SELECT
                COALESCE(AVG(ort_csat), 0)     AS csat,
                COALESCE(SUM(cevaplanan), 0)   AS cevaplanan,
                COALESCE(SUM(toplam_cagri), 0) AS toplam
            FROM v_gunluk_cagri_ozeti WHERE gun = :today
        """), {"today": today})
        row = r.fetchone()
        if row and row.toplam:
            result["ort_csat"]        = round(float(row.csat), 2)
            result["cevaplama_orani"] = round(row.cevaplanan / row.toplam * 100, 1)
    except Exception:
        pass

    return result


# ─── 3. Agents ────────────────────────────────────────────────────────────────

@router.get("/agents")
async def get_agents(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    _require_roles(current_user, "admin", "supervisor")
    try:
        r = await db.execute(text(f"""
            SELECT
                p.id, p.ad_soyad, p.departman_adi, p.ekip_adi,
                p.dahili_no, p.anlik_durum, p.sip_durumu,
                p.mola_tipi, p.mola_sure_dk, p.planlanan_sure_dk, p.mola_asimi,
                p.bugun_toplam_cagri, p.bugun_cevaplanan, p.bugun_ort_csat,
                p.xp, p.seviye, p.unvan
            FROM v_personel_anlik p
            WHERE {_MH_FILTER}
            ORDER BY p.mola_asimi DESC NULLS LAST, p.ad_soyad
        """))
        return [
            {
                "id":                 str(row.id),
                "ad_soyad":          row.ad_soyad,
                "departman_adi":     row.departman_adi,
                "ekip_adi":          row.ekip_adi,
                "dahili_no":         row.dahili_no,
                "anlik_durum":       row.anlik_durum,
                "sip_durumu":        row.sip_durumu,
                "mola_tipi":         row.mola_tipi,
                "mola_sure_dk":      int(row.mola_sure_dk      or 0),
                "planlanan_sure_dk": int(row.planlanan_sure_dk or 0),
                "mola_asimi":        bool(row.mola_asimi),
                "bugun_toplam_cagri":int(row.bugun_toplam_cagri or 0),
                "bugun_cevaplanan":  int(row.bugun_cevaplanan  or 0),
                "bugun_ort_csat":    round(float(row.bugun_ort_csat or 0), 2),
                "xp":                int(row.xp     or 0),
                "seviye":            int(row.seviye or 1),
                "unvan":             row.unvan,
            }
            for row in r.fetchall()
        ]
    except Exception:
        return []


# ─── 4. Queue Live ────────────────────────────────────────────────────────────

@router.get("/queue-live")
async def get_queue_live(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    _require_roles(current_user, "admin", "supervisor", "bt")
    try:
        r = await db.execute(text("""
            SELECT
                a.arayan_numara,
                q.ad                                                        AS kuyruk_adi,
                q.id                                                        AS kuyruk_id,
                COALESCE(q.uyari_esigi_sn, 45)                             AS uyari_esigi_sn,
                EXTRACT(EPOCH FROM (NOW() - a.giris_zamani))::INT           AS bekleme_suresi_sn,
                a.oncelik
            FROM aktif_kuyruk_bekleyenler a
            LEFT JOIN kuyruklar q ON q.id = a.queue_id
            ORDER BY a.oncelik DESC, a.giris_zamani ASC
        """))
        return [
            {
                "arayan_numara":     _mask_phone(row.arayan_numara),
                "kuyruk_adi":        row.kuyruk_adi or "Genel Kuyruk",
                "bekleme_suresi_sn": int(row.bekleme_suresi_sn or 0),
                "uyari_esigi_sn":    int(row.uyari_esigi_sn    or 45),
                "oncelik":           int(row.oncelik            or 0),
            }
            for row in r.fetchall()
        ]
    except Exception:
        return []


# ─── 5. AI Feed ───────────────────────────────────────────────────────────────

@router.get("/ai-feed")
async def get_ai_feed(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    _require_roles(current_user, "admin", "supervisor")
    try:
        r = await db.execute(text("""
            SELECT
                k.ad_soyad  AS personel_adi,
                ca.duygu_skoru, ca.ai_ozet,
                ck.konusma_suresi, ck.csat_skoru, ck.kategori
            FROM cagri_analiz ca
            JOIN cagri_kayitlari ck ON ck.id = ca.cagri_id
            JOIN kullanicilar   k  ON k.id  = ck.user_id
            ORDER BY ck.baslangic_zamani DESC
            LIMIT 5
        """))
        return [
            {
                "personel_adi":   row.personel_adi,
                "duygu_skoru":    int(row.duygu_skoru   or 3),
                "ai_ozet":        row.ai_ozet            or "",
                "konusma_suresi": int(row.konusma_suresi or 0),
                "csat_skoru":     int(row.csat_skoru     or 0),
                "kategori":       row.kategori            or "",
            }
            for row in r.fetchall()
        ]
    except Exception:
        return []


# ─── 6. Issues ────────────────────────────────────────────────────────────────

@router.get("/issues")
async def get_issues(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    _require_roles(current_user, "admin", "supervisor")
    issues = []

    try:
        r = await db.execute(text(f"""
            WITH login_bugun AS (
                SELECT DISTINCT ON (user_id)
                    user_id,
                    COALESCE(gec_giris_dk, 0) AS gec_giris_dk
                FROM personel_oturum_loglari
                WHERE DATE(login_zamani) = CURRENT_DATE
                ORDER BY user_id, login_zamani DESC
            )
            SELECT
                p.id         AS user_id,
                p.ad_soyad,
                COALESCE(lb.gec_giris_dk, 0) AS gec_giris_dk,
                CASE
                    WHEN p.mola_asimi                                             THEN 'critical'
                    WHEN COALESCE(lb.gec_giris_dk, 0) > 30                       THEN 'critical'
                    WHEN COALESCE(lb.gec_giris_dk, 0) > 10                       THEN 'warning'
                    WHEN p.bugun_ort_csat < 3 AND p.bugun_toplam_cagri >= 5      THEN 'warning'
                    ELSE 'info'
                END AS severity,
                CASE
                    WHEN p.mola_asimi
                        THEN 'Mola Aşımı — ' || p.mola_sure_dk || ' dk / '
                             || COALESCE(p.planlanan_sure_dk::text, '?') || ' dk planlı'
                    WHEN COALESCE(lb.gec_giris_dk, 0) > 10
                        THEN 'Geç Giriş — ' || COALESCE(lb.gec_giris_dk, 0) || ' dakika gecikme'
                    WHEN p.bugun_ort_csat < 3 AND p.bugun_toplam_cagri >= 5
                        THEN 'Düşük CSAT — ' || ROUND(CAST(p.bugun_ort_csat AS numeric), 1)
                             || '/5 (' || p.bugun_toplam_cagri || ' çağrı)'
                END AS sorun,
                'agent' AS tip
            FROM v_personel_anlik p
            LEFT JOIN login_bugun lb ON lb.user_id = p.id
            WHERE {_MH_FILTER}
              AND (
                  p.mola_asimi = true
                  OR COALESCE(lb.gec_giris_dk, 0) > 10
                  OR (p.bugun_ort_csat < 3 AND p.bugun_toplam_cagri >= 5)
              )
            ORDER BY
                CASE
                    WHEN p.mola_asimi                             THEN 0
                    WHEN COALESCE(lb.gec_giris_dk, 0) > 30       THEN 1
                    WHEN COALESCE(lb.gec_giris_dk, 0) > 10       THEN 2
                    ELSE 3
                END,
                p.mola_sure_dk DESC NULLS LAST
        """))
        for row in r.fetchall():
            issues.append({
                "user_id":  str(row.user_id),
                "ad_soyad": row.ad_soyad,
                "sorun":    row.sorun,
                "severity": row.severity,
                "tip":      row.tip,
            })
    except Exception:
        pass

    try:
        r = await db.execute(text("""
            SELECT
                a.arayan_numara,
                q.ad AS kuyruk_adi,
                EXTRACT(EPOCH FROM (NOW() - a.giris_zamani))::INT AS bekleme_sn
            FROM aktif_kuyruk_bekleyenler a
            LEFT JOIN kuyruklar q ON q.id = a.queue_id
            WHERE EXTRACT(EPOCH FROM (NOW() - a.giris_zamani)) > 180
            ORDER BY a.giris_zamani ASC
            LIMIT 5
        """))
        for row in r.fetchall():
            sn  = int(row.bekleme_sn or 0)
            m, s = divmod(sn, 60)
            sev = "critical" if sn > 300 else "warning"
            issues.append({
                "user_id":  None,
                "ad_soyad": row.kuyruk_adi or "Kuyruk",
                "sorun":    f"Uzun Bekleme — {m}dk {s}s ({_mask_phone(row.arayan_numara)})",
                "severity": sev,
                "tip":      "queue",
            })
    except Exception:
        pass

    severity_order = {"critical": 0, "warning": 1, "info": 2}
    issues.sort(key=lambda x: severity_order.get(x["severity"], 3))
    return issues


# ─── 7. Traffic Hourly (YENİ) ─────────────────────────────────────────────────

@router.get("/traffic-hourly")
async def get_traffic_hourly(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_user),
):
    _require_roles(current_user, "admin", "supervisor")
    try:
        r = await db.execute(text("""
            SELECT
                TO_CHAR(saat, 'HH24:MI')            AS saat_label,
                toplam,
                cevaplanan,
                kacan,
                COALESCE(ort_bekleme_sn, 0)         AS ort_bekleme_sn
            FROM v_saatlik_yogunluk
            WHERE saat >= NOW() - INTERVAL '24 hours'
            ORDER BY saat ASC
        """))
        return [
            {
                "saat":        row.saat_label,
                "toplam":      int(row.toplam        or 0),
                "cevaplanan":  int(row.cevaplanan    or 0),
                "kacan":       int(row.kacan         or 0),
                "ort_bekleme": int(row.ort_bekleme_sn or 0),
            }
            for row in r.fetchall()
        ]
    except Exception:
        return []


# ─── 8. End Break ─────────────────────────────────────────────────────────────

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
        await db.execute(text("""
            UPDATE molalar SET bitis = NOW()
            WHERE id = (
                SELECT id FROM molalar
                WHERE user_id = :uid AND bitis IS NULL
                ORDER BY baslangic DESC LIMIT 1
            )
        """), {"uid": user_id})
        await db.execute(text("""
            UPDATE kullanicilar SET anlik_durum = 'aktif' WHERE id = :uid
        """), {"uid": user_id})
        await db.commit()
        return {"success": True, "message": "Mola sonlandırıldı."}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Eski endpoint'ler (geriye dönük uyumluluk) ───────────────────────────────

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
        r = await db.execute(text("""
            SELECT
                aktif_kanal_sayisi              AS aktif_kanal,
                trunk_limiti,
                alarm_aktif,
                COALESCE(cpu_kullanimi, 0)      AS cpu,
                COALESCE(ram_kullanimi, 0)      AS ram
            FROM sistem_metrikleri LIMIT 1
        """))
        row = r.fetchone()
        if not row:
            return {"aktif_kanal": 0, "trunk_limiti": 0, "alarm_aktif": False, "cpu": 0.0, "ram": 0.0}
        return dict(row._mapping)
    except Exception:
        return {"aktif_kanal": 0, "trunk_limiti": 0, "alarm_aktif": False, "cpu": 0.0, "ram": 0.0}
