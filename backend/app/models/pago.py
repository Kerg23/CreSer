from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql.sqltypes import DECIMAL
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.config.database import Base

class Pago(Base):
    __tablename__ = "pagos"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)  # Nullable para pagos sin usuario
    nombre_pagador = Column(String(100), nullable=False)
    email_pagador = Column(String(100), nullable=False)
    telefono_pagador = Column(String(20), nullable=True)
    documento_pagador = Column(String(50), nullable=True)
    monto = Column(DECIMAL(10, 2), nullable=False)
    concepto = Column(String(200), nullable=False)
    tipo_compra = Column(String(50), nullable=False)  # creditos, sesion_individual
    estado = Column(String(20), nullable=False, default="pendiente")  # pendiente, aprobado, rechazado
    comprobante = Column(String(500), nullable=True)  # Ruta del archivo de comprobante
    referencia_bancaria = Column(String(100), nullable=True)
    notas_admin = Column(Text, nullable=True)
    fecha_aprobacion = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # CORREGIDO: Relación con lazy loading
    usuario = relationship("Usuario", back_populates="pagos", lazy="select")
    
    def to_dict(self):
        """Convertir modelo a diccionario"""
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'nombre_pagador': self.nombre_pagador,
            'email_pagador': self.email_pagador,
            'telefono_pagador': self.telefono_pagador,
            'documento_pagador': self.documento_pagador,
            'monto': float(self.monto),
            'concepto': self.concepto,
            'tipo_compra': self.tipo_compra,
            'estado': self.estado,
            'comprobante': self.comprobante,
            'referencia_bancaria': self.referencia_bancaria,
            'notas_admin': self.notas_admin,
            'fecha_aprobacion': self.fecha_aprobacion.isoformat() if self.fecha_aprobacion else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
