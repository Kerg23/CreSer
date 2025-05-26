from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Enum
from sqlalchemy.types import DECIMAL
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.config.database import Base

class Credito(Base):
    __tablename__ = "creditos"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    pago_id = Column(Integer, ForeignKey('pagos.id'), nullable=False)
    servicio_id = Column(Integer, ForeignKey('servicios.id'), nullable=False)
    cantidad_inicial = Column(Integer, nullable=False)
    cantidad_disponible = Column(Integer, nullable=False)
    precio_unitario = Column(DECIMAL(10, 2), nullable=False)
    fecha_vencimiento = Column(Date, nullable=True)
    estado = Column(Enum('activo', 'agotado', 'vencido'), default='activo', nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="creditos")
    pago = relationship("Pago", back_populates="creditos")
    servicio = relationship("Servicio", back_populates="creditos")
    
    def to_dict(self):
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'pago_id': self.pago_id,
            'servicio_id': self.servicio_id,
            'cantidad_inicial': self.cantidad_inicial,
            'cantidad_disponible': self.cantidad_disponible,
            'precio_unitario': float(self.precio_unitario),
            'fecha_vencimiento': self.fecha_vencimiento.isoformat() if self.fecha_vencimiento else None,
            'estado': self.estado,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            # Incluir información del servicio si está disponible
            'servicio_nombre': self.servicio.nombre if self.servicio else None,
            'servicio_codigo': self.servicio.codigo if self.servicio else None
        }
