"""Onay Merkezi (Approval Center) şemaları — şikayet, KB öneri, vardiya talebi."""
from datetime import datetime
from typing import Optional, Literal, List
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import UserBrief, GerekceMedium, GerekceLong


SikayetKategori = Literal["davranis", "urun", "kargo", "iade", "teknik", "diger"]
SikayetDurum = Literal[
    "olusturuldu", "supervisor_inceleme", "onaylandi", "reddedildi", "admin_iptali",
]


class SikayetRead(BaseModel):
    id: int
    personel_id: int
    ekip_id: int
    musteri_telefon: str = ""
    musteri_ad: str = ""
    cagri_uniqueid: str = ""
    kategori: SikayetKategori
    aciklama: str
    durum: SikayetDurum
    supervisor_gerekce: Optional[str] = None
    supervisor_karar_tarih: Optional[datetime] = None
    xp_etki: int
    created_at: datetime
    personel: Optional[UserBrief] = None

    model_config = ConfigDict(from_attributes=True)


class SikayetKarar(BaseModel):
    karar: Literal["onayla", "reddet"]
    gerekce: str = GerekceMedium  # min 30 char


class KbOneriRead(BaseModel):
    id: int
    onerii_personel_id: int
    ekip_id: int
    baslik: str
    icerik: str
    kategori: str = ""
    durum: Literal["beklemede", "onaylandi", "reddedildi", "admin_iptali"]
    supervisor_gerekce: Optional[str] = None
    karar_tarih: Optional[datetime] = None
    created_at: datetime
    personel: Optional[UserBrief] = None

    model_config = ConfigDict(from_attributes=True)


class KbOneriKarar(BaseModel):
    karar: Literal["onayla", "reddet"]
    gerekce: str = GerekceMedium


class ApprovalSummary(BaseModel):
    """Onay Merkezi başlık özeti — kaç tane bekleyen var."""
    bekleyen_sikayet: int
    bekleyen_vardiya_talep: int
    bekleyen_kb_oneri: int
    bekleyen_mola: int
    toplam: int
