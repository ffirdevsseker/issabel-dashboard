import uuid
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.session import Base


class Departman(Base):
    __tablename__ = "departmanlar"

    id                  = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ad                  = Column(String(128), nullable=False)
    dahili_baslangic    = Column(Integer, nullable=True)
    dahili_bitis        = Column(Integer, nullable=True)
    ivr_kodu            = Column(Integer, nullable=True)
    hedef_gunluk_cagri  = Column(Integer, nullable=True)
    max_mola_dakika     = Column(Integer, nullable=True)

    ekipler = relationship("Ekip", back_populates="departman")


class Ekip(Base):
    __tablename__ = "ekipler"

    id           = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    departman_id = Column(PGUUID(as_uuid=True), ForeignKey("departmanlar.id"), nullable=True)
    ad           = Column(String(128), nullable=False)
    aktif        = Column(Boolean, default=True)

    departman             = relationship("Departman", back_populates="ekipler")
    supervisor_atamalari  = relationship("SupervisorEkip", back_populates="ekip")


class SupervisorEkip(Base):
    __tablename__ = "supervisor_ekip"

    supervisor_id = Column(PGUUID(as_uuid=True), ForeignKey("kullanicilar.id"), primary_key=True)
    ekip_id       = Column(PGUUID(as_uuid=True), ForeignKey("ekipler.id"), primary_key=True)
    atama_tarihi  = Column(DateTime, server_default=func.now())

    ekip = relationship("Ekip", back_populates="supervisor_atamalari")
