from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime, timezone, timedelta
import logging

from app.config.database import get_db
from app.utils.security import get_current_active_user, require_admin
from app.models.usuario import Usuario
from app.models.servicio import Servicio
from app.models.cita import Cita
from app.models.credito import Credito

logger = logging.getLogger(__name__)

router = APIRouter()

# Rutas específicas ANTES que rutas con parámetros
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

@router.get("/mis-citas")
async def obtener_mis_citas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener citas del usuario actual"""
    try:
        citas_query = db.query(Cita, Servicio).join(
            Servicio, Cita.servicio_id == Servicio.id
        ).filter(
            Cita.usuario_id == current_user.id
        ).order_by(Cita.fecha.desc(), Cita.hora.desc())
        
        citas_raw = citas_query.all()
        
        citas_response = []
        for cita, servicio in citas_raw:
            cita_data = {
                'id': cita.id,
                'usuario_id': cita.usuario_id,
                'servicio_id': cita.servicio_id,
                'credito_id': cita.credito_id,
                'fecha': cita.fecha.isoformat() if cita.fecha else None,
                'hora': cita.hora.strftime('%H:%M') if cita.hora else None,
                'modalidad': cita.modalidad,
                'estado': cita.estado,
                'comentarios_cliente': cita.comentarios_cliente,
                'comentarios_admin': cita.comentarios_admin,
                'link_virtual': cita.link_virtual,
                'motivo_cancelacion': cita.motivo_cancelacion,
                'cancelada_por': cita.cancelada_por,
                'created_at': cita.created_at.isoformat() if cita.created_at else None,
                'updated_at': cita.updated_at.isoformat() if cita.updated_at else None,
                'servicio_nombre': servicio.nombre,
                'servicio_codigo': servicio.codigo
            }
            citas_response.append(cita_data)
        
        logger.info(f"Encontradas {len(citas_response)} citas para usuario {current_user.id}")
        return citas_response
        
    except Exception as e:
        logger.error(f"Error obteniendo mis citas: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# AGREGADO: Endpoint faltante para filtros
@router.get("/")
async def listar_citas_con_filtros(
    periodo: Optional[str] = Query(None, description="Filtrar por período (hoy, semana, mes)"),
    fecha: Optional[str] = Query(None, description="Filtrar por fecha (YYYY-MM-DD)"),
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    usuario_id: Optional[int] = Query(None, description="Filtrar por usuario"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Listar citas con filtros para admin"""
    try:
        logger.info(f"Listando citas con filtros - período: {periodo}, fecha: {fecha}")
        
        query = db.query(Cita, Usuario, Servicio).join(
            Usuario, Cita.usuario_id == Usuario.id
        ).join(
            Servicio, Cita.servicio_id == Servicio.id
        )
        
        # Aplicar filtros por período
        if periodo:
            hoy = datetime.now().date()
            
            if periodo == "hoy":
                query = query.filter(Cita.fecha == hoy)
            elif periodo == "semana":
                inicio_semana = hoy - timedelta(days=hoy.weekday())
                fin_semana = inicio_semana + timedelta(days=6)
                query = query.filter(Cita.fecha.between(inicio_semana, fin_semana))
            elif periodo == "mes":
                inicio_mes = hoy.replace(day=1)
                if hoy.month == 12:
                    fin_mes = hoy.replace(year=hoy.year + 1, month=1, day=1) - timedelta(days=1)
                else:
                    fin_mes = hoy.replace(month=hoy.month + 1, day=1) - timedelta(days=1)
                query = query.filter(Cita.fecha.between(inicio_mes, fin_mes))
        
        # Aplicar otros filtros
        if fecha:
            try:
                fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
                query = query.filter(Cita.fecha == fecha_obj)
            except ValueError:
                raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")
        
        if estado:
            query = query.filter(Cita.estado == estado)
            
        if usuario_id:
            query = query.filter(Cita.usuario_id == usuario_id)
        
        citas_raw = query.order_by(Cita.fecha.desc(), Cita.hora.desc()).offset(skip).limit(limit).all()
        
        citas_response = []
        for cita, usuario, servicio in citas_raw:
            cita_data = {
                'id': cita.id,
                'usuario_id': cita.usuario_id,
                'servicio_id': cita.servicio_id,
                'fecha': cita.fecha.isoformat() if cita.fecha else None,
                'hora': cita.hora.strftime('%H:%M') if cita.hora else None,
                'modalidad': cita.modalidad,
                'estado': cita.estado,
                'comentarios_cliente': cita.comentarios_cliente,
                'comentarios_admin': cita.comentarios_admin,
                'created_at': cita.created_at.isoformat() if cita.created_at else None,
                'usuario_nombre': usuario.nombre,
                'usuario_email': usuario.email,
                'usuario_telefono': usuario.telefono,
                'servicio_nombre': servicio.nombre,
                'servicio_codigo': servicio.codigo
            }
            citas_response.append(cita_data)
        
        logger.info(f"Encontradas {len(citas_response)} citas con filtros aplicados")
        return citas_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listando citas con filtros: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/agendar", status_code=status.HTTP_201_CREATED)
