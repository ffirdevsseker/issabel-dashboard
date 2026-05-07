"""Vardiya şemaları."""
from datetime import date, datetime
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import UserBrief, GerekceMedium


VardiyaTur = Literal["sabah", "gunduz", "aksam", "gece", "izin", "off"]
VardiyaDurum = Literal["planli", "tamamlandi", "iptal", "revize"]


class VardiyaRead(BaseModel):
    id: int
    personel_id: int
    ekip_id: int
    tarih: date
    baslangic: datetime
    bitis: datetime
    tur: VardiyaTur
    durum: VardiyaDurum
    notlar: str = ""
    personel: Optional[UserBrief] = None

    model_config = ConfigDict(from_attributes=True)


class VardiyaCreate(BaseModel):
    personel_id: int
    ekip_id: int
    tarih: date
    baslangic: datetime
    bitis: datetime
    tur: VardiyaTur
    notlar: Optional[str] = ""


class VardiyaUpdate(BaseModel):
    tur: Optional[VardiyaTur] = None
    baslangic: Optional[datetime] = None
    bitis: Optional[datetime] = None
    durum: Optional[VardiyaDurum] = None
    notlar: Optional[str] = None
    gerekce: str = GerekceMedium  # değişiklik gerekçesi audit log'a düşer


# ── Talepler ─────────────────────────────────────────────────────────
TalepDurum = Literal[
    "gonderildi", "supervisor_gorus", "admin_karari",
    "onaylandi", "reddedildi", "iptal",
]
SupervisorGorus = Literal["uygun", "uygun_degil"]


class VardiyaTalepRead(BaseModel):
    id: int
    personel_id: int
    talep_tarih: date
    talep_tur: VardiyaTur
    talep_baslangic: datetime
    talep_bitis: datetime
    personel_gerekce: str
    durum: TalepDurum
    supervisor_gorus: Optional[SupervisorGorus] = None
    supervisor_gerekce: Optional[str] = None
    supervisor_karar_tarih: Optional[datetime] = None
    created_at: datetime
    personel: Optional[UserBrief] = None

    model_config = ConfigDict(from_attributes=True)


class VardiyaTalepKarar(BaseModel):
    """Supervisor'ın görüş bildirme aksiyonu."""
    gorus: SupervisorGorus
    gerekce: str = GerekceMedium


# ── Toplu Vardiya ────────────────────────────────────────────────────
class BulkShiftEntry(BaseModel):
    personel_id: int
    tarih: date
    tur: VardiyaTur
    baslangic: datetime
    bitis: datetime
    notlar: Optional[str] = ""


class BulkShiftRequest(BaseModel):
    entries: list[BulkShiftEntry]
    overwrite: bool = False
    ekip_id: int


class BulkShiftResponse(BaseModel):
    created: int
    updated: int
    skipped: int
    errors: list[str] = []


# ── Şablon ───────────────────────────────────────────────────────────
class TemplateRequest(BaseModel):
    template_id: str  # "std" | "rotA" | "rotB"
    year: int = Field(..., ge=2020, le=2100)
    month: int = Field(..., ge=1, le=12)
    ekip_id: int
    overwrite: bool = False


# ── Takvim / Haftalık ────────────────────────────────────────────────
class CalendarDaySummary(BaseModel):
    tarih: date
    working: int = 0
    total: int = 0
    night: int = 0
    leave: int = 0
    pending: int = 0


class WeeklyStats(BaseModel):
    toplam_planlanan_saat: float = 0.0
    atanmamis_slot: int = 0
    fazla_mesai_personel: int = 0
    bekleyen_talep: int = 0
    doluluk_oran: float = 0.0
