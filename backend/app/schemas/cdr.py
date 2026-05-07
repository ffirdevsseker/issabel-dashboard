from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class CDRRead(BaseModel):
    id: str
    baslangic_zamani: datetime
    bitis_zamani: Optional[datetime]
    durum: str
    yon: str
    konusma_suresi: int
    bekleme_suresi: int
    kategori: str

    model_config = ConfigDict(from_attributes=True)


class CDRStats(BaseModel):
    total_calls: int
    answered_calls: int
    no_answer_calls: int
    busy_calls: int
    failed_calls: int
    total_duration_seconds: int
    avg_duration_seconds: float
    answer_rate_percent: float
