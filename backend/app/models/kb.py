import uuid
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.session import Base


class KbMakale(Base):
    __tablename__ = "kb_makaleler"

    id               = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    baslik           = Column(String(255), nullable=False)
    icerik           = Column(Text, default="")
    # DB'de kolon adı `kategori_id` — attribute adını koruyoruz ama gerçek kolonu eşliyoruz
    kategori         = Column("kategori_id", String(64), default="")
    olusturan_id     = Column(PGUUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=True)
    aktif            = Column(Boolean, default=True)
    olusturma_tarihi = Column(DateTime, server_default=func.now())

    olusturan = relationship("User", foreign_keys=[olusturan_id])


class KbOneri(Base):
    __tablename__ = "kb_oneriler"

    id             = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    oneren_id      = Column(PGUUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=True)
    baslik         = Column(String(255), nullable=False)
    icerik         = Column(Text, default="")
    gerekce        = Column(Text, default="")
    durum          = Column(String(32), default="beklemede", index=True)
    supervisor_id  = Column(PGUUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=True)
    supervisor_notu = Column(Text, nullable=True)
    makale_id      = Column(PGUUID(as_uuid=True), nullable=True)
    created_at     = Column(DateTime, server_default=func.now())

    oneren     = relationship("User", foreign_keys=[oneren_id])
    supervisor = relationship("User", foreign_keys=[supervisor_id])
