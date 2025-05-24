from sqlalchemy import Column, Integer, String, DateTime, Text, DECIMAL, Enum
from app.config.database import Base
from datetime import datetime, timezone
import enum

class CategoriaServicio(str, enum.Enum):
    EVALUACION = "evaluacion"
    TERAPEUTICO = "terapeutico"
    ESPECIALIZADO = "especializado"

class Servicio(Base):
    __tablename__ = "servicios"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True)
    codigo = Column(String(50), unique=True, nullable=False)
    nombre = Column(String(255), nullable=False)
    descripcion = Column(Text)
    precio = Column(DECIMAL(10, 2), nullable=False)
    duracion_minutos = Column(Integer, default=60)
    categoria = Column(String(20), nullable=False)
    estado = Column(String(20), default="activo")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "codigo": self.codigo,
            "nombre": self.nombre,
            "descripcion": self.descripcion,
            "precio": float(self.precio),
            "duracion_minutos": self.duracion_minutos,
            "categoria": self.categoria,
            "estado": self.estado,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
