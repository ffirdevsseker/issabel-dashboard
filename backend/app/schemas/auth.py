from typing import Optional
from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserMe(BaseModel):
    id: str          # UUID returned as string
    username: str
    full_name: str
    extension: Optional[str]
    role: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
