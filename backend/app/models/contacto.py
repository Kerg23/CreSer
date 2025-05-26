from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from app.config.database import Base
from datetime import datetime, timezone

class Contacto(Base):
    __tablename__ = "contactos"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    telefono = Column(String(20), nullable=True)
    asunto = Column(String(255), nullable=False)
    mensaje = Column(Text, nullable=False)
    tipo_consulta = Column(String(50), nullable=False)  # informacion, cita, emergencia, sugerencia
    estado = Column(String(20), default="pendiente")  # pendiente, respondido, archivado
    ip_origen = Column(String(45), nullable=True)  # Para tracking básico
    user_agent = Column(String(500), nullable=True)
    leido = Column(Boolean, default=False)
    respondido_por = Column(Integer, nullable=True)  # ID del admin que respondió
    fecha_respuesta = Column(DateTime, nullable=True)
    notas_internas = Column(Text, nullable=True)  # Notas privadas del admin
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        """Convertir a diccionario"""
        return {
            "id": self.id,
            "nombre": self.nombre,
            "email": self.email,
            "telefono": self.telefono,
            "asunto": self.asunto,
            "mensaje": self.mensaje,
            "tipo_consulta": self.tipo_consulta,
            "estado": self.estado,
            "ip_origen": self.ip_origen,
            "leido": self.leido,
            "respondido_por": self.respondido_por,
            "fecha_respuesta": self.fecha_respuesta.isoformat() if self.fecha_respuesta else None,
            "notas_internas": self.notas_internas,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
