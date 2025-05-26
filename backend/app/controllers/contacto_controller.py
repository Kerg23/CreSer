from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from app.config.database import get_db
from app.services.contacto_service import ContactoService
from app.dto.contacto_dto import ContactoCreateDTO, ContactoUpdateDTO, ContactoResponseDTO, ContactoPublicoDTO
from app.utils.exceptions import BusinessException
from app.utils.security import get_current_active_user, require_admin
from app.models.usuario import Usuario

router = APIRouter()

# Rutas públicas (sin autenticación)
@router.post("/", response_model=ContactoPublicoDTO, status_code=status.HTTP_201_CREATED)
async def crear_contacto(
    contacto_dto: ContactoCreateDTO,
    request: Request,
    db: Session = Depends(get_db)
):
    """Crear nuevo mensaje de contacto (público)"""
    try:
        contacto_service = ContactoService(db)
        return contacto_service.crear_contacto(contacto_dto, request)
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/tipos-consulta")
async def obtener_tipos_consulta():
    """Obtener tipos de consulta disponibles"""
    return {
        "tipos_consulta": [
            {
                "valor": "informacion",
                "nombre": "Información General",
                "descripcion": "Consultas sobre servicios, horarios, precios, etc."
            },
            {
                "valor": "cita",
                "nombre": "Solicitud de Cita",
                "descripcion": "Solicitar una cita o consultar disponibilidad"
            },
            {
                "valor": "emergencia",
                "nombre": "Situación de Emergencia",
                "descripcion": "Situaciones que requieren atención inmediata"
            },
            {
                "valor": "sugerencia",
                "nombre": "Sugerencias y Comentarios",
                "descripcion": "Feedback, sugerencias de mejora, testimonios"
            }
        ]
    }

@router.get("/info-contacto")
async def obtener_info_contacto():
    """Obtener información de contacto de CreSer"""
    return {
        "centro": "CreSer - Centro Terapéutico",
        "psicologa": "Diana Milena Rodríguez",
        "telefono": "+57 310 227 7005",
        "email": "terapeuticocreser@gmail.com",
        "ubicacion": "Ibagué, Tolima, Colombia",
        "horarios_atencion": {
            "lunes_viernes": "8:00 AM - 6:00 PM",
            "sabados": "8:00 AM - 12:00 PM",
            "domingos": "Cerrado"
        },
        "modalidades": ["Presencial", "Virtual"],
        "servicios_principales": [
            "Valoración Psicológica Individual",
            "Psicoterapia Individual",
            "Psicoterapia de Pareja",
            "Talleres Grupales"
        ],
        "redes_sociales": {
            "whatsapp": "+57 310 227 7005",
            "email": "terapeuticocreser@gmail.com"
        },
        "tiempo_respuesta": "Respondemos en un máximo de 24 horas"
    }

# Rutas administrativas (requieren autenticación)
@router.get("/admin/listar", response_model=List[ContactoResponseDTO])
async def listar_contactos_admin(
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    tipo: Optional[str] = Query(None, description="Filtrar por tipo de consulta"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Listar contactos (solo administradores)"""
    try:
        contacto_service = ContactoService(db)
        return contacto_service.listar_contactos_admin(estado, tipo, skip, limit)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/admin/pendientes", response_model=List[ContactoResponseDTO])
async def obtener_contactos_pendientes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Obtener contactos pendientes (solo administradores)"""
    try:
        contacto_service = ContactoService(db)
        return contacto_service.obtener_contactos_pendientes(skip, limit)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/admin/no-leidos", response_model=List[ContactoResponseDTO])
async def obtener_contactos_no_leidos(
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Obtener contactos no leídos (solo administradores)"""
    try:
        contacto_service = ContactoService(db)
        return contacto_service.obtener_contactos_no_leidos()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/admin/buscar", response_model=List[ContactoResponseDTO])
async def buscar_contactos(
    q: str = Query(..., min_length=3, description="Término de búsqueda"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Buscar contactos (solo administradores)"""
    try:
        contacto_service = ContactoService(db)
        return contacto_service.buscar_contactos(q, skip, limit)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/admin/{contacto_id}", response_model=ContactoResponseDTO)
async def obtener_contacto_por_id(
    contacto_id: int,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Obtener contacto por ID (marca como leído)"""
    try:
        contacto_service = ContactoService(db)
        return contacto_service.obtener_contacto_por_id(contacto_id, marcar_leido=True)
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/admin/{contacto_id}", response_model=ContactoResponseDTO)
async def actualizar_contacto(
    contacto_id: int,
    contacto_dto: ContactoUpdateDTO,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Actualizar contacto (solo administradores)"""
    try:
        contacto_service = ContactoService(db)
        return contacto_service.actualizar_contacto(contacto_id, contacto_dto, current_admin.id)
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/admin/{contacto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_contacto(
    contacto_id: int,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Eliminar contacto (solo administradores)"""
    try:
        contacto_service = ContactoService(db)
        eliminado = contacto_service.eliminar_contacto(contacto_id)
        if not eliminado:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contacto no encontrado")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/admin/estadisticas")
async def obtener_estadisticas_contactos(
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Obtener estadísticas de contactos (solo administradores)"""
    try:
        contacto_service = ContactoService(db)
        return contacto_service.obtener_estadisticas()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/admin/{contacto_id}/marcar-respondido", response_model=ContactoResponseDTO)
async def marcar_como_respondido(
    contacto_id: int,
    notas: str = Query(..., description="Notas sobre la respuesta"),
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Marcar contacto como respondido (solo administradores)"""
    try:
        contacto_service = ContactoService(db)
        contacto_dto = ContactoUpdateDTO(
            estado="respondido",
            notas_internas=notas,
            leido=True
        )
        return contacto_service.actualizar_contacto(contacto_id, contacto_dto, current_admin.id)
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
