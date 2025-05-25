from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql.sqltypes import DECIMAL
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.config.database import Base

class Credito(Base):
    __tablename__ = "creditos"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    servicio_id = Column(Integer, ForeignKey("servicios.id"), nullable=False)
    cantidad_inicial = Column(Integer, nullable=False, default=1)
    cantidad_disponible = Column(Integer, nullable=False, default=1)
    precio_unitario = Column(DECIMAL(10, 2), nullable=False, default=0.00)
    estado = Column(String(20), nullable=False, default="activo")
    fecha_vencimiento = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # CORREGIDO: Relaciones sin back_populates para evitar errores circulares
    usuario = relationship("Usuario", lazy="select")
    servicio = relationship("Servicio", lazy="select")
    
    def to_dict(self):
        """Convertir modelo a diccionario"""
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'servicio_id': self.servicio_id,
            'cantidad_inicial': self.cantidad_inicial,
            'cantidad_disponible': self.cantidad_disponible,
            'precio_unitario': float(self.precio_unitario),
            'estado': self.estado,
            'fecha_vencimiento': self.fecha_vencimiento.isoformat() if self.fecha_vencimiento else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
