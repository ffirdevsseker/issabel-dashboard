import uuid
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID, ENUM as PG_ENUM
from sqlalchemy.sql import func

_durum_personel = PG_ENUM("aktif", "mola", "mesgul", "offline",
                           name="durum_personel", create_type=False)

from app.db.session import Base

ROLE_MAP = {1: "admin", 2: "supervisor", 3: "personel", 4: "bt"}


class User(Base):
    __tablename__ = "kullanicilar"

    id             = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rol_id         = Column(Integer, ForeignKey("roller.id"), nullable=False, default=3)
    departman_id   = Column(PGUUID(as_uuid=True), ForeignKey("departmanlar.id"), nullable=True)
    ekip_id        = Column(PGUUID(as_uuid=True), ForeignKey("ekipler.id"), nullable=True)
    ad_soyad       = Column(String(128), default="")
    kullanici_adi  = Column(String(64), unique=True, nullable=False, index=True)
    sifre_hash     = Column(String(255), nullable=False)
    dahili_no      = Column(String(32), nullable=True, index=True)
    xp             = Column(Integer, default=0)
    seviye         = Column(Integer, default=1)
    unvan          = Column(String(64), default="Bronz")
    anlik_durum    = Column(_durum_personel, default="offline")
    sip_durumu     = Column(String(32), nullable=True)
    son_sip_guncelleme = Column(DateTime, nullable=True)
    sip_cihaz_bilgisi = Column(String(200), nullable=True)
    varsayilan_kuyruk_id = Column(PGUUID(as_uuid=True), nullable=True)
    silindi_mi     = Column(Boolean, default=False)
    olusturma_tarihi = Column(DateTime, server_default=func.now())

    # --- backward-compat properties so existing API code works unchanged ---

    @property
    def username(self) -> str:
        return self.kullanici_adi

    @property
    def hashed_password(self) -> str:
        return self.sifre_hash

    @property
    def full_name(self) -> str:
        return self.ad_soyad

    @property
    def extension(self) -> str | None:
        return self.dahili_no

    @property
    def is_active(self) -> bool:
        return not self.silindi_mi

    @property
    def role_name(self) -> str:
        # get_current_user tarafından DB'den set edilirse onu kullan
        if hasattr(self, "_db_role") and self._db_role:
            return self._db_role
        return ROLE_MAP.get(self.rol_id, "personel")
