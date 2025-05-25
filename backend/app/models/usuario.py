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
    configuracion = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    citas = relationship("Cita", back_populates="usuario", lazy="select")
    pagos = relationship("Pago", back_populates="usuario", foreign_keys="Pago.usuario_id")
    pagos_aprobados = relationship("Pago", back_populates="aprobador", foreign_keys="Pago.aprobado_por")
    
    def to_dict(self):
        """Convertir modelo a diccionario con manejo seguro de fechas"""
        
        # Función auxiliar para manejar fechas de forma segura
        def safe_isoformat(date_obj):
            if date_obj is None:
                return None
            try:
                # Si es un objeto date o datetime, usar isoformat
                if hasattr(date_obj, 'isoformat'):
                    return date_obj.isoformat()
                # Si ya es string, devolverlo tal como está
                elif isinstance(date_obj, str):
                    return date_obj
                # Fallback: convertir a string
                else:
                    return str(date_obj)
            except Exception as e:
                print(f"Error formateando fecha {date_obj}: {e}")
                return str(date_obj) if date_obj else None
        
        return {
            'id': self.id,
            'nombre': self.nombre,
            'email': self.email,
            'telefono': self.telefono,
            'documento': self.documento,
            'direccion': self.direccion,
            'fecha_nacimiento': safe_isoformat(self.fecha_nacimiento),  # CORREGIDO
            'genero': self.genero,
            'avatar': self.avatar,
            'tipo': self.tipo,
            'estado': self.estado,
            'configuracion': self.configuracion,  # AGREGADO: Campo faltante
            'created_at': safe_isoformat(self.created_at),  # CORREGIDO
            'updated_at': safe_isoformat(self.updated_at)   # CORREGIDO
        }
