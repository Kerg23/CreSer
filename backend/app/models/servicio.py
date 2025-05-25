from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql.sqltypes import DECIMAL
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.config.database import Base

class Servicio(Base):
    __tablename__ = "servicios"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=True)
    precio = Column(DECIMAL(10, 2), nullable=False)
    duracion_minutos = Column(Integer, nullable=False, default=60)
    categoria = Column(String(50), nullable=True, default="general")
    estado = Column(String(20), nullable=False, default="activo")
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # CORREGIDO: Solo relación básica con citas para MVP
    citas = relationship("Cita", back_populates="servicio", lazy="select")
    
    def to_dict(self):
        """Convertir modelo a diccionario"""
        return {
            'id': self.id,
            'codigo': self.codigo,
            'nombre': self.nombre,
            'descripcion': self.descripcion,
            'precio': float(self.precio),
            'duracion_minutos': self.duracion_minutos,
            'categoria': self.categoria,
            'estado': self.estado,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
