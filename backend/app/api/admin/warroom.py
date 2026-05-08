"""
Admin · Canlı Operasyon War Room  (/admin/war-room)
───────────────────────────────────────────────────
SADECE "Müşteri Hizmetleri" departmanı kapsamı.

Endpoints
─────────
GET   /admin/war-room/active-calls               → aktif görüşmeler
GET   /admin/war-room/queues                     → tüm kuyruklar (aktif+pasif)
GET   /admin/war-room/staff                      → personel anlık liste
GET   /admin/war-room/staff/{user_id}/detail     → çekmece detay verisi
POST  /admin/war-room/action/{call_id}           → whisper / barge (AMI stub)
PATCH /admin/war-room/queues/{queue_id}/capacity → kapasite güncelle
PATCH /admin/war-room/queues/{queue_id}/toggle   → kuyruğu duraklat / aktifleştir
POST  /admin/war-room/actions/end-break/{uid}    → mola zorla bitir
POST  /admin/war-room/actions/send-instruction   → anlık talimat gönder
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.async_session import get_async_db
from app.api.deps import require_admin
from app.models.user import User

router = APIRouter(prefix="/admin/war-room", tags=["Admin · War Room"])
ADMIN = require_admin
DEPT  = "Müşteri Hizmetleri"


# ═══════════════════════════ Pydantic şemaları ════════════════════════════════

class ActionBody(BaseModel):
    action: str = Field(..., pattern="^(whisper|barge)$")
    admin_channel: Optional[str] = None


class CapacityBody(BaseModel):
    max_kapasite: int = Field(..., ge=1, le=200)


class InstructionBody(BaseModel):
    alici_id: str
    icerik:   str = Field(..., min_length=2, max_length=500)


# ═══════════════════════════ 1. Aktif Görüşmeler ═════════════════════════════

@router.get("/active-calls")
async def get_active_calls(
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    """
    v_personel_anlik WHERE anlik_durum='mesgul' (MH dept)
    + LATERAL JOIN cagri_kayitlari WHERE bitis_zamani IS NULL
    """
    rows = (await db.execute(text("""
        SELECT
            u.id::text                                                    AS personel_id,
            u.ad_soyad                                                    AS personel_ad,
            u.dahili_no,
            COALESCE(vp.ekip_adi, '—')                                    AS ekip_adi,
            c.id::text                                                    AS id,
            c.baslangic_zamani,
            EXTRACT(EPOCH FROM (NOW() - c.baslangic_zamani))::int         AS sure_sn,
            COALESCE(m.telefon, '—')                                      AS arayan_numara,
            m.ad_soyad                                                    AS musteri_ad,
            k.ad                                                          AS kuyruk_adi
        FROM v_personel_anlik vp
        JOIN kullanicilar  u  ON u.id = vp.id
        JOIN departmanlar  d  ON d.id = u.departman_id
        LEFT JOIN LATERAL (
            SELECT id, baslangic_zamani, musteri_id, queue_id
            FROM   cagri_kayitlari cc
            WHERE  cc.user_id      = vp.id
              AND  cc.bitis_zamani IS NULL
            ORDER BY cc.baslangic_zamani DESC
            LIMIT 1
        ) c ON TRUE
        LEFT JOIN musteriler m ON m.id = c.musteri_id
        LEFT JOIN kuyruklar  k ON k.id = c.queue_id
        WHERE u.silindi_mi = FALSE
          AND d.ad = :dept
          AND vp.anlik_durum::text = 'mesgul'
        ORDER BY c.baslangic_zamani ASC NULLS LAST
    """), {"dept": DEPT})).fetchall()

    return [
        {
            "id":               r.id or r.personel_id,
            "personel_id":      r.personel_id,
            "personel_ad":      r.personel_ad,
            "dahili_no":        r.dahili_no,
            "ekip_adi":         r.ekip_adi,
            "arayan_numara":    r.arayan_numara,
            "musteri_ad":       r.musteri_ad,
            "kuyruk_adi":       r.kuyruk_adi,
            "baslangic_zamani": r.baslangic_zamani.isoformat() if r.baslangic_zamani else None,
            "sure_sn":          int(r.sure_sn or 0),
        }
        for r in rows
    ]


# ═══════════════════════════ 2. Kuyruklar (aktif + pasif) ════════════════════

@router.get("/queues")
async def get_queues(
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    """
    Tüm MH kuyrukları (aktif ve duraklatılmış).
    War room'dan hem izleme hem pause/resume yapılabilsin diye aktif filtresi yok.
    kritik = max_bekleme_sn >= 45
    """
    rows = (await db.execute(text("""
        SELECT
            k.id::text                                                          AS id,
            k.ad                                                                AS kuyruk_adi,
            k.aktif,
            COALESCE(k.max_kapasite, 0)                                         AS max_kapasite,
            (
                SELECT COUNT(*) FROM aktif_kuyruk_bekleyenler akb
                WHERE akb.queue_id = k.id
            )                                                                   AS bekleyen_sayi,
            COALESCE(
                (SELECT MAX(EXTRACT(EPOCH FROM (NOW() - akb.giris_zamani)))
                 FROM   aktif_kuyruk_bekleyenler akb WHERE akb.queue_id = k.id),
                0
            )                                                                   AS max_bekleme_sn,
            COALESCE(
                (SELECT AVG(EXTRACT(EPOCH FROM (NOW() - akb.giris_zamani)))
                 FROM   aktif_kuyruk_bekleyenler akb WHERE akb.queue_id = k.id),
                0
            )                                                                   AS ort_bekleme_sn
        FROM kuyruklar k
        JOIN departmanlar d ON d.id = k.departman_id
        WHERE d.ad = :dept
        ORDER BY k.aktif DESC, k.ad
    """), {"dept": DEPT})).fetchall()

    return [
        {
            "id":             r.id,
            "kuyruk_adi":     r.kuyruk_adi,
            "aktif":          bool(r.aktif),
            "max_kapasite":   int(r.max_kapasite or 0),
            "bekleyen_sayi":  int(r.bekleyen_sayi or 0),
            "max_bekleme_sn": float(r.max_bekleme_sn or 0),
            "ort_bekleme_sn": float(r.ort_bekleme_sn or 0),
            "kritik":         bool(r.aktif) and float(r.max_bekleme_sn or 0) >= 45,
        }
        for r in rows
    ]


# ═══════════════════════════ 3. Personel Listesi ═════════════════════════════

@router.get("/staff")
async def get_staff(
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    """MH personeli anlık durum. Sıra: mesgul→aktif→mola→offline."""
    rows = (await db.execute(text("""
        SELECT
            u.id::text                                                  AS id,
            u.ad_soyad,
            u.dahili_no,
            u.unvan,
            COALESCE(vp.anlik_durum::text, 'offline')                   AS anlik_durum,
            COALESCE(vp.sip_durumu::text,  'koptu')                     AS sip_durumu,
            COALESCE(vp.mola_asimi, FALSE)                              AS mola_asimi,
            vp.ekip_adi                                                 AS ekip_ad
        FROM kullanicilar u
        LEFT JOIN departmanlar     d   ON d.id  = u.departman_id
        LEFT JOIN v_personel_anlik vp  ON vp.id = u.id
        WHERE u.silindi_mi = FALSE
          AND d.ad = :dept
        ORDER BY
            CASE COALESCE(vp.anlik_durum::text, 'offline')
                WHEN 'mesgul'  THEN 1
                WHEN 'aktif'   THEN 2
                WHEN 'mola'    THEN 3
                ELSE 4
            END,
            u.ad_soyad
    """), {"dept": DEPT})).fetchall()

    return [
        {
            "id":          r.id,
            "ad_soyad":    r.ad_soyad,
            "dahili_no":   r.dahili_no,
            "unvan":       r.unvan,
            "anlik_durum": r.anlik_durum,
            "sip_durumu":  r.sip_durumu,
            "mola_asimi":  bool(r.mola_asimi),
            "ekip_ad":     r.ekip_ad,
        }
        for r in rows
    ]


# ═══════════════════════════ 4. Personel Çekmece Detayı ══════════════════════

@router.get("/staff/{user_id}/detail")
async def get_staff_detail(
    user_id: str,
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    """
    Slide-over drawer için zenginleştirilmiş personel verisi.
    Bugünkü istatistikler + aktif çağrı + mola başlangıcı.
    """
    row = (await db.execute(text("""
        SELECT
            u.id::text                                                  AS id,
            u.ad_soyad,
            u.dahili_no,
            u.unvan,
            COALESCE(vp.anlik_durum::text, 'offline')                   AS anlik_durum,
            COALESCE(vp.sip_durumu::text,  'koptu')                     AS sip_durumu,
            COALESCE(vp.mola_asimi, FALSE)                              AS mola_asimi,
            vp.ekip_adi                                                 AS ekip_ad,
            -- Bugün çağrı sayısı
            (
                SELECT COUNT(*)::int
                FROM   cagri_kayitlari c
                WHERE  c.user_id = u.id
                  AND  c.baslangic_zamani >= CURRENT_DATE
            )                                                           AS bugun_cagri,
            -- Bugün cevaplanan
            (
                SELECT COUNT(*)::int
                FROM   cagri_kayitlari c
                WHERE  c.user_id = u.id
                  AND  c.baslangic_zamani >= CURRENT_DATE
                  AND  c.durum::text IN ('cevaplandi', 'aktarildi')
            )                                                           AS bugun_cevaplanan,
            -- Bugün ort. CSAT
            (
                SELECT ROUND(AVG(c.csat_skoru)::numeric, 1)::float
                FROM   cagri_kayitlari c
                WHERE  c.user_id = u.id
                  AND  c.baslangic_zamani >= CURRENT_DATE
                  AND  c.csat_skoru IS NOT NULL
            )                                                           AS ortalama_csat,
            -- Aktif mola başlangıcı
            (
                SELECT m.baslangic_zamani
                FROM   molalar m
                WHERE  m.user_id        = u.id
                  AND  m.bitis_zamani  IS NULL
                  AND  m.onay_durumu   IN ('onaylandi', 'beklemede')
                ORDER  BY m.baslangic_zamani DESC
                LIMIT  1
            )                                                           AS mola_baslangic
        FROM kullanicilar u
        LEFT JOIN v_personel_anlik vp ON vp.id = u.id
        WHERE u.id = :uid::uuid
          AND u.silindi_mi = FALSE
    """), {"uid": user_id})).fetchone()

    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Personel bulunamadı")

    # Aktif çağrı detayı (varsa)
    call_row = (await db.execute(text("""
        SELECT
            c.id::text                                                  AS id,
            c.baslangic_zamani,
            EXTRACT(EPOCH FROM (NOW() - c.baslangic_zamani))::int       AS sure_sn,
            COALESCE(m.telefon, '—')                                    AS arayan_numara,
            m.ad_soyad                                                  AS musteri_ad,
            k.ad                                                        AS kuyruk_adi
        FROM   cagri_kayitlari c
        LEFT   JOIN musteriler m ON m.id = c.musteri_id
        LEFT   JOIN kuyruklar  k ON k.id = c.queue_id
        WHERE  c.user_id      = :uid::uuid
          AND  c.bitis_zamani IS NULL
        ORDER  BY c.baslangic_zamani DESC
        LIMIT  1
    """), {"uid": user_id})).fetchone()

    aktif_cagri = None
    if call_row and call_row.id:
        aktif_cagri = {
            "id":               call_row.id,
            "baslangic_zamani": call_row.baslangic_zamani.isoformat() if call_row.baslangic_zamani else None,
            "sure_sn":          int(call_row.sure_sn or 0),
            "arayan_numara":    call_row.arayan_numara,
            "musteri_ad":       call_row.musteri_ad,
            "kuyruk_adi":       call_row.kuyruk_adi,
        }

    return {
        "id":               row.id,
        "ad_soyad":         row.ad_soyad,
        "dahili_no":        row.dahili_no,
        "unvan":            row.unvan,
        "anlik_durum":      row.anlik_durum,
        "sip_durumu":       row.sip_durumu,
        "mola_asimi":       bool(row.mola_asimi),
        "ekip_ad":          row.ekip_ad,
        "bugun_cagri":      int(row.bugun_cagri or 0),
        "bugun_cevaplanan": int(row.bugun_cevaplanan or 0),
        "ortalama_csat":    float(row.ortalama_csat) if row.ortalama_csat is not None else None,
        "mola_baslangic":   row.mola_baslangic.isoformat() if row.mola_baslangic else None,
        "aktif_cagri":      aktif_cagri,
    }


# ═══════════════════════════ 5. AMI Aksiyon Stub ════════════════════════════

@router.post("/action/{call_id}")
async def call_action(
    call_id: str,
    body: ActionBody,
    _: User = Depends(ADMIN),
):
    label = "Fısıldama (Whisper)" if body.action == "whisper" else "Dahil Olma (Barge)"
    ch    = f" · kanal: {body.admin_channel}" if body.admin_channel else ""
    return {
        "ok":      True,
        "action":  body.action,
        "call_id": call_id,
        "message": f"AMI stub · {label} aksiyonu tetiklendi{ch}",
    }


# ═══════════════════════════ 6. Kapasite Güncelle ════════════════════════════

@router.patch("/queues/{queue_id}/capacity")
async def update_queue_capacity(
    queue_id: str,
    body: CapacityBody,
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    result = await db.execute(
        text("UPDATE kuyruklar SET max_kapasite=:cap WHERE id=:qid::uuid RETURNING id::text"),
        {"cap": body.max_kapasite, "qid": queue_id},
    )
    if not result.fetchone():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kuyruk bulunamadı")
    await db.commit()
    return {"ok": True, "id": queue_id, "max_kapasite": body.max_kapasite}


# ═══════════════════════════ 7. Kuyruğu Duraklat / Aktifleştir ═══════════════

@router.patch("/queues/{queue_id}/toggle")
async def toggle_queue(
    queue_id: str,
    db: AsyncSession = Depends(get_async_db),
    _:  User = Depends(ADMIN),
):
    """aktif = NOT aktif. Her iki yön de desteklenir."""
    row = (await db.execute(text("""
        UPDATE kuyruklar
        SET    aktif = NOT aktif
        WHERE  id = :qid::uuid
        RETURNING id::text, aktif, ad AS kuyruk_adi
    """), {"qid": queue_id})).fetchone()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kuyruk bulunamadı")
    await db.commit()
    return {"ok": True, "id": row.id, "aktif": bool(row.aktif), "kuyruk_adi": row.kuyruk_adi}


# ═══════════════════════════ 8. Mola Zorla Bitir ════════════════════════════

@router.post("/actions/end-break/{user_id}")
async def end_break(
    user_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(ADMIN),
):
    """
    Personelin açık molasını hemen kapatır (bitis_zamani = NOW()).
    Audit kaydı atar.
    """
    result = await db.execute(text("""
        UPDATE molalar
        SET    bitis_zamani = NOW()
        WHERE  user_id       = :uid::uuid
          AND  bitis_zamani IS NULL
          AND  onay_durumu  IN ('onaylandi', 'beklemede')
        RETURNING id::text
    """), {"uid": user_id})
    rows = result.fetchall()

    if not rows:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "Aktif mola kaydı bulunamadı ya da mola zaten sona erdi",
        )

    # Audit
    try:
        await db.execute(text("""
            INSERT INTO denetim_izleri
                (user_id, aksiyon, tablo_adi, kayit_id, eski_deger, yeni_deger, tarih)
            VALUES
                (:uid::uuid, 'override'::audit_action, 'molalar', :kid::uuid,
                 '{"onay_durumu":"beklemede"}'::jsonb,
                 '{"bitis_zamani":"now","kaynak":"war_room_admin"}'::jsonb,
                 NOW())
        """), {"uid": str(current_user.id), "kid": rows[0].id})
    except Exception:
        pass  # audit hatası işlemi durdurmamalı

    await db.commit()
    return {"ok": True, "kapanan_mola_sayisi": len(rows)}


# ═══════════════════════════ 9. Anlık Talimat Gönder ════════════════════════

@router.post("/actions/send-instruction")
async def send_instruction(
    body: InstructionBody,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(ADMIN),
):
    """
    War room'dan personele/supervizöre anlık hızlı talimat.
    talimatlar tablosuna kayıt + bildirimler kaydı.
    """
    talimat_id = (await db.execute(text("""
        INSERT INTO talimatlar (gonderen_id, alici_id, baslik, icerik, durum)
        VALUES (:gid::uuid, :aid::uuid, :bas, :ic, 'beklemede')
        RETURNING id::text
    """), {
        "gid": str(current_user.id),
        "aid": body.alici_id,
        "bas": "⚡ Anlık Talimat (War Room)",
        "ic":  body.icerik,
    })).scalar()

    try:
        await db.execute(text("""
            INSERT INTO bildirimler
                (user_id, tip, baslik, mesaj, referans_tablo, referans_id, oncelik)
            VALUES
                (:uid::uuid, 'talimat', '⚡ War Room Talimatı', :ic,
                 'talimatlar', :ref::uuid, 2)
        """), {
            "uid": body.alici_id,
            "ic":  body.icerik,
            "ref": talimat_id,
        })
    except Exception:
        pass

    await db.commit()
    return {"ok": True, "talimat_id": talimat_id}
