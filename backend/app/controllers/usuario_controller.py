from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from app.config.database import get_db
from app.services.usuario_service import UsuarioService
from app.dto.usuario_dto import UsuarioResponseDTO
from app.utils.exceptions import BusinessException

router = APIRouter()

@router.get("/test")
async def test_usuarios():
    """Ruta de prueba para usuarios"""
    return {"message": "Controlador de usuarios funcionando correctamente"}

@router.get("/", response_model=List[UsuarioResponseDTO])
async def listar_usuarios(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Listar usuarios (sin autenticación por ahora)"""
    try:
        usuario_service = UsuarioService(db)
        return usuario_service.listar_usuarios(skip, limit)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{usuario_id}", response_model=UsuarioResponseDTO)
async def obtener_usuario(
    usuario_id: int,
    db: Session = Depends(get_db)
):
    """Obtener usuario por ID (sin autenticación por ahora)"""
    try:
        usuario_service = UsuarioService(db)
        usuario = usuario_service.obtener_usuario_por_id(usuario_id)
        if not usuario:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
        return usuario
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
