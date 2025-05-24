from sqlalchemy import Column, Integer, String, DateTime, DECIMAL, ForeignKey, Date
from app.config.database import Base
from datetime import datetime, timezone

class Credito(Base):
    __tablename__ = "creditos"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    pago_id = Column(Integer, ForeignKey("pagos.id"), nullable=False)
    servicio_id = Column(Integer, ForeignKey("servicios.id"), nullable=False)
    cantidad_inicial = Column(Integer, nullable=False)
    cantidad_disponible = Column(Integer, nullable=False)
    precio_unitario = Column(DECIMAL(10, 2), nullable=False)
    fecha_vencimiento = Column(Date, nullable=True)
    estado = Column(String(20), default="activo")  # activo, agotado, vencido
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "usuario_id": self.usuario_id,
            "pago_id": self.pago_id,
            "servicio_id": self.servicio_id,
            "cantidad_inicial": self.cantidad_inicial,
            "cantidad_disponible": self.cantidad_disponible,
            "precio_unitario": float(self.precio_unitario),
            "fecha_vencimiento": self.fecha_vencimiento.isoformat() if self.fecha_vencimiento else None,
            "estado": self.estado,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