async def agendar_cita(
    cita_data: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Agendar nueva cita - CORREGIDO: Admin no necesita créditos"""
    try:
        logger.info(f"📥 Datos recibidos: {cita_data}")
        logger.info(f"👤 Usuario actual: {current_user.email} (tipo: {current_user.tipo})")
        
        # Determinar usuario objetivo
        if current_user.tipo == "administrador":
            if not cita_data.get('usuario_id'):
                raise HTTPException(status_code=400, detail="usuario_id es requerido para administradores")
            
            usuario_objetivo = db.query(Usuario).filter(Usuario.id == cita_data['usuario_id']).first()
            if not usuario_objetivo:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
        else:
            usuario_objetivo = current_user
            cita_data['usuario_id'] = current_user.id
        
        # Verificar que el servicio existe
        servicio = db.query(Servicio).filter(Servicio.id == cita_data['servicio_id']).first()
        if not servicio:
            raise HTTPException(status_code=404, detail="Servicio no encontrado")
        
        # Verificar disponibilidad de horario
        cita_existente = db.query(Cita).filter(
            Cita.fecha == cita_data['fecha'],
            Cita.hora == cita_data['hora'],
            Cita.estado.in_(["agendada", "confirmada"])
        ).first()
        
        if cita_existente:
            raise HTTPException(status_code=400, detail="El horario no está disponible")
        
        # CORREGIDO: Solo verificar créditos para clientes, NO para administradores
        credito_id = None
        if current_user.tipo != "administrador":
            # Solo clientes necesitan créditos
            credito = db.query(Credito).filter(
                Credito.usuario_id == usuario_objetivo.id,
                Credito.servicio_id == cita_data['servicio_id'],
                Credito.estado == 'activo',
                Credito.cantidad_disponible > 0
            ).first()
            
            if not credito:
                raise HTTPException(status_code=400, detail="No tienes créditos disponibles para este servicio")
            
            credito_id = credito.id
        else:
            # Administradores pueden agendar sin créditos
            logger.info(f"Administrador {current_user.email} agendando cita sin validar créditos")
        
        # Crear la cita
        nueva_cita = Cita(
            usuario_id=cita_data['usuario_id'],
            servicio_id=cita_data['servicio_id'],
            credito_id=credito_id,  # Puede ser None para admin
            fecha=datetime.strptime(cita_data['fecha'], '%Y-%m-%d').date(),
            hora=datetime.strptime(cita_data['hora'], '%H:%M').time(),
            modalidad=cita_data['modalidad'],
            estado=cita_data.get('estado', 'agendada'),
            comentarios_cliente=cita_data.get('comentarios_cliente'),
            comentarios_admin=cita_data.get('comentarios_admin', f"Cita agendada por {current_user.tipo}"),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        db.add(nueva_cita)
        
        # Usar crédito solo si existe (no para admin)
        if credito_id and current_user.tipo != "administrador":
            credito.usar_credito()
        
        db.commit()
        db.refresh(nueva_cita)
        
        logger.info(f"✅ Cita {nueva_cita.id} creada exitosamente por {current_user.tipo}")
        
        return {
            'id': nueva_cita.id,
            'usuario_id': nueva_cita.usuario_id,
            'servicio_id': nueva_cita.servicio_id,
            'fecha': nueva_cita.fecha.isoformat(),
            'hora': nueva_cita.hora.strftime('%H:%M'),
            'modalidad': nueva_cita.modalidad,
            'estado': nueva_cita.estado,
            'comentarios_admin': nueva_cita.comentarios_admin,
            'created_at': nueva_cita.created_at.isoformat(),
            'usuario_nombre': usuario_objetivo.nombre,
            'servicio_nombre': servicio.nombre,
            'agendada_por': current_user.tipo
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error agendando cita: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# Rutas con parámetros AL FINAL para evitar conflictos
@router.get("/{cita_id}")
async def obtener_cita_por_id(
    cita_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener cita por ID"""
    try:
        logger.info(f"Obteniendo cita {cita_id} para usuario {current_user.email}")
        
        cita_query = db.query(Cita, Usuario, Servicio).join(
            Usuario, Cita.usuario_id == Usuario.id
        ).join(
            Servicio, Cita.servicio_id == Servicio.id
        ).filter(Cita.id == cita_id)
        
        result = cita_query.first()
        
        if not result:
            raise HTTPException(status_code=404, detail="Cita no encontrada")
        
        cita, usuario, servicio = result
        
        # Verificar permisos: admin puede ver todas, cliente solo las suyas
        if current_user.tipo != "administrador" and cita.usuario_id != current_user.id:
            raise HTTPException(status_code=403, detail="No tienes permisos para ver esta cita")
        
        cita_data = {
            'id': cita.id,
            'usuario_id': cita.usuario_id,
            'servicio_id': cita.servicio_id,
            'credito_id': cita.credito_id,
            'fecha': cita.fecha.isoformat() if cita.fecha else None,
            'hora': cita.hora.strftime('%H:%M') if cita.hora else None,
            'modalidad': cita.modalidad,
            'estado': cita.estado,
            'comentarios_cliente': cita.comentarios_cliente,
            'comentarios_admin': cita.comentarios_admin,
            'link_virtual': cita.link_virtual,
            'motivo_cancelacion': cita.motivo_cancelacion,
            'cancelada_por': cita.cancelada_por,
            'fecha_completada': cita.fecha_completada.isoformat() if cita.fecha_completada else None,
            'recordatorio_enviado': cita.recordatorio_enviado,
            'fecha_recordatorio': cita.fecha_recordatorio.isoformat() if cita.fecha_recordatorio else None,
            'created_at': cita.created_at.isoformat() if cita.created_at else None,
            'updated_at': cita.updated_at.isoformat() if cita.updated_at else None,
            'usuario_nombre': usuario.nombre,
            'usuario_email': usuario.email,
            'usuario_telefono': usuario.telefono,
            'servicio_nombre': servicio.nombre,
            'servicio_codigo': servicio.codigo,
            'duracion_minutos': servicio.duracion_minutos,
            'notas_psicologa': None  # Campo que no existe en BD
        }
        
        logger.info(f"Cita {cita_id} obtenida exitosamente")
        return cita_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo cita {cita_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo cita: {str(e)}")

@router.put("/{cita_id}/confirmar")
async def confirmar_cita(
    cita_id: int,
    notas: Optional[str] = Query(None, description="Notas de la psicóloga"),
    link_virtual: Optional[str] = Query(None, description="Link para cita virtual"),
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Confirmar cita (solo administradores)"""
    try:
        cita = db.query(Cita).filter(Cita.id == cita_id).first()
        
        if not cita:
            raise HTTPException(status_code=404, detail="Cita no encontrada")
        
        if cita.estado != 'agendada':
            raise HTTPException(status_code=400, detail="Solo se pueden confirmar citas agendadas")
        
        cita.estado = 'confirmada'
        cita.updated_at = datetime.now(timezone.utc)
        
        if notas:
            cita.comentarios_admin = notas
        if link_virtual:
            cita.link_virtual = link_virtual
        
        db.commit()
        
        return {"message": "Cita confirmada exitosamente"}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error confirmando cita: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{cita_id}/completar")
async def completar_cita(
    cita_id: int,
    notas_sesion: Optional[str] = Query(None, description="Notas de la sesión (opcional)"),  # CORREGIDO: Opcional
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Marcar cita como completada (solo administradores)"""
    try:
        cita = db.query(Cita).filter(Cita.id == cita_id).first()
        
        if not cita:
            raise HTTPException(status_code=404, detail="Cita no encontrada")
        
        if cita.estado not in ['agendada', 'confirmada']:
            raise HTTPException(status_code=400, detail="No se puede completar esta cita")
        
        cita.estado = 'completada'
        cita.fecha_completada = datetime.now(timezone.utc)
        
        # CORREGIDO: Usar comentarios_admin en lugar de notas_psicologa
        if notas_sesion:
            cita.comentarios_admin = f"Completada: {notas_sesion}"
        else:
            cita.comentarios_admin = "Cita completada desde panel administrativo"
            
        cita.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        return {"message": "Cita completada exitosamente"}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error completando cita: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{cita_id}/cancelar")
async def cancelar_cita(
    cita_id: int,
    motivo: str = Query(..., description="Motivo de la cancelación"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Cancelar cita (restaura créditos)"""
    try:
        cita = db.query(Cita).filter(Cita.id == cita_id).first()
        
        if not cita:
            raise HTTPException(status_code=404, detail="Cita no encontrada")
        
        # Verificar permisos
        if current_user.tipo != "administrador" and cita.usuario_id != current_user.id:
            raise HTTPException(status_code=403, detail="No tienes permisos para cancelar esta cita")
        
        if cita.estado not in ['agendada', 'confirmada']:
            raise HTTPException(status_code=400, detail="No se puede cancelar esta cita")
        
        cita.estado = 'cancelada'
        cita.motivo_cancelacion = motivo
        cita.cancelada_por = 'administrador' if current_user.tipo == 'administrador' else 'cliente'
        cita.updated_at = datetime.now(timezone.utc)
        
        # Restaurar crédito si fue usado
        if cita.credito_id:
            credito = db.query(Credito).filter(Credito.id == cita.credito_id).first()
            if credito:
                credito.restaurar_credito()
        
        db.commit()
        
        return {"message": "Cita cancelada exitosamente"}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error cancelando cita: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
