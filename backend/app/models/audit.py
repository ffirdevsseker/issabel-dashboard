from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.sql import func

from app.db.session import Base


class DenetimIzi(Base):
    __tablename__ = "denetim_izleri"

    # No serial id in real DB — use composite PK so SQLAlchemy is happy
    islem_yapan_id = Column(PGUUID(as_uuid=True), primary_key=True)
    hedef_tablo    = Column(String(64), primary_key=True)
    hedef_id       = Column(String(64), primary_key=True, default="")
    eylem          = Column(String(64), primary_key=True)
    created_at     = Column(DateTime, primary_key=True, server_default=func.now())
    eski_veri      = Column(JSON, nullable=True)
    yeni_veri      = Column(JSON, nullable=True)
