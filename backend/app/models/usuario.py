from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.config.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    telefono = Column(String(20), nullable=True)
    documento = Column(String(50), nullable=True)
    password = Column(String(255), nullable=False)
    tipo = Column(String(20), nullable=False, default="cliente")
    estado = Column(String(20), nullable=False, default="activo")
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # CORREGIDO: Solo relación básica con citas para MVP
    citas = relationship("Cita", back_populates="usuario", lazy="select")
    
    def to_dict(self):
        """Convertir modelo a diccionario"""
        return {
            'id': self.id,
            'nombre': self.nombre,
            'email': self.email,
            'telefono': self.telefono,
            'documento': self.documento,
            'tipo': self.tipo,
            'estado': self.estado,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
