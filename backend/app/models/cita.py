from sqlalchemy import Column, Integer, String, Date, Time, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.config.database import Base
from datetime import datetime, timezone

class Cita(Base):
    __tablename__ = "citas"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    servicio_id = Column(Integer, ForeignKey("servicios.id"), nullable=False)
    credito_id = Column(Integer, ForeignKey("creditos.id"), nullable=False)
    fecha = Column(Date, nullable=False)
    hora = Column(Time, nullable=False)
    modalidad = Column(String(20), nullable=False)  # presencial, virtual
    estado = Column(String(30), default="agendada")  # agendada, confirmada, completada, cancelada, no_asistio
    comentarios_cliente = Column(Text, nullable=True)
    notas_psicologa = Column(Text, nullable=True)
    link_virtual = Column(String(500), nullable=True)
    motivo_cancelacion = Column(Text, nullable=True)
    cancelada_por = Column(String(20), nullable=True)  # cliente, administrador
    recordatorio_enviado = Column(Integer, default=0)
    fecha_recordatorio = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        """Convertir a diccionario"""
        return {
            "id": self.id,
            "usuario_id": self.usuario_id,
            "servicio_id": self.servicio_id,
            "credito_id": self.credito_id,
            "fecha": self.fecha.isoformat() if self.fecha else None,
            "hora": self.hora.strftime("%H:%M") if self.hora else None,
            "modalidad": self.modalidad,
            "estado": self.estado,
            "comentarios_cliente": self.comentarios_cliente,
            "notas_psicologa": self.notas_psicologa,
            "link_virtual": self.link_virtual,
            "motivo_cancelacion": self.motivo_cancelacion,
            "cancelada_por": self.cancelada_por,
            "recordatorio_enviado": self.recordatorio_enviado,
            "fecha_recordatorio": self.fecha_recordatorio.isoformat() if self.fecha_recordatorio else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
