import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from app.db.session import Base


class CallbackTakip(Base):
    """Cevapsız/meşgul çağrılar için geri arama takip tablosu."""
    __tablename__ = "callback_takip"

    id          = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cdr_id      = Column(PGUUID(as_uuid=True), nullable=False, index=True)
    agent_id    = Column(PGUUID(as_uuid=True), nullable=False)
    durum       = Column(String(32), default="bekliyor")
    # bekliyor | arandı | ulasilamadi | tamamlandi
    guncelleme_zamani = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
