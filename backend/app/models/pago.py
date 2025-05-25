from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Enum, TIMESTAMP
from sqlalchemy.sql.sqltypes import DECIMAL
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.config.database import Base

class Pago(Base):
    __tablename__ = "pagos"
    
    # EXACTAMENTE como tu tabla de BD
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    referencia = Column(String(100), nullable=True)  # CORREGIDO: referencia (no referencia_bancaria)
    monto = Column(DECIMAL(10, 2), nullable=False)
    metodo_pago = Column(Enum('qr', 'efectivo'), nullable=False)
    estado = Column(Enum('pendiente', 'aprobado', 'rechazado'), nullable=False, default='pendiente')
    concepto = Column(String(255), nullable=False)
    tipo_compra = Column(Enum('servicio_individual', 'paquete'), nullable=False)
    paquete_id = Column(Integer, nullable=True)  # Sin FK por ahora
    comprobante = Column(String(255), nullable=True)
    fecha_pago = Column(TIMESTAMP, nullable=True)
    fecha_aprobacion = Column(TIMESTAMP, nullable=True)
    aprobado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    notas_admin = Column(Text, nullable=True)
    nombre_pagador = Column(String(100), nullable=True)
    email_pagador = Column(String(100), nullable=True)
    telefono_pagador = Column(String(20), nullable=True)
    documento_pagador = Column(String(20), nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, default=datetime.now)
    updated_at = Column(TIMESTAMP, nullable=False, default=datetime.now, onupdate=datetime.now)
    
    # CORREGIDO: Relaciones SIN back_populates para evitar errores
    usuario = relationship("Usuario", foreign_keys=[usuario_id], lazy="select")
    aprobador = relationship("Usuario", foreign_keys=[aprobado_por], lazy="select")
    
    def to_dict(self):
        """Convertir modelo a diccionario - CORREGIDO"""
        return {
            'id': self.id,
            'usuario_id': self.usuario_id,
            'referencia': self.referencia,  # CORREGIDO: referencia (no referencia_bancaria)
            'monto': float(self.monto),
            'metodo_pago': self.metodo_pago,
            'estado': self.estado,
            'concepto': self.concepto,
            'tipo_compra': self.tipo_compra,
            'paquete_id': self.paquete_id,
            'comprobante': self.comprobante,
            'fecha_pago': self.fecha_pago.isoformat() if self.fecha_pago else None,
            'fecha_aprobacion': self.fecha_aprobacion.isoformat() if self.fecha_aprobacion else None,
            'aprobado_por': self.aprobado_por,
            'notas_admin': self.notas_admin,
            'nombre_pagador': self.nombre_pagador,
            'email_pagador': self.email_pagador,
            'telefono_pagador': self.telefono_pagador,
            'documento_pagador': self.documento_pagador,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            # Información adicional
            'usuario_nombre': getattr(self.usuario, 'nombre', None) if hasattr(self, 'usuario') and self.usuario else None,
            'aprobador_nombre': getattr(self.aprobador, 'nombre', None) if hasattr(self, 'aprobador') and self.aprobador else None
        }
