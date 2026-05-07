import uuid
from sqlalchemy import Column, String, DateTime, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.session import Base


class Vardiya(Base):
    __tablename__ = "vardiyalar"

    id            = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(PGUUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=False, index=True)
    tarih         = Column(Date, nullable=True)
    baslangic_saat = Column(String(10), nullable=True)
    bitis_saat     = Column(String(10), nullable=True)
    olusturan_id  = Column(PGUUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=True)

    personel  = relationship("User", foreign_keys=[user_id])
    olusturan = relationship("User", foreign_keys=[olusturan_id])


class VardiyaTalep(Base):
    __tablename__ = "vardiya_talepleri"

    id                      = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id                 = Column(PGUUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=False)
    mevcut_vardiya_id       = Column(PGUUID(as_uuid=True), ForeignKey("vardiyalar.id"), nullable=True)
    talep_edilen_baslangic  = Column(String(32), nullable=True)
    talep_edilen_bitis      = Column(String(32), nullable=True)
    talep_tarihi            = Column(DateTime, nullable=True)
    gerekce                 = Column(String(512), default="")
    durum                   = Column(String(32), default="beklemede", index=True)
    supervisor_id           = Column(PGUUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=True)
    supervisor_gorusu       = Column(String(255), nullable=True)
    supervisor_notu         = Column(String(512), nullable=True)
    admin_id                = Column(PGUUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=True)
    created_at              = Column(DateTime, server_default=func.now())

    personel   = relationship("User", foreign_keys=[user_id])
    supervisor = relationship("User", foreign_keys=[supervisor_id])
