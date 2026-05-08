"""
Personel Yönetim Merkezi – Staff API  (Müşteri Hizmetleri Departmanı)
──────────────────────────────────────────────────────────────────────
GET  /api/staff/matrix                    → Personel listesi (rol / ekip / kuyruk)
GET  /api/staff/attendance?week=current   → Haftalık devam/vardiya verisi
PUT  /api/staff/{user_id}/role            → Rol / ekip / kuyruk güncelle

Not: Tüm endpoint'ler require_admin ile korunur.
     Hesaplanan geç giriş / erken çıkış dakikaları sorgu katmanında çözülür.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.async_session import get_async_db
from app.api.deps import require_admin
from app.models.user import User

router = APIRouter(prefix="/staff", tags=["Staff — Personel Yönetim Merkezi"])
ADMIN = require_admin


# ═════════════════════════ Pydantic Şemaları ══════════════════════════════════

class PersonnelItem(BaseModel):
    id:         str
    ad_soyad:   str
    dahili_no:  Optional[str]
    rol:        str                   # supervisor | agent
    rol_id:     Optional[str]
    ekip:       Optional[str]
    ekip_id:    Optional[str]
    kuyruk:     Optional[str]
    durum:      str                   # active | inactive


class DayRecord(BaseModel):
    tarih:          date
    gun_adi:        str               # Pzt, Sal, …
    planned_start:  Optional[str]     # "09:00" | null
    planned_end:    Optional[str]     # "18:00" | null
    actual_in:      Optional[str]     # "09:15" | null
    actual_out:     Optional[str]     # "18:00" | null
    gec_giris_dk:   int               # geç giriş süresi (dk), 0 = yok
    erken_cikis_dk: int               # erken çıkış süresi (dk), 0 = yok
    mola_asimi:     bool              # mola süresi aşıldı mı
    mola_sure_dk:   int               # gerçekleşen toplam mola (dk)
    devamsiz:       bool              # mesai vardı ama gelmedi


class PersonWeek(BaseModel):
    kisi_id:   str
    ad_soyad:  str
    ekip:      Optional[str]
    gunler:    List[DayRecord]        # 7 eleman (Pzt → Paz)


class AttendanceResponse(BaseModel):
    hafta_baslangic: date
    hafta_bitis:     date
    veriler:         List[PersonWeek]


class UpdateRoleBody(BaseModel):
    rol_id:    Optional[str] = None
    ekip_id:   Optional[str] = None
    kuyruk_id: Optional[str] = None
    dahili_no: Optional[str] = None


# ═════════════════════════ Yardımcı Fonksiyonlar ═════════════════════════════

def _week_bounds(offset: int = 0) -> tuple[date, date]:
    """Cari haftanın Pazartesi – Pazar sınırlarını döndürür (ISO takvim)."""
    today  = date.today()
    monday = today - timedelta(days=today.weekday()) + timedelta(weeks=offset)
    sunday = monday + timedelta(days=6)
    return monday, sunday


DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]


def _day_name(d: date) -> str:
    return DAY_NAMES[d.weekday()]


# ═════════════════════════ 1. Personel Listesi ════════════════════════════════

@router.get("/matrix", response_model=List[PersonnelItem])
async def staff_matrix(
    db:  AsyncSession = Depends(get_async_db),
    _:   User = Depends(ADMIN),
):
    """
    Müşteri Hizmetleri departmanındaki personeli listeler.
    Departman filtresi: departman.ad ILIKE '%müşteri%'.
    """
    rows = (await db.execute(text("""
        SELECT
            u.id::text                                                    AS id,
            u.ad_soyad,
            u.dahili_no,
            r.ad                                                          AS rol,
            r.id::text                                                    AS rol_id,
            e.ad                                                          AS ekip,
            e.id::text                                                    AS ekip_id,
            q.ad                                                          AS kuyruk,
            CASE WHEN u.silindi_mi THEN 'inactive' ELSE 'active' END      AS durum
        FROM kullanicilar u
        LEFT JOIN roller          r   ON r.id = u.rol_id
        LEFT JOIN ekip_uyeler     eu  ON eu.user_id = u.id AND eu.aktif = TRUE
        LEFT JOIN ekipler         e   ON e.id = eu.ekip_id
        LEFT JOIN departmanlar    d   ON d.id = e.departman_id
        LEFT JOIN kuyruklar       q   ON q.id = u.varsayilan_kuyruk_id
        WHERE d.ad ILIKE '%müşteri%'
           OR d.ad ILIKE '%musteri%'
        ORDER BY
            CASE r.ad
                WHEN 'supervisor' THEN 1
                WHEN 'admin'      THEN 0
                ELSE 2
            END,
            u.ad_soyad
    """))).fetchall()

    return [
        PersonnelItem(
            id         = r.id,
            ad_soyad   = r.ad_soyad,
            dahili_no  = r.dahili_no,
            rol        = r.rol or "agent",
            rol_id     = r.rol_id,
            ekip       = r.ekip,
            ekip_id    = r.ekip_id,
            kuyruk     = r.kuyruk,
            durum      = r.durum,
        )
        for r in rows
    ]


# ═════════════════════════ 2. Haftalık Devam Verisi ══════════════════════════

@router.get("/attendance", response_model=AttendanceResponse)
async def staff_attendance(
    week:   str           = Query("current", description="'current' veya offset: '-1', '+1'"),
    db:     AsyncSession  = Depends(get_async_db),
    _:      User          = Depends(ADMIN),
):
    """
    Haftalık devam / vardiya verisi.

    Hesaplama mantığı:
      • gec_giris_dk   = MAX(0, login_zamani − vardiya.baslangic_saati)
      • erken_cikis_dk = MAX(0, vardiya.bitis_saati  − cikis_zamani)
      • mola_asimi     = BOOL(mola_sure_dk > planlanan_mola_dk)
    """
    offset = 0
    if week.lstrip("+-").isdigit():
        offset = int(week)

    pzt, paz = _week_bounds(offset)

    # Personel listesi (aynı müşteri hizmetleri filtresi)
    persons = (await db.execute(text("""
        SELECT u.id::text AS id, u.ad_soyad, e.ad AS ekip
        FROM kullanicilar u
        LEFT JOIN ekip_uyeler eu ON eu.user_id = u.id AND eu.aktif = TRUE
        LEFT JOIN ekipler     e  ON e.id = eu.ekip_id
        LEFT JOIN departmanlar d ON d.id = e.departman_id
        WHERE (d.ad ILIKE '%müşteri%' OR d.ad ILIKE '%musteri%')
          AND u.silindi_mi = FALSE
        ORDER BY u.ad_soyad
    """))).fetchall()

    results: list[PersonWeek] = []

    for p in persons:
        # Tüm haftanın oturum logları
        sessions = (await db.execute(text("""
            SELECT
                DATE(pol.login_zamani)                         AS tarih,
                pol.login_zamani,
                pol.cikis_zamani,
                COALESCE(pol.gec_giris_dk, 0)                  AS gec_dk,
                v.baslangic_saati                              AS v_baslangic,
                v.bitis_saati                                  AS v_bitis
            FROM personel_oturum_loglari pol
            LEFT JOIN vardiyalar v ON v.id = pol.vardiya_id
            WHERE pol.user_id = :uid::uuid
              AND DATE(pol.login_zamani) BETWEEN :pzt AND :paz
            ORDER BY pol.login_zamani
        """), {"uid": p.id, "pzt": pzt, "paz": paz})).fetchall()

        # Molalar (haftalık toplu)
        breaks = (await db.execute(text("""
            SELECT
                DATE(m.baslangic)                              AS tarih,
                COALESCE(mt.sure_dk, 0)                        AS planlanan_dk,
                ROUND(
                    EXTRACT(EPOCH FROM (COALESCE(m.bitis, NOW()) - m.baslangic))::numeric / 60, 1
                )                                              AS gercek_dk
            FROM molalar m
            LEFT JOIN mola_turleri mt ON mt.ad = m.tip
            WHERE m.user_id = :uid::uuid
              AND DATE(m.baslangic) BETWEEN :pzt AND :paz
        """), {"uid": p.id, "pzt": pzt, "paz": paz})).fetchall()

        # Vardiyalar (planlanan)
        shifts = (await db.execute(text("""
            SELECT
                pv.tarih,
                v.baslangic_saati,
                v.bitis_saati
            FROM personel_vardiyalari pv
            JOIN vardiyalar v ON v.id = pv.vardiya_id
            WHERE pv.user_id = :uid::uuid
              AND pv.tarih BETWEEN :pzt AND :paz
        """), {"uid": p.id, "pzt": pzt, "paz": paz})).fetchall()

        # Günlük özet lookup sözlükleri
        session_map = {r.tarih: r for r in sessions}
        shift_map   = {r.tarih: r for r in shifts}
        break_map: dict = {}
        for b in breaks:
            if b.tarih not in break_map:
                break_map[b.tarih] = {"planlanan": b.planlanan_dk, "gercek": 0.0}
            break_map[b.tarih]["gercek"] += float(b.gercek_dk or 0)

        gunler: list[DayRecord] = []
        for i in range(7):
            gun = pzt + timedelta(days=i)
            sf  = shift_map.get(gun)
            ss  = session_map.get(gun)
            bk  = break_map.get(gun)

            # Erken çıkış hesabı (dakika)
            erken = 0
            if sf and ss and ss.cikis_zamani and sf.bitis_saati:
                planned_end = datetime.combine(gun, sf.bitis_saati)
                if ss.cikis_zamani < planned_end:
                    erken = max(0, int((planned_end - ss.cikis_zamani).total_seconds() / 60))

            mola_asimi = False
            mola_sure  = 0
            if bk:
                mola_sure  = int(bk["gercek"])
                mola_asimi = bk["gercek"] > bk["planlanan"] and bk["planlanan"] > 0

            gunler.append(DayRecord(
                tarih          = gun,
                gun_adi        = _day_name(gun),
                planned_start  = str(sf.baslangic_saati)[:5] if sf else None,
                planned_end    = str(sf.bitis_saati)[:5]     if sf else None,
                actual_in      = ss.login_zamani.strftime("%H:%M")   if ss else None,
                actual_out     = ss.cikis_zamani.strftime("%H:%M")   if ss and ss.cikis_zamani else None,
                gec_giris_dk   = int(ss.gec_dk) if ss else 0,
                erken_cikis_dk = erken,
                mola_asimi     = mola_asimi,
                mola_sure_dk   = mola_sure,
                devamsiz       = bool(sf and not ss),   # vardiya var ama oturum yok
            ))

        results.append(PersonWeek(
            kisi_id  = p.id,
            ad_soyad = p.ad_soyad,
            ekip     = p.ekip,
            gunler   = gunler,
        ))

    return AttendanceResponse(
        hafta_baslangic = pzt,
        hafta_bitis     = paz,
        veriler         = results,
    )


# ═════════════════════════ 3. Rol / Ekip Güncelle ════════════════════════════

@router.put("/{user_id}/role")
async def update_staff_role(
    user_id:      str,
    body:         UpdateRoleBody,
    db:           AsyncSession = Depends(get_async_db),
    current_user: User = Depends(ADMIN),
):
    """
    Personelin rol, ekip, kuyruk veya dahili numarasını günceller.
    Yalnızca gönderilen alanlar değiştirilir (COALESCE mantığı).
    Audit log: denetim_izleri.eylem = 'rol_degisikligi'
    """
    # Mevcut durumu oku
    cur = (await db.execute(text("""
        SELECT id::text, rol_id::text, dahili_no
        FROM kullanicilar
        WHERE id = :uid::uuid AND silindi_mi = FALSE
    """), {"uid": user_id})).fetchone()

    if not cur:
        raise HTTPException(404, "Personel bulunamadı")

    # Dinamik SET cümleciği
    sets:   list[str] = []
    params: dict      = {"uid": user_id}

    if body.rol_id is not None:
        sets.append("rol_id = :rol_id::uuid")
        params["rol_id"] = body.rol_id

    if body.dahili_no is not None:
        sets.append("dahili_no = :dahili_no")
        params["dahili_no"] = body.dahili_no

    if body.kuyruk_id is not None:
        sets.append("varsayilan_kuyruk_id = :kuyruk_id::uuid")
        params["kuyruk_id"] = body.kuyruk_id

    if sets:
        await db.execute(
            text(f"UPDATE kullanicilar SET {', '.join(sets)} WHERE id = :uid::uuid"),
            params,
        )

    # Ekip ataması
    if body.ekip_id is not None:
        await db.execute(text("""
            UPDATE ekip_uyeler SET aktif = FALSE
            WHERE user_id = :uid::uuid AND aktif = TRUE
        """), {"uid": user_id})
        await db.execute(text("""
            INSERT INTO ekip_uyeler (user_id, ekip_id, aktif, katilma_tarihi)
            VALUES (:uid::uuid, :ekip_id::uuid, TRUE, NOW())
            ON CONFLICT (user_id, ekip_id) DO UPDATE SET aktif = TRUE, katilma_tarihi = NOW()
        """), {"uid": user_id, "ekip_id": body.ekip_id})

    # Audit log (temel)
    try:
        await db.execute(text("""
            INSERT INTO denetim_izleri (islem_yapan_id, hedef_tablo, hedef_id, eylem)
            VALUES (:yapan::uuid, 'kullanicilar', :hedef, 'rol_degisikligi')
        """), {"yapan": str(current_user.id), "hedef": user_id})
    except Exception:
        pass  # tablo şeması uyumsuzsa sessizce geç

    await db.commit()
    return {"ok": True, "user_id": user_id}
