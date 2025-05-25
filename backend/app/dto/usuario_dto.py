from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UsuarioCreateDTO(BaseModel):
    """DTO para crear usuario"""
    nombre: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    telefono: Optional[str] = Field(None, min_length=7, max_length=20)
    documento: str = Field(..., min_length=5, max_length=20)
    password: str = Field(..., min_length=6)
    tipo: Optional[str] = Field("cliente", pattern="^(cliente|administrador)$")

class UsuarioUpdateDTO(BaseModel):
    """DTO para actualizar usuario"""
    nombre: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    telefono: Optional[str] = Field(None, min_length=7, max_length=20)
    documento: Optional[str] = Field(None, min_length=5, max_length=20)
    tipo: Optional[str] = Field(None, pattern="^(cliente|administrador)$")
    estado: Optional[str] = Field(None, pattern="^(activo|inactivo|suspendido)$")

class UsuarioResponseDTO(BaseModel):
    """DTO para respuesta de usuario"""
    id: int
    nombre: str
    email: str
    telefono: Optional[str]
    documento: str
    tipo: str
    estado: str
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True

class LoginDTO(BaseModel):
    """DTO para login"""
    email: EmailStr
    password: str

class LoginResponseDTO(BaseModel):
    """DTO para respuesta de login"""
    access_token: str
    token_type: str = "bearer"
    user: UsuarioResponseDTO

class ChangePasswordDTO(BaseModel):
    """DTO para cambio de contraseña"""
    current_password: str
    new_password: str = Field(..., min_length=6)
