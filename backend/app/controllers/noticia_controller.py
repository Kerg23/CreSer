from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional

from app.config.database import get_db
from app.services.noticia_service import NoticiaService
from app.dto.noticia_dto import NoticiaCreateDTO, NoticiaUpdateDTO, NoticiaResponseDTO, NoticiaPublicaDTO
from app.utils.exceptions import BusinessException
from app.utils.security import get_current_active_user, require_admin
from app.models.usuario import Usuario

router = APIRouter()

# Rutas públicas (sin autenticación)
@router.get("/publicas", response_model=List[NoticiaPublicaDTO])
async def obtener_noticias_publicas(
    categoria: Optional[str] = Query(None, description="Filtrar por categoría"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Obtener noticias públicas"""
    try:
        noticia_service = NoticiaService(db)
        return noticia_service.obtener_noticias_publicas(categoria, skip, limit)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/destacadas", response_model=List[NoticiaPublicaDTO])
async def obtener_noticias_destacadas(
    limit: int = Query(5, ge=1, le=10),
    db: Session = Depends(get_db)
):
    """Obtener noticias destacadas"""
    try:
        noticia_service = NoticiaService(db)
        return noticia_service.obtener_noticias_destacadas(limit)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/buscar", response_model=List[NoticiaPublicaDTO])
async def buscar_noticias(
    q: str = Query(..., min_length=3, description="Término de búsqueda"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """Buscar noticias"""
    try:
        noticia_service = NoticiaService(db)
        return noticia_service.buscar_noticias(q, skip, limit)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{slug}", response_model=NoticiaResponseDTO)
async def obtener_noticia_por_slug(
    slug: str,
    db: Session = Depends(get_db)
):
    """Obtener noticia por slug (incrementa vistas)"""
    try:
        noticia_service = NoticiaService(db)
        return noticia_service.obtener_noticia_por_slug(slug, incrementar_vista=True)
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# Rutas administrativas (requieren autenticación)
@router.post("/", response_model=NoticiaResponseDTO, status_code=status.HTTP_201_CREATED)
async def crear_noticia(
    noticia_dto: NoticiaCreateDTO,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Crear nueva noticia (solo administradores)"""
    try:
        noticia_service = NoticiaService(db)
        return noticia_service.crear_noticia(noticia_dto, current_admin.id)
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/admin/listar", response_model=List[NoticiaResponseDTO])
async def listar_noticias_admin(
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Listar noticias para administrador"""
    try:
        noticia_service = NoticiaService(db)
        return noticia_service.listar_noticias_admin(estado, skip, limit)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{noticia_id}/publicar", response_model=NoticiaResponseDTO)
async def publicar_noticia(
    noticia_id: int,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Publicar noticia (solo administradores)"""
    try:
        noticia_service = NoticiaService(db)
        return noticia_service.publicar_noticia(noticia_id)
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{noticia_id}", response_model=NoticiaResponseDTO)
async def actualizar_noticia(
    noticia_id: int,
    noticia_dto: NoticiaUpdateDTO,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Actualizar noticia (solo administradores)"""
    try:
        noticia_service = NoticiaService(db)
        return noticia_service.actualizar_noticia(noticia_id, noticia_dto)
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{noticia_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_noticia(
    noticia_id: int,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Eliminar noticia (solo administradores)"""
    try:
        noticia_service = NoticiaService(db)
        eliminada = noticia_service.eliminar_noticia(noticia_id)
        if not eliminada:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Noticia no encontrada")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/admin/estadisticas")
async def obtener_estadisticas_noticias(
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Obtener estadísticas de noticias (solo administradores)"""
    try:
        noticia_service = NoticiaService(db)
        return noticia_service.obtener_estadisticas()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/categorias/disponibles")
async def obtener_categorias_disponibles():
    """Obtener categorías disponibles"""
    return {
        "categorias": [
            {
                "valor": "salud_mental",
                "nombre": "Salud Mental",
                "descripcion": "Artículos sobre bienestar psicológico y salud mental"
            },
            {
                "valor": "tips",
                "nombre": "Tips y Consejos",
                "descripcion": "Consejos prácticos para el día a día"
            },
            {
                "valor": "eventos",
                "nombre": "Eventos",
                "descripcion": "Talleres, conferencias y eventos de CreSer"
            },
            {
                "valor": "testimonios",
                "nombre": "Testimonios",
                "descripcion": "Experiencias y testimonios de pacientes"
            }
        ]
    }
