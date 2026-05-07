"""
Vardiya şablonları servisi.

Mevcut şablonlar:
  std  — Pzt-Cum gündüz (09:00-18:00), Cmt-Paz off
  rotA — Personel sırasına göre dönüşümlü sabah/aksam, 5 gün çalışma
  rotB — Tam kadro, hafta sonları dahil, gece dahil rotasyon
"""
from __future__ import annotations

import calendar
from datetime import date, datetime, timedelta
from typing import List

from sqlalchemy.orm import Session

from app.core.audit import write_audit
from app.models.shift import Vardiya
from app.schemas.shift import BulkShiftResponse


# ─────────────────────────────────────────────────────────────────────────────
# Şablon Tanımları
# ─────────────────────────────────────────────────────────────────────────────

# Her şablon:  { weekday (0=Pzt … 6=Paz): { "tur": str, "saat": (başlangıç_saat, bitiş_saat) } }
# "off" günler için tur="off" — saat değerleri ihmal edilir.

TEMPLATE_DEFINITIONS: dict[str, dict] = {
    "std": {
        # Pzt-Cum gündüz, Cmt-Paz off
        "type": "fixed",
        "days": {
            0: {"tur": "gunduz", "hours": (9, 18)},   # Pazartesi
            1: {"tur": "gunduz", "hours": (9, 18)},   # Salı
            2: {"tur": "gunduz", "hours": (9, 18)},   # Çarşamba
            3: {"tur": "gunduz", "hours": (9, 18)},   # Perşembe
            4: {"tur": "gunduz", "hours": (9, 18)},   # Cuma
            5: {"tur": "off",    "hours": (0, 0)},    # Cumartesi
            6: {"tur": "off",    "hours": (0, 0)},    # Pazar
        },
    },
    "rotA": {
        # Dönüşümlü sabah/aksam, 5 gün çalışma 2 gün off
        # Personelin ekipteki index'ine göre (çift → sabah-önce, tek → aksam-önce)
        "type": "rotating_2shift",
        "cycle": [
            {"tur": "sabah",  "hours": (7, 15)},
            {"tur": "aksam",  "hours": (15, 23)},
            {"tur": "sabah",  "hours": (7, 15)},
            {"tur": "aksam",  "hours": (15, 23)},
            {"tur": "sabah",  "hours": (7, 15)},
            {"tur": "off",    "hours": (0, 0)},
            {"tur": "off",    "hours": (0, 0)},
        ],
    },
    "rotB": {
        # Tam kadro 7 gün, 3-shift rotasyon (sabah/aksam/gece) + 2 gün off
        "type": "rotating_3shift",
        "cycle": [
            {"tur": "sabah",  "hours": (6, 14)},
            {"tur": "sabah",  "hours": (6, 14)},
            {"tur": "aksam",  "hours": (14, 22)},
            {"tur": "aksam",  "hours": (14, 22)},
            {"tur": "gece",   "hours": (22, 6)},    # bitiş ertesi gün
            {"tur": "off",    "hours": (0, 0)},
            {"tur": "off",    "hours": (0, 0)},
        ],
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# Yardımcı
# ─────────────────────────────────────────────────────────────────────────────

def _make_dt(d: date, hour: int) -> datetime:
    """Tarih + saat → datetime (timezone-naive)."""
    return datetime(d.year, d.month, d.day, hour % 24, 0, 0)


def _gece_bitis(d: date, hour: int) -> datetime:
    """Gece vardiyası bitiş saati: 06:00 ertesi gün."""
    if hour < 12:  # gece yarısını geçiyorsa ertesi gün
        return _make_dt(d + timedelta(days=1), hour)
    return _make_dt(d, hour)


def _get_day_slot(template_id: str, personel_index: int, day_of_month_0: int) -> dict:
    """
    Verilen şablon, personel index'i ve ayın 0-tabanlı günü için
    {'tur': str, 'hours': (start_h, end_h)} döner.
    """
    tpl = TEMPLATE_DEFINITIONS[template_id]

    if tpl["type"] == "fixed":
        # Haftanın günü bazlı sabit şablon
        day_date = date(2000, 1, 1) + timedelta(days=day_of_month_0)  # dummy, sadece weekday için
        return tpl["days"].get(day_date.weekday(), {"tur": "off", "hours": (0, 0)})

    # Döngüsel şablonlar
    cycle: list = tpl["cycle"]
    cycle_len = len(cycle)
    # Personel index'ine göre başlangıç offset'i (her personel farklı günden başlar)
    offset = (personel_index * (cycle_len // 2)) % cycle_len
    slot_index = (day_of_month_0 + offset) % cycle_len
    return cycle[slot_index]


# ─────────────────────────────────────────────────────────────────────────────
# Ana Fonksiyon
# ─────────────────────────────────────────────────────────────────────────────

def apply_template(
    db: Session,
    template_id: str,
    year: int,
    month: int,
    ekip_id: int,
    personel_list: List,   # List[User] veya UserBrief-like nesneleri (id alanı olmalı)
    overwrite: bool,
    actor=None,            # audit için mevcut kullanıcı
    request=None,
) -> BulkShiftResponse:
    """
    Verilen şablonu, ekip personeline aylık olarak uygular.
    Mevcut kayıtlar:
      - overwrite=False → skip
      - overwrite=True  → güncelle (PATCH)
    Atomik değil: hatalı satırlar atlanır, diğerleri işlenir.
    """
    if template_id not in TEMPLATE_DEFINITIONS:
        raise ValueError(f"Geçersiz şablon: {template_id}")

    tpl = TEMPLATE_DEFINITIONS[template_id]
    days_in_month = calendar.monthrange(year, month)[1]

    created = 0
    updated = 0
    skipped = 0
    errors: list[str] = []

    for p_index, personel in enumerate(personel_list):
        for day_0 in range(days_in_month):
            current_date = date(year, month, day_0 + 1)
            day_of_month_0 = day_0

            # Şablon türüne göre slot belirle
            if tpl["type"] == "fixed":
                slot = tpl["days"].get(current_date.weekday(), {"tur": "off", "hours": (0, 0)})
            else:
                cycle: list = tpl["cycle"]
                cycle_len = len(cycle)
                offset = (p_index * (cycle_len // 2)) % cycle_len
                slot_index = (day_of_month_0 + offset) % cycle_len
                slot = cycle[slot_index]

            tur = slot["tur"]
            start_h, end_h = slot["hours"]

            # off/izin → saat değeri göstermelik
            if tur in ("off", "izin"):
                baslangic_dt = _make_dt(current_date, 0)
                bitis_dt = _make_dt(current_date, 0)
            elif tur == "gece":
                baslangic_dt = _make_dt(current_date, start_h)
                bitis_dt = _gece_bitis(current_date, end_h)
            else:
                baslangic_dt = _make_dt(current_date, start_h)
                bitis_dt = _make_dt(current_date, end_h)

            # Çakışma kontrolü
            existing = (
                db.query(Vardiya)
                .filter(
                    Vardiya.personel_id == personel.id,
                    Vardiya.tarih == current_date,
                    Vardiya.durum != "iptal",
                )
                .first()
            )

            try:
                if existing:
                    if not overwrite:
                        skipped += 1
                        continue
                    # Güncelle
                    existing.tur = tur
                    existing.baslangic = baslangic_dt
                    existing.bitis = bitis_dt
                    existing.ekip_id = ekip_id
                    db.flush()
                    if actor:
                        write_audit(
                            db, actor,
                            action="SHIFT_TEMPLATE_UPDATE",
                            target_type="vardiya",
                            target_id=str(existing.id),
                            detay={"template": template_id, "tarih": current_date.isoformat()},
                            request=request,
                        )
                    updated += 1
                else:
                    v = Vardiya(
                        personel_id=personel.id,
                        ekip_id=ekip_id,
                        tarih=current_date,
                        baslangic=baslangic_dt,
                        bitis=bitis_dt,
                        tur=tur,
                        durum="planli",
                        notlar=f"Şablon: {template_id}",
                        olusturan_id=actor.id if actor else personel.id,
                    )
                    db.add(v)
                    db.flush()
                    if actor:
                        write_audit(
                            db, actor,
                            action="SHIFT_TEMPLATE_CREATE",
                            target_type="vardiya",
                            target_id=str(v.id),
                            detay={"template": template_id, "tarih": current_date.isoformat()},
                            request=request,
                        )
                    created += 1
            except Exception as exc:
                db.rollback()
                errors.append(
                    f"personel_id={personel.id} tarih={current_date.isoformat()}: {str(exc)}"
                )

    db.commit()
    return BulkShiftResponse(created=created, updated=updated, skipped=skipped, errors=errors)
