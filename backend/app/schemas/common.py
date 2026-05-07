"""Tüm role schemas için ortak yardımcılar."""
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


# Backend'de gerekçe doğrulama (kritik #4 — frontend'de değil!)
GerekceShort = Field(min_length=10, max_length=255)
GerekceMedium = Field(min_length=30, max_length=500)
GerekceLong = Field(min_length=50, max_length=1000)  # override / iptal için


class UserBrief(BaseModel):
    """User'ın kısa özeti — listeleme yanıtlarında join sonucu döner."""
    id: int
    username: str
    full_name: str
    extension: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EkipBrief(BaseModel):
    id: int
    isim: str
    departman_id: int

    model_config = ConfigDict(from_attributes=True)


class PaginatedMeta(BaseModel):
    total: int
    page: int = 1
    page_size: int = 50
