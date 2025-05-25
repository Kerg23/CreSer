from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
import logging

from app.config.database import get_db
from app.services.cita_service import CitaService
from app.dto.cita_dto import CitaCreateDTO, CitaResponseDTO
from app.utils.exceptions import BusinessException
from app.utils.security import get_current_active_user, require_admin
from app.models.usuario import Usuario
from app.models.servicio import Servicio

logger = logging.getLogger(__name__)

router = APIRouter()

# CRÍTICO: Rutas específicas ANTES que rutas con parámetros
@router.get("/servicios-disponibles")
async def obtener_servicios_disponibles(
    db: Session = Depends(get_db)
):
    """Obtener servicios disponibles para agendar"""
    try:
        servicios = db.query(Servicio).filter(Servicio.estado == "activo").all()
        return [
            {
                "id": servicio.id,
                "codigo": servicio.codigo,
                "nombre": servicio.nombre,
                "descripcion": getattr(servicio, 'descripcion', ''),
                "precio": float(servicio.precio),
                "duracion_minutos": servicio.duracion_minutos,
                "categoria": getattr(servicio, 'categoria', 'general')
            }
            for servicio in servicios
        ]
    except Exception as e:
        logger.error(f"Error obteniendo servicios disponibles: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/horarios-disponibles")
async def obtener_horarios_disponibles(
    fecha: date = Query(..., description="Fecha en formato YYYY-MM-DD"),
    servicio_id: int = Query(..., description="ID del servicio"),
    db: Session = Depends(get_db)
):
    """Obtener horarios disponibles para una fecha y servicio"""
    try:
        cita_service = CitaService(db)
        # Horarios predefinidos por ahora
        horarios_base = ["08:00", "09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"]
        return {
            "fecha": fecha.isoformat(),
            "servicio_id": servicio_id,
            "horarios_disponibles": horarios_base,
            "total_disponibles": len(horarios_base)
        }
    except Exception as e:
        logger.error(f"Error obteniendo horarios disponibles: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/mis-citas")
async def obtener_mis_citas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener citas del usuario actual"""
    try:
        cita_service = CitaService(db)
        return cita_service.obtener_citas_usuario(current_user.id)
    except Exception as e:
        logger.error(f"Error obteniendo mis citas: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/estadisticas")
async def obtener_estadisticas_citas(
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Obtener estadísticas de citas"""
    try:
        # Estadísticas básicas por ahora
        return {
            "total_citas": 0,
            "citas_completadas": 0,
            "citas_pendientes": 0,
            "tasa_asistencia": 0
        }
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/agenda-dia")
async def obtener_agenda_del_dia(
    fecha: date = Query(..., description="Fecha para ver la agenda"),
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Obtener agenda del día para la psicóloga"""
    try:
        # Agenda básica por ahora
        return {
            "fecha": fecha.isoformat(),
            "citas": [],
            "total_citas": 0
        }
    except Exception as e:
        logger.error(f"Error obteniendo agenda del día: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/agendar", response_model=CitaResponseDTO, status_code=status.HTTP_201_CREATED)
async def agendar_cita(
    cita_dto: CitaCreateDTO,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Agendar nueva cita - diferente lógica para admin vs cliente"""
    try:
        logger.info(f"📥 Datos recibidos: {cita_dto.dict()}")
        logger.info(f"👤 Usuario actual: {current_user.email} (tipo: {current_user.tipo})")
        
        cita_service = CitaService(db)
        
        # CORREGIDO: Verificar si es admin o cliente
        if current_user.tipo == "administrador":
            # Los administradores pueden agendar citas sin validar créditos
            logger.info(f"🔧 Admin {current_user.id} agendando cita para usuario {cita_dto.usuario_id}")
            
            # CORREGIDO: Verificar si usuario_id está presente
            if not cita_dto.usuario_id:
                logger.error("❌ usuario_id faltante en request de admin")
                raise HTTPException(status_code=400, detail="usuario_id es requerido para administradores")
            
            # Verificar que el usuario objetivo existe
            usuario_objetivo = db.query(Usuario).filter(Usuario.id == cita_dto.usuario_id).first()
            if not usuario_objetivo:
                logger.error(f"❌ Usuario {cita_dto.usuario_id} no encontrado")
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
            # Verificar que el servicio existe
            servicio = db.query(Servicio).filter(Servicio.id == cita_dto.servicio_id).first()
            if not servicio:
                logger.error(f"❌ Servicio {cita_dto.servicio_id} no encontrado")
                raise HTTPException(status_code=404, detail="Servicio no encontrado")
            
            logger.info(f"✅ Validaciones pasadas. Cliente: {usuario_objetivo.nombre}, Servicio: {servicio.nombre}")
            
            # Crear cita sin validar créditos (modo admin)
            cita = cita_service.agendar_cita_admin(cita_dto, current_user.id)
            
        else:
            # Los clientes deben tener créditos disponibles
            logger.info(f"👤 Cliente {current_user.id} agendando cita")
            # Para clientes, usar el ID del usuario actual
            cita_dto.usuario_id = current_user.id
            cita = cita_service.agendar_cita(cita_dto, current_user.id)
        
        logger.info(f"✅ Cita creada exitosamente: ID {cita.id}")
        return cita
        
    except BusinessException as e:
        logger.error(f"❌ Error de negocio agendando cita: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error inesperado agendando cita: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/", response_model=List[CitaResponseDTO])
async def listar_todas_las_citas(
    fecha: Optional[date] = Query(None, description="Filtrar por fecha específica"),
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    usuario_id: Optional[int] = Query(None, description="Filtrar por usuario"),
    periodo: Optional[str] = Query(None, description="Filtrar por período (hoy, semana, mes)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Listar todas las citas (solo administradores)"""
    try:
        cita_service = CitaService(db)
        return cita_service.listar_citas_admin(usuario_id, fecha, periodo, estado, skip, limit)
    except Exception as e:
        logger.error(f"Error listando citas: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# IMPORTANTE: Rutas con parámetros AL FINAL para evitar conflictos
@router.get("/{cita_id}", response_model=CitaResponseDTO)
async def obtener_cita_por_id(
    cita_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener cita por ID"""
    try:
        cita_service = CitaService(db)
        cita = cita_service.obtener_cita_por_id(cita_id)
        
        if not cita:
            raise HTTPException(status_code=404, detail="Cita no encontrada")
        
        # Verificar permisos: admin puede ver todas, cliente solo las suyas
        if current_user.tipo != "administrador" and cita.usuario_id != current_user.id:
            raise HTTPException(status_code=403, detail="No tienes permisos para ver esta cita")
        
        return cita
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo cita: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo cita")

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
        return cita_service.actualizar_estado_cita(cita_id, "confirmada", current_admin.id)
    except BusinessException as e:
        logger.error(f"Error confirmando cita: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error inesperado confirmando cita: {e}")
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
        return cita_service.completar_cita(cita_id, notas_sesion, current_admin.id)
    except BusinessException as e:
        logger.error(f"Error completando cita: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error inesperado completando cita: {e}")
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
        return cita_service.cancelar_cita(cita_id, motivo, current_user.id)
    except BusinessException as e:
        logger.error(f"Error cancelando cita: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error inesperado cancelando cita: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
