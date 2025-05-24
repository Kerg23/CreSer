from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Boolean, Date, Enum
from app.config.database import Base
from passlib.context import CryptContext
import enum
from datetime import datetime, timezone

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class TipoUsuario(str, enum.Enum):
    CLIENTE = "cliente"
    ADMINISTRADOR = "administrador"

class EstadoUsuario(str, enum.Enum):
    ACTIVO = "activo"
    INACTIVO = "inactivo"
    SUSPENDIDO = "suspendido"

class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    telefono = Column(String(20), nullable=False)
    documento = Column(String(20), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    
    # USAR STRING EN LUGAR DE ENUM PARA EVITAR PROBLEMAS
    tipo = Column(String(20), default="cliente")  # ← Cambiar de Enum a String
    estado = Column(String(20), default="activo")  # ← Cambiar de Enum a String
    
    fecha_nacimiento = Column(Date, nullable=True)
    genero = Column(String(20), nullable=True)
    direccion = Column(Text, nullable=True)
    avatar = Column(String(255), nullable=True)
    configuracion = Column(JSON, default={
        "notificaciones_email": True,
        "notificaciones_sms": False,
        "recordatorios_citas": True
    })
    # CORREGIR DATETIME DEPRECATED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def verify_password(self, password: str) -> bool:
        """Verificar contraseña"""
        return pwd_context.verify(password, self.password)

    @staticmethod
    def hash_password(password: str) -> str:
        """Encriptar contraseña"""
        return pwd_context.hash(password)

    def to_dict(self) -> dict:
        """Convertir a diccionario"""
        return {
            "id": self.id,
            "nombre": self.nombre,
            "email": self.email,
            "telefono": self.telefono,
            "documento": self.documento,
            "tipo": self.tipo,  # ← Ya no necesita .value
            "estado": self.estado,  # ← Ya no necesita .value
            "fecha_nacimiento": self.fecha_nacimiento.isoformat() if self.fecha_nacimiento else None,
            "genero": self.genero,
            "direccion": self.direccion,
            "avatar": self.avatar,
            "configuracion": self.configuracion,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
