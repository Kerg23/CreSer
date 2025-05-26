from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, date
import logging

from app.config.database import get_db
from app.utils.security import require_admin
from app.models.usuario import Usuario
from app.models.cita import Cita
from app.models.servicio import Servicio

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/estadisticas")
async def obtener_estadisticas_admin(
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Obtener estadísticas reales de la base de datos"""
    try:
        logger.info("Obteniendo estadísticas reales de la base de datos...")
        
        # Estadísticas de usuarios reales
        total_usuarios = db.query(func.count(Usuario.id)).filter(Usuario.tipo == 'cliente').scalar() or 0
        usuarios_activos = db.query(func.count(Usuario.id)).filter(
            Usuario.tipo == 'cliente', 
            Usuario.estado == 'activo'
        ).scalar() or 0
        
        # Estadísticas de citas reales
        total_citas = db.query(func.count(Cita.id)).scalar() or 0
        
        # Citas de hoy usando DATE() function
        citas_hoy = db.query(func.count(Cita.id)).filter(
            func.date(Cita.fecha) == func.date(func.now())
        ).scalar() or 0
        
        citas_pendientes = db.query(func.count(Cita.id)).filter(
            Cita.estado.in_(['agendada', 'confirmada'])
        ).scalar() or 0
        
        citas_completadas = db.query(func.count(Cita.id)).filter(
            Cita.estado == 'completada'
        ).scalar() or 0
        
        citas_canceladas = db.query(func.count(Cita.id)).filter(
            Cita.estado == 'cancelada'
        ).scalar() or 0
        
        # Calcular tasa de asistencia
        tasa_asistencia = 0
        if total_citas > 0:
            tasa_asistencia = round((citas_completadas / total_citas) * 100, 1)
        
        # Estadísticas básicas para MVP (ingresos y pagos serán 0 hasta implementar sistema completo)
        estadisticas = {
            "usuarios": {
                "total": total_usuarios,
                "activos": usuarios_activos
            },
            "citas": {
                "total": total_citas,
                "hoy": citas_hoy,
                "pendientes": citas_pendientes,
                "completadas": citas_completadas,
                "canceladas": citas_canceladas,
                "tasa_asistencia": tasa_asistencia
            },
            "ingresos": {
                "mes": 0,  # Para implementar en versión completa
                "total": 0  # Para implementar en versión completa
            },
            "pagos": {
                "pendientes": 0,  # Para implementar en versión completa
                "aprobados": 0,  # Para implementar en versión completa
                "tasa_aprobacion": 0  # Para implementar en versión completa
            },
            "creditos": {
                "activos": 0  # Para implementar en versión completa
            }
        }
        
        logger.info(f"Estadísticas reales calculadas: {estadisticas}")
        return estadisticas
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas reales: {e}")
        # En caso de error, retornar estadísticas vacías
        return {
            "usuarios": {"total": 0, "activos": 0},
            "citas": {"total": 0, "hoy": 0, "pendientes": 0, "completadas": 0, "tasa_asistencia": 0},
            "ingresos": {"mes": 0, "total": 0},
            "pagos": {"pendientes": 0, "aprobados": 0, "tasa_aprobacion": 0},
            "creditos": {"activos": 0}
        }

@router.get("/citas-hoy")
async def obtener_citas_hoy(
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Obtener citas reales del día actual"""
    try:
        logger.info("Obteniendo citas reales de hoy...")
        
        # Query para obtener citas de hoy con información de usuario y servicio
        citas_query = db.query(Cita, Usuario, Servicio).join(
            Usuario, Cita.usuario_id == Usuario.id
        ).join(
            Servicio, Cita.servicio_id == Servicio.id
        ).filter(
            func.date(Cita.fecha) == func.date(func.now())
        ).order_by(Cita.hora)
        
        citas_raw = citas_query.all()
        
        citas_hoy = []
        for cita, usuario, servicio in citas_raw:
            cita_data = {
                "id": cita.id,
                "hora": cita.hora.strftime('%H:%M') if cita.hora else '00:00',
                "usuario_nombre": usuario.nombre,
                "usuario_telefono": usuario.telefono or 'No especificado',
                "usuario_email": usuario.email,
                "servicio_nombre": servicio.nombre,
                "modalidad": cita.modalidad,
                "estado": cita.estado,
                "comentarios_admin": cita.comentarios_admin,
                "comentarios_cliente": cita.comentarios_cliente
            }
            citas_hoy.append(cita_data)
        
        logger.info(f"Encontradas {len(citas_hoy)} citas reales para hoy")
        return citas_hoy
        
    except Exception as e:
        logger.error(f"Error obteniendo citas reales de hoy: {e}")
        return []

@router.get("/pagos-detallado")
async def obtener_pagos_detallado(
    estado: str = None,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Obtener pagos reales - MVP sin tabla de pagos implementada"""
    try:
        logger.info(f"Obteniendo pagos detallados (MVP) con estado: {estado}")
        
        # Para MVP, retornar lista vacía ya que no hay tabla de pagos implementada
        # En la versión completa, aquí se consultaría la tabla de pagos real
        
        logger.info("Sistema de pagos no implementado en MVP - retornando lista vacía")
        return []
        
    except Exception as e:
        logger.error(f"Error obteniendo pagos detallados: {e}")
        return []

@router.get("/usuarios-completo")
async def obtener_usuarios_completo(
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Obtener usuarios reales completos con estadísticas"""
    try:
        logger.info("Obteniendo usuarios reales completos...")
        
        # Query para obtener todos los usuarios tipo cliente
        usuarios_query = db.query(Usuario).filter(Usuario.tipo == 'cliente')
        usuarios_raw = usuarios_query.all()
        
        usuarios_completos = []
        for usuario in usuarios_raw:
            try:
                # Contar citas del usuario
                total_citas = db.query(func.count(Cita.id)).filter(
                    Cita.usuario_id == usuario.id
                ).scalar() or 0
                
                # Para MVP, créditos disponibles será 0 (sistema de créditos no implementado)
                creditos_disponibles = 0
                
                usuario_data = {
                    "id": usuario.id,
                    "nombre": usuario.nombre,
                    "email": usuario.email,
                    "telefono": usuario.telefono or 'No especificado',
                    "documento": usuario.documento or 'No especificado',
                    "tipo": usuario.tipo,
                    "estado": usuario.estado,
                    "creditos_disponibles": creditos_disponibles,
                    "total_citas": total_citas,
                    "created_at": usuario.created_at.isoformat() if usuario.created_at else None,
                    "updated_at": usuario.updated_at.isoformat() if usuario.updated_at else None
                }
                
                usuarios_completos.append(usuario_data)
                
            except Exception as e:
                logger.error(f"Error procesando usuario {usuario.id}: {e}")
                # Agregar usuario básico sin estadísticas en caso de error
                usuarios_completos.append({
                    "id": usuario.id,
                    "nombre": usuario.nombre,
                    "email": usuario.email,
                    "telefono": usuario.telefono or 'No especificado',
                    "documento": usuario.documento or 'No especificado',
                    "tipo": usuario.tipo,
                    "estado": usuario.estado,
                    "creditos_disponibles": 0,
                    "total_citas": 0,
                    "created_at": usuario.created_at.isoformat() if usuario.created_at else None,
                    "updated_at": usuario.updated_at.isoformat() if usuario.updated_at else None
                })
        
        logger.info(f"Retornando {len(usuarios_completos)} usuarios reales")
        return usuarios_completos
        
    except Exception as e:
        logger.error(f"Error obteniendo usuarios reales completos: {e}")
        return []

@router.get("/citas-todas")
async def obtener_todas_las_citas(
    usuario_id: int = None,
    estado: str = None,
    fecha: str = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Obtener todas las citas reales con filtros"""
    try:
        logger.info("Obteniendo todas las citas reales...")
        
        # Query base con joins
        query = db.query(Cita, Usuario, Servicio).join(
            Usuario, Cita.usuario_id == Usuario.id
        ).join(
            Servicio, Cita.servicio_id == Servicio.id
        )
        
        # Aplicar filtros
        if usuario_id:
            query = query.filter(Cita.usuario_id == usuario_id)
        
        if estado:
            query = query.filter(Cita.estado == estado)
        
        if fecha:
            query = query.filter(func.date(Cita.fecha) == fecha)
        
        # Ordenar por fecha y hora más recientes
        query = query.order_by(Cita.fecha.desc(), Cita.hora.desc())
        
        # Limitar resultados
        citas_raw = query.limit(limit).all()
        
        citas_todas = []
        for cita, usuario, servicio in citas_raw:
            cita_data = {
                "id": cita.id,
                "fecha": cita.fecha.isoformat() if cita.fecha else None,
                "hora": cita.hora.strftime('%H:%M') if cita.hora else '00:00',
                "usuario_id": usuario.id,
                "usuario_nombre": usuario.nombre,
                "usuario_email": usuario.email,
                "usuario_telefono": usuario.telefono,
                "servicio_id": servicio.id,
                "servicio_nombre": servicio.nombre,
                "servicio_codigo": servicio.codigo,
                "modalidad": cita.modalidad,
                "estado": cita.estado,
                "comentarios_admin": cita.comentarios_admin,
                "comentarios_cliente": cita.comentarios_cliente,
                "created_at": cita.created_at.isoformat() if cita.created_at else None
            }
            citas_todas.append(cita_data)
        
        logger.info(f"Retornando {len(citas_todas)} citas reales")
        return citas_todas
        
    except Exception as e:
        logger.error(f"Error obteniendo todas las citas reales: {e}")
        return []

@router.get("/debug-db")
async def debug_base_datos(
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Endpoint de debug para verificar datos en la base de datos"""
    try:
        # Contar registros en cada tabla
        count_usuarios = db.query(func.count(Usuario.id)).scalar()
        count_citas = db.query(func.count(Cita.id)).scalar()
        count_servicios = db.query(func.count(Servicio.id)).scalar()
        
        # Obtener algunos registros de ejemplo
        usuarios_sample = db.query(Usuario).limit(3).all()
        citas_sample = db.query(Cita).limit(3).all()
        servicios_sample = db.query(Servicio).limit(3).all()
        
        return {
            "conteos": {
                "usuarios": count_usuarios,
                "citas": count_citas,
                "servicios": count_servicios
            },
            "muestras": {
                "usuarios": [{"id": u.id, "nombre": u.nombre, "email": u.email} for u in usuarios_sample],
                "citas": [{"id": c.id, "fecha": str(c.fecha), "estado": c.estado} for c in citas_sample],
                "servicios": [{"id": s.id, "nombre": s.nombre, "codigo": s.codigo} for s in servicios_sample]
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error en debug de BD: {e}")
        return {"error": str(e)}

@router.get("/test")
async def test_admin():
    """Endpoint de prueba"""
    return {
        "message": "Admin controller con datos reales funcionando",
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "endpoints_disponibles": [
            "/estadisticas - Estadísticas reales de BD",
            "/citas-hoy - Citas reales de hoy", 
            "/usuarios-completo - Usuarios reales",
            "/citas-todas - Todas las citas reales",
            "/debug-db - Debug de base de datos",
            "/test - Este endpoint"
        ]
    }
