from sqlalchemy import Column, Integer, String, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship
import uuid

from app.db.session import Base


class DashboardModul(Base):
    __tablename__ = "dashboard_modulleri"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kod = Column(String(64), unique=True, nullable=False)  # örn: 'team_monitor'
    ad = Column(String(128), nullable=False)
    bilesen_adi = Column(String(128), nullable=False)  # Frontend'deki component adı
    varsayilan_ayarlar = Column(JSON, nullable=True)


class RolModul(Base):
    __tablename__ = "rol_modulleri"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rol_id = Column(Integer, ForeignKey("roller.id", ondelete="CASCADE"), nullable=False)
    modul_id = Column(PGUUID(as_uuid=True), ForeignKey("dashboard_modulleri.id", ondelete="CASCADE"), nullable=False)
    sira = Column(Integer, default=0)

    modul = relationship("DashboardModul")
