from sqlalchemy import Column, Integer, String
from app.db.session import Base


class Rol(Base):
    __tablename__ = "roller"

    id = Column(Integer, primary_key=True)
    ad = Column(String(32), unique=True, nullable=False)
