import uuid
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from app.db.session import Base


class CDR(Base):
    __tablename__ = "cagri_kayitlari"

    id                     = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asterisk_id            = Column(String(64), default="")
    user_id                = Column(PGUUID(as_uuid=True), nullable=True, index=True)
    musteri_id             = Column(PGUUID(as_uuid=True), nullable=True)
    ekip_id                = Column(PGUUID(as_uuid=True), nullable=True)
    departman_id           = Column(PGUUID(as_uuid=True), nullable=True)
    queue_id               = Column(PGUUID(as_uuid=True), nullable=True)
    aktarildi_departman_id = Column(PGUUID(as_uuid=True), nullable=True)
    yon                    = Column(String(16), default="gelen")   # gelen / giden
    durum                  = Column(String(32), default="cevaplandi", index=True)
    kategori               = Column(String(64), default="")
    baslangic_zamani       = Column(DateTime, nullable=False, index=True)
    bitis_zamani           = Column(DateTime, nullable=True)
    konusma_suresi         = Column(Integer, default=0)  # saniye
    bekleme_suresi         = Column(Integer, default=0)
    csat_skoru             = Column(Integer, nullable=True)
    ses_kaydi_url          = Column(String(512), default="")
    ivr_yolu               = Column(String(255), default="")
