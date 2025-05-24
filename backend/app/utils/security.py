from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from app.config.database import get_db
from app.services.auth_service import AuthService
from app.models.usuario import Usuario
from app.utils.exceptions import AuthenticationException

# Configurar el esquema de seguridad
security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Usuario:
    """Dependency para obtener el usuario actual autenticado"""
    try:
        auth_service = AuthService(db)
        token_data = auth_service.verify_token(credentials.credentials)
        current_user = auth_service.get_current_user(token_data)
        return current_user
    
    except AuthenticationException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_active_user(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    """Dependency para obtener usuario activo"""
    # CORREGIR: Quitar .value porque estado es string, no enum
    if current_user.estado != "activo":  # ← CAMBIO AQUÍ
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo"
        )
    return current_user

def require_admin(
    current_user: Usuario = Depends(get_current_active_user)
) -> Usuario:
    """Dependency que requiere permisos de administrador"""
    # CORREGIR: Quitar .value porque tipo es string, no enum
    if current_user.tipo != "administrador":  # ← CAMBIO AQUÍ
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de administrador"
        )
    return current_user

def require_client_or_admin(
    current_user: Usuario = Depends(get_current_active_user)
) -> Usuario:
    """Dependency que permite cliente o admin"""
    return current_user

# Dependency opcional para rutas que pueden funcionar con o sin autenticación
def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[Usuario]:
    """Dependency opcional para obtener usuario si está autenticado"""
    if credentials is None:
        return None
    
    try:
        auth_service = AuthService(db)
        token_data = auth_service.verify_token(credentials.credentials)
        return auth_service.get_current_user(token_data)
    except:
        return None
