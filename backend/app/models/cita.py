from sqlalchemy import Column, Integer, String, Date, Time, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.config.database import Base

class Cita(Base):
    __tablename__ = "citas"
    
    # CAMPOS ESENCIALES PARA MVP
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    servicio_id = Column(Integer, ForeignKey("servicios.id"), nullable=False)
    credito_id = Column(Integer, ForeignKey("creditos.id"), nullable=True)  # NULLABLE para MVP
    fecha = Column(Date, nullable=False)
    hora = Column(Time, nullable=False)
    modalidad = Column(String(20), nullable=False, default="presencial")
    estado = Column(String(20), nullable=False, default="agendada")
    
    # CAMPOS OPCIONALES (pueden ser NULL)
    comentarios_cliente = Column(Text, nullable=True)
    comentarios_admin = Column(Text, nullable=True)
    
    # TIMESTAMPS BÁSICOS
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # RELACIONES BÁSICAS
    usuario = relationship("Usuario", back_populates="citas")
    servicio = relationship("Servicio", back_populates="citas")
    
    def to_dict(self):
        """Versión simplificada para MVP"""
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'servicio_id': self.servicio_id,
            'fecha': self.fecha.isoformat() if self.fecha else None,
            'hora': self.hora.strftime('%H:%M') if self.hora else None,
            'modalidad': self.modalidad,
            'estado': self.estado,
            'comentarios_cliente': self.comentarios_cliente,
            'comentarios_admin': self.comentarios_admin,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            # Información básica de relaciones
            'usuario_nombre': getattr(self.usuario, 'nombre', None) if hasattr(self, 'usuario') else None,
            'servicio_nombre': getattr(self.servicio, 'nombre', None) if hasattr(self, 'servicio') else None,
        }
