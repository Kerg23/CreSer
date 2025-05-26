from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class ContactoCreateDTO(BaseModel):
    """DTO para crear mensaje de contacto"""
    nombre: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    telefono: Optional[str] = Field(None, min_length=7, max_length=20)
    asunto: str = Field(..., min_length=5, max_length=255)
    mensaje: str = Field(..., min_length=10, max_length=2000)
    tipo_consulta: str = Field(..., pattern="^(informacion|cita|emergencia|sugerencia)$")

class ContactoResponseDTO(BaseModel):
    """DTO para respuesta de contacto"""
    id: int
    nombre: str
    email: str
    telefono: Optional[str]
    asunto: str
    mensaje: str
    tipo_consulta: str
    estado: str
    leido: bool
    respondido_por: Optional[int]
    fecha_respuesta: Optional[str]
    notas_internas: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True

class ContactoUpdateDTO(BaseModel):
    """DTO para actualizar contacto (admin)"""
    estado: Optional[str] = Field(None, pattern="^(pendiente|respondido|archivado)$")
    notas_internas: Optional[str] = Field(None, max_length=1000)
    leido: Optional[bool] = None

class ContactoPublicoDTO(BaseModel):
    """DTO para respuesta pública (sin datos sensibles)"""
    id: int
    nombre: str
    asunto: str
    tipo_consulta: str
    estado: str
    created_at: Optional[str]

    class Config:
        from_attributes = True
