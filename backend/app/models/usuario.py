from sqlalchemy import Column, Integer, String, DateTime, Date, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.config.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    telefono = Column(String(20), nullable=False)
    documento = Column(String(50), unique=True, nullable=True)
    password = Column(String(255), nullable=False)
    direccion = Column(Text, nullable=True)
    fecha_nacimiento = Column(Date, nullable=True)
    genero = Column(Enum('masculino', 'femenino', 'otro', 'no-especificar'), nullable=True)
    avatar = Column(String(255), nullable=True)
    tipo = Column(Enum('cliente', 'administrador'), nullable=False, default='cliente')
    estado = Column(Enum('activo', 'inactivo', 'suspendido'), nullable=False, default='activo')
    configuracion = Column(Text, nullable=True, default='{"notificaciones_email": true, "notificaciones_sms": false, "recordatorios_citas": true}')
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # CORREGIDO: Solo relaciones que existen en tu BD
    citas = relationship("Cita", back_populates="usuario", lazy="select")
    
    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'email': self.email,
            'telefono': self.telefono,
            'documento': self.documento,
            'direccion': self.direccion,
            'fecha_nacimiento': self.fecha_nacimiento.isoformat() if self.fecha_nacimiento else None,
            'genero': self.genero,
            'avatar': self.avatar,
            'tipo': self.tipo,
            'estado': self.estado,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
