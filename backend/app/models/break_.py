import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import relationship

from app.db.session import Base


class Mola(Base):
    __tablename__ = "molalar"

    id            = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(PGUUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=False, index=True)
    tip           = Column(String(32), default="")
    baslangic     = Column(DateTime, nullable=True)
    bitis         = Column(DateTime, nullable=True)
    onay_durumu   = Column(String(32), default="beklemede", index=True)
    supervisor_id = Column(PGUUID(as_uuid=True), ForeignKey("kullanicilar.id"), nullable=True)

    personel   = relationship("User", foreign_keys=[user_id])
    supervisor = relationship("User", foreign_keys=[supervisor_id])
