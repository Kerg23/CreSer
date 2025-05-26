from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class PagoCreateDTO(BaseModel):
    """DTO para procesar nuevo pago con comprobante"""
    nombre: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    telefono: str = Field(..., min_length=10, max_length=20)
    documento: str = Field(..., min_length=5, max_length=20)
    monto: float = Field(..., gt=0)
    concepto: str = Field(..., min_length=5, max_length=255)
    tipo_compra: str = Field(..., pattern="^(servicio_individual|paquete)$")  # ← CORREGIR: regex → pattern
    paquete_seleccionado: Optional[str] = None
    referencia_bancaria: Optional[str] = None

class PagoResponseDTO(BaseModel):
    """DTO para respuesta de pago"""
    id: int
    usuario_id: Optional[int]
    referencia: Optional[str]
    monto: float
    estado: str
    concepto: str
    tipo_compra: str
    comprobante: Optional[str]
    fecha_pago: Optional[str]
    nombre_pagador: str
    email_pagador: str
    telefono_pagador: str
    documento_pagador: str
    created_at: Optional[str]

    class Config:
        from_attributes = True

class PagoAprobacionDTO(BaseModel):
    """DTO para aprobar/rechazar pago"""
    estado: str = Field(..., pattern="^(aprobado|rechazado)$")  # ← CORREGIR: regex → pattern
    notas_admin: Optional[str] = None
    servicios_asignados: Optional[list] = None  # Lista de servicios a asignar como créditos

class CreditoResponseDTO(BaseModel):
    """DTO para mostrar créditos del usuario"""
    id: int
    servicio_nombre: str
    cantidad_inicial: int
    cantidad_disponible: int
    precio_unitario: float
    fecha_vencimiento: Optional[str]
    estado: str
    created_at: Optional[str]

    class Config:
        from_attributes = True
