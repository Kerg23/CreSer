from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.services.auth_service import AuthService
from app.dto.auth_dto import LoginDTO, TokenResponseDTO, RegisterDTO
from app.dto.usuario_dto import UsuarioResponseDTO
from app.utils.exceptions import AuthenticationException, BusinessException
from app.utils.security import get_current_active_user, require_admin
from app.models.usuario import Usuario

router = APIRouter()

@router.post("/login", response_model=TokenResponseDTO)
async def login(
    login_dto: LoginDTO,
    db: Session = Depends(get_db)
):
    """Iniciar sesión"""
    try:
        auth_service = AuthService(db)
        return auth_service.login(login_dto)
    
    except AuthenticationException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.post("/register", response_model=UsuarioResponseDTO, status_code=status.HTTP_201_CREATED)
async def register(
    register_dto: RegisterDTO,
    db: Session = Depends(get_db)
):
    """Registrar nuevo usuario (solo clientes)"""
    try:
        auth_service = AuthService(db)
        return auth_service.register(register_dto)
    
    except BusinessException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/me", response_model=UsuarioResponseDTO)
async def get_current_user_info(
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener información del usuario actual"""
    return UsuarioResponseDTO.model_validate(current_user.to_dict())

@router.post("/verify")
async def verify_token(
    current_user: Usuario = Depends(get_current_active_user)
):
    """Verificar si el token es válido"""
    return {
        "valid": True,
        "user": {
            "id": current_user.id,
            "nombre": current_user.nombre,
            "email": current_user.email,
            "tipo": current_user.tipo 
        }
    }


@router.post("/logout")
async def logout():
    """Cerrar sesión (en JWT no necesitamos hacer nada en el servidor)"""
    return {"message": "Logout exitoso"}

# Rutas protegidas de ejemplo
@router.get("/admin-only")
async def admin_only_route(
    current_admin: Usuario = Depends(require_admin)
):
    """Ruta solo para administradores"""
    return {
        "message": "Esta es una ruta solo para administradores",
        "admin": current_admin.nombre
    }

@router.get("/protected")
async def protected_route(
    current_user: Usuario = Depends(get_current_active_user)
):
    """Ruta protegida para cualquier usuario autenticado"""
    return {
        "message": f"Hola {current_user.nombre}, estás autenticado",
        "user_type": current_user.tipo.value
    }
