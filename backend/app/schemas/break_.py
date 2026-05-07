"""Mola şemaları."""
from datetime import date, datetime
from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import UserBrief, GerekceShort


MolaTur = Literal["kahve", "yemek", "kisa", "sigara", "diger"]
MolaDurum = Literal["beklemede", "onaylandi", "reddedildi", "tamamlandi", "iptal"]


class MolaRead(BaseModel):
    id: int
    personel_id: int
    ekip_id: int
    tarih: date
    baslangic: datetime
    bitis: datetime
    sure_dakika: int
    tur: MolaTur
    durum: MolaDurum
    personel_gerekce: str = ""
    supervisor_gerekce: str = ""
    karar_tarih: Optional[datetime] = None
    created_at: datetime
    personel: Optional[UserBrief] = None

    model_config = ConfigDict(from_attributes=True)


class MolaKarar(BaseModel):
    """Supervisor onay/red aksiyonu."""
    karar: Literal["onayla", "reddet"]
    gerekce: Optional[str] = Field(default=None, max_length=255)


class MolaKuraliRead(BaseModel):
    id: int
    ekip_id: Optional[int] = None
    gunluk_max_dakika: int
    eszamanli_max_kisi: int
    min_calisma_dakika: int
    aktif: bool

    model_config = ConfigDict(from_attributes=True)


class MolaKuraliUpdate(BaseModel):
    gunluk_max_dakika: Optional[int] = Field(default=None, ge=0, le=480)
    eszamanli_max_kisi: Optional[int] = Field(default=None, ge=0, le=50)
    min_calisma_dakika: Optional[int] = Field(default=None, ge=0, le=480)
    aktif: Optional[bool] = None
    gerekce: str = GerekceShort
