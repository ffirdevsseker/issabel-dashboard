import uuid
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class Sikayet(Base):
    __tablename__ = "sikayetler"

    id                  = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    personel_id         = Column(PGUUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=False, index=True)
    musteri_id          = Column(PGUUID(as_uuid=True), nullable=True)
    cagri_id            = Column(PGUUID(as_uuid=True), nullable=True)
    kategori            = Column(String(64), default="")
    aciklama            = Column(Text, default="")
    durum               = Column(String(32), default="olusturuldu", index=True)
    xp_dusuldu_mu       = Column(Boolean, default=False)
    xp_geri_yuklendi_mi = Column(Boolean, default=False)
    supervisor_id       = Column(PGUUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=True)
    supervisor_notu     = Column(Text, nullable=True)
    supervisor_tarih    = Column(DateTime, nullable=True)
    admin_id            = Column(PGUUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=True)
    admin_notu          = Column(Text, nullable=True)
    admin_tarih         = Column(DateTime, nullable=True)
    tarih               = Column(DateTime, nullable=True, index=True)

    personel   = relationship("User", foreign_keys=[personel_id])
    supervisor = relationship("User", foreign_keys=[supervisor_id])
