from sqlalchemy import Column, Integer, String, DateTime, Text, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from app.config.database import Base
from datetime import datetime, timezone

class Pago(Base):
    __tablename__ = "pagos"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    referencia = Column(String(100), unique=True)
    monto = Column(DECIMAL(10, 2), nullable=False)
    metodo_pago = Column(String(20), default="qr")
    estado = Column(String(20), default="pendiente")  # pendiente, aprobado, rechazado
    concepto = Column(String(255), nullable=False)
    tipo_compra = Column(String(50), nullable=False)  # servicio_individual, paquete
    paquete_id = Column(Integer, nullable=True)
    comprobante = Column(String(255))  # Ruta del archivo de comprobante
    fecha_pago = Column(DateTime)
    fecha_aprobacion = Column(DateTime)
    aprobado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    notas_admin = Column(Text)
    
    # Datos del usuario (para casos donde no existe cuenta)
    nombre_pagador = Column(String(100))
    email_pagador = Column(String(100))
    telefono_pagador = Column(String(20))
    documento_pagador = Column(String(20))
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "usuario_id": self.usuario_id,
            "referencia": self.referencia,
            "monto": float(self.monto),
            "metodo_pago": self.metodo_pago,
            "estado": self.estado,
            "concepto": self.concepto,
            "tipo_compra": self.tipo_compra,
            "comprobante": self.comprobante,
            "fecha_pago": self.fecha_pago.isoformat() if self.fecha_pago else None,
            "fecha_aprobacion": self.fecha_aprobacion.isoformat() if self.fecha_aprobacion else None,
            "notas_admin": self.notas_admin,
            "nombre_pagador": self.nombre_pagador,
            "email_pagador": self.email_pagador,
            "telefono_pagador": self.telefono_pagador,
            "documento_pagador": self.documento_pagador,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
