from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import logging

from app.config.database import get_db
from app.utils.security import (
    authenticate_user, 
    create_access_token, 
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.dto.usuario_dto import LoginDTO, LoginResponseDTO, UsuarioResponseDTO
from app.models.usuario import Usuario

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/login", response_model=LoginResponseDTO)
async def login(
    login_data: LoginDTO,
    db: Session = Depends(get_db)
):
    """Iniciar sesión"""
    try:
        logger.info(f"Intento de login para: {login_data.email}")
        
        # Autenticar usuario
        user = authenticate_user(db, login_data.email, login_data.password)
        if not user:
            logger.error(f"Credenciales inválidas para: {login_data.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email o contraseña incorrectos",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # CORREGIDO: Crear token con tiempo de expiración consistente
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, 
            expires_delta=access_token_expires
        )
        
        logger.info(f"Login exitoso para: {user.email}, token generado")
        
        # Crear respuesta
        user_response = UsuarioResponseDTO.model_validate(user.to_dict())
        
        return LoginResponseDTO(
            access_token=access_token,
            token_type="bearer",
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/logout")
async def logout(current_user: Usuario = Depends(get_current_active_user)):
    """Cerrar sesión"""
    try:
        logger.info(f"Logout para usuario: {current_user.email}")
        # En una implementación real, aquí podrías invalidar el token
        # agregándolo a una blacklist en Redis o base de datos
        return {"message": "Sesión cerrada exitosamente"}
    except Exception as e:
        logger.error(f"Error en logout: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error cerrando sesión"
        )

@router.get("/me", response_model=UsuarioResponseDTO)
async def get_current_user_info(current_user: Usuario = Depends(get_current_active_user)):
    """Obtener información del usuario actual"""
    return UsuarioResponseDTO.model_validate(current_user.to_dict())

@router.get("/verify")
async def verify_token(current_user: Usuario = Depends(get_current_active_user)):
    """Verificar si el token es válido"""
    return {
        "valid": True,
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "nombre": current_user.nombre,
            "tipo": current_user.tipo
        }
    }
