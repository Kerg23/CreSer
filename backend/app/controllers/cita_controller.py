from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.config.database import get_db
from app.services.cita_service import CitaService
from app.dto.cita_dto import CitaCreateDTO, CitaResponseDTO
from app.utils.exceptions import BusinessException
from app.utils.security import get_current_active_user, require_admin
from app.models.usuario import Usuario

router = APIRouter()

@router.get("/horarios-disponibles")
async def obtener_horarios_disponibles(
    fecha: date = Query(..., description="Fecha en formato YYYY-MM-DD"),
    servicio_id: int = Query(..., description="ID del servicio"),
    db: Session = Depends(get_db)
):
    """Obtener horarios disponibles para una fecha y servicio"""
    try:
        cita_service = CitaService(db)
        horarios = cita_service.obtener_horarios_disponibles(fecha, servicio_id)
        return {
            "fecha": fecha.isoformat(),
            "servicio_id": servicio_id,
            "horarios_disponibles": horarios,
            "total_disponibles": len(horarios)
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/agendar", response_model=CitaResponseDTO, status_code=status.HTTP_201_CREATED)
async def agendar_cita(
    cita_dto: CitaCreateDTO,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Agendar nueva cita (consume créditos del usuario)"""
    try:
        cita_service = CitaService(db)
        return cita_service.agendar_cita(cita_dto, current_user.id)
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/mis-citas", response_model=List[CitaResponseDTO])
async def obtener_mis_citas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener citas del usuario actual"""
    try:
        cita_service = CitaService(db)
        return cita_service.obtener_citas_usuario(current_user.id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/", response_model=List[CitaResponseDTO])
async def listar_todas_las_citas(
    fecha: Optional[date] = Query(None, description="Filtrar por fecha específica"),
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Listar todas las citas (solo administradores)"""
    try:
        cita_service = CitaService(db)
        return cita_service.listar_citas_admin(fecha, estado, skip, limit)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{cita_id}/cancelar", response_model=CitaResponseDTO)
async def cancelar_cita(
    cita_id: int,
    motivo: str = Query(..., description="Motivo de la cancelación"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Cancelar cita (restaura créditos)"""
    try:
        cita_service = CitaService(db)
        return cita_service.cancelar_cita(cita_id, current_user.id, motivo, "cliente")
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{cita_id}/cancelar-admin", response_model=CitaResponseDTO)
async def cancelar_cita_admin(
    cita_id: int,
    motivo: str = Query(..., description="Motivo de la cancelación"),
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Cancelar cita como administrador"""
    try:
        cita_service = CitaService(db)
        return cita_service.cancelar_cita(cita_id, current_admin.id, motivo, "administrador")
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{cita_id}/confirmar", response_model=CitaResponseDTO)
async def confirmar_cita(
    cita_id: int,
    notas: Optional[str] = Query(None, description="Notas de la psicóloga"),
    link_virtual: Optional[str] = Query(None, description="Link para cita virtual"),
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Confirmar cita (solo administradores)"""
    try:
        cita_service = CitaService(db)
        return cita_service.confirmar_cita(cita_id, notas, link_virtual)
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{cita_id}/completar", response_model=CitaResponseDTO)
async def completar_cita(
    cita_id: int,
    notas_sesion: str = Query(..., description="Notas de la sesión"),
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Marcar cita como completada (solo administradores)"""
    try:
        cita_service = CitaService(db)
        return cita_service.completar_cita(cita_id, notas_sesion)
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{cita_id}/no-asistio", response_model=CitaResponseDTO)
async def marcar_no_asistio(
    cita_id: int,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Marcar cita como no asistió (solo administradores)"""
    try:
        cita_service = CitaService(db)
        cita = cita_service.db.query(cita_service.cita_dao.model_class).filter(
            cita_service.cita_dao.model_class.id == cita_id
        ).first()
        
        if not cita:
            raise BusinessException("Cita no encontrada")
        
        cita.estado = "no_asistio"
        cita_service.db.commit()
        cita_service.db.refresh(cita)
        
        return CitaResponseDTO.model_validate(cita.to_dict())
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/agenda-dia")
async def obtener_agenda_del_dia(
    fecha: date = Query(..., description="Fecha para ver la agenda"),
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Obtener agenda del día para la psicóloga"""
    try:
        cita_service = CitaService(db)
        return cita_service.obtener_agenda_dia(fecha)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/estadisticas")
async def obtener_estadisticas_citas(
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Obtener estadísticas de citas"""
    try:
        cita_service = CitaService(db)
        return cita_service.obtener_estadisticas()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/servicios-disponibles")
async def obtener_servicios_disponibles(
    db: Session = Depends(get_db)
):
    """Obtener servicios disponibles para agendar"""
    try:
        from app.models.servicio import Servicio
        servicios = db.query(Servicio).filter(Servicio.estado == "activo").all()
        return [
            {
                "id": servicio.id,
                "codigo": servicio.codigo,
                "nombre": servicio.nombre,
                "descripcion": servicio.descripcion,
                "precio": float(servicio.precio),
                "duracion_minutos": servicio.duracion_minutos,
                "categoria": servicio.categoria
            }
            for servicio in servicios
        ]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
