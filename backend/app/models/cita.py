from sqlalchemy import Column, Integer, String, Date, Time, DateTime, Text, Enum, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.config.database import Base

class Cita(Base):
    __tablename__ = "citas"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    servicio_id = Column(Integer, ForeignKey("servicios.id"), nullable=False)
    credito_id = Column(Integer, ForeignKey("creditos.id"), nullable=True)
    fecha = Column(Date, nullable=False)
    hora = Column(Time, nullable=False)
    modalidad = Column(Enum('presencial', 'virtual'), nullable=False)
    estado = Column(Enum('agendada', 'confirmada', 'completada', 'cancelada', 'no_asistio'), nullable=False, default='agendada')
    
    # Comentarios y notas
    comentarios_cliente = Column(Text, nullable=True)
    comentarios_admin = Column(Text, nullable=True)
    # REMOVIDO: notas_psicologa - no existe en tu BD
    
    # Campos específicos que SÍ existen
    link_virtual = Column(String(500), nullable=True)
    motivo_cancelacion = Column(Text, nullable=True)
    cancelada_por = Column(Enum('cliente', 'administrador'), nullable=True)
    fecha_completada = Column(DateTime, nullable=True)
    
    # Sistema de recordatorios
    recordatorio_enviado = Column(Boolean, nullable=False, default=False)
    fecha_recordatorio = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="citas")
    servicio = relationship("Servicio", back_populates="citas")
    
    def to_dict(self):
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'servicio_id': self.servicio_id,
            'credito_id': self.credito_id,
            'fecha': self.fecha.isoformat() if self.fecha else None,
            'hora': self.hora.strftime('%H:%M') if self.hora else None,
            'modalidad': self.modalidad,
            'estado': self.estado,
            'comentarios_cliente': self.comentarios_cliente,
            'comentarios_admin': self.comentarios_admin,
            'link_virtual': self.link_virtual,
            'motivo_cancelacion': self.motivo_cancelacion,
            'cancelada_por': self.cancelada_por,
            'fecha_completada': self.fecha_completada.isoformat() if self.fecha_completada else None,
            'recordatorio_enviado': self.recordatorio_enviado,
            'fecha_recordatorio': self.fecha_recordatorio.isoformat() if self.fecha_recordatorio else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            # Información de relaciones
            'usuario_nombre': getattr(self.usuario, 'nombre', None) if hasattr(self, 'usuario') and self.usuario else None,
            'servicio_nombre': getattr(self.servicio, 'nombre', None) if hasattr(self, 'servicio') and self.servicio else None
        }
