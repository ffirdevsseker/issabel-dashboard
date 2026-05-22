import uuid
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.dialects.postgresql import UUID as PGUUID, ENUM as PG_ENUM

from app.db.session import Base

# create_type=False → tip DB'de zaten var, SQLAlchemy CREATE TYPE yapmaz
_cagri_yonu  = PG_ENUM("gelen", "giden", "dahili",
                        name="cagri_yonu", create_type=False)
_durum_cagri = PG_ENUM("cevaplandi", "aktarildi", "cevaplanmadi",
                        "mesgul", "baglaniyor", "devam_ediyor",
                        name="durum_cagri", create_type=False)


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
    yon                    = Column(_cagri_yonu,  default="gelen")
    durum                  = Column(_durum_cagri, default="cevaplandi", index=True)
    kategori               = Column(String(64), default="")
    baslangic_zamani       = Column(DateTime(timezone=True), nullable=False, index=True)
    bitis_zamani           = Column(DateTime(timezone=True), nullable=True)
    konusma_suresi         = Column(Integer, default=0)  # saniye
    bekleme_suresi         = Column(Integer, default=0)
    csat_skoru             = Column(Integer, nullable=True)
    ses_kaydi_url          = Column(String(512), default="")
    ivr_yolu               = Column(String(255), default="")
