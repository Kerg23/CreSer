from pydantic import BaseModel, EmailStr
from typing import Optional

class LoginDTO(BaseModel):
    """DTO para login de usuario"""
    email: EmailStr
    password: str

class TokenResponseDTO(BaseModel):
    """DTO para respuesta de token"""
    access_token: str
    token_type: str = "bearer"
    user: dict

class TokenDataDTO(BaseModel):
    """DTO para datos del token"""
    email: Optional[str] = None
    user_id: Optional[int] = None
    tipo: Optional[str] = None

class RegisterDTO(BaseModel):
    """DTO para registro de nuevo usuario"""
    nombre: str
    email: EmailStr
    telefono: str
    documento: str
    password: str
