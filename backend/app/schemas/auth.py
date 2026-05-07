from typing import Optional, Literal
from pydantic import BaseModel, ConfigDict, field_validator


# Frontend'den gelen rol seçenekleri → DB'deki rol adına eşleme
SELECTED_ROLE_MAP: dict[str, list[str]] = {
    "admin":      ["admin"],
    "supervisor": ["supervisor"],
    "agent":      ["personel", "bt"],
}


class LoginRequest(BaseModel):
    username: str
    password: str
    selected_role: Literal["admin", "supervisor", "agent"]

    @field_validator("selected_role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        if v not in SELECTED_ROLE_MAP:
            raise ValueError("Geçersiz rol seçimi")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class UserMe(BaseModel):
    id: str
    username: str
    full_name: str
    extension: Optional[str]
    role: str
    is_active: bool
    departman_id: Optional[str]
    ekip_id: Optional[str]
    xp: int
    seviye: int
    unvan: str
    anlik_durum: str

    model_config = ConfigDict(from_attributes=True)
