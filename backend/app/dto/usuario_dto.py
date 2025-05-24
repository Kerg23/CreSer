from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date
from enum import Enum

class TipoUsuarioDTO(str, Enum):
    CLIENTE = "cliente"
    ADMINISTRADOR = "administrador"

class UsuarioCreateDTO(BaseModel):
    """DTO para crear usuario"""
    nombre: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    telefono: str = Field(..., min_length=10, max_length=20)
    documento: str = Field(..., min_length=5, max_length=20)
    password: str = Field(..., min_length=6)
    tipo: Optional[TipoUsuarioDTO] = TipoUsuarioDTO.CLIENTE
    fecha_nacimiento: Optional[date] = None
    genero: Optional[str] = None
    direccion: Optional[str] = None

class UsuarioResponseDTO(BaseModel):
    """DTO para respuesta de usuario"""
    id: int
    nombre: str
    email: str
    telefono: str
    documento: str
    tipo: str
    estado: str
    fecha_nacimiento: Optional[str] = None
    genero: Optional[str] = None
    direccion: Optional[str] = None
    avatar: Optional[str] = None
    configuracion: Optional[dict] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

class UsuarioLoginDTO(BaseModel):
    """DTO para login"""
    email: EmailStr
    password: str
