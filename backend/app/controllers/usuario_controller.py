from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import logging

from app.config.database import get_db
from app.utils.security import get_current_active_user, require_admin
from app.models.usuario import Usuario
from app.models.cita import Cita
from app.models.credito import Credito

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/perfil")
async def obtener_perfil_usuario(
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener perfil del usuario actual"""
    return current_user.to_dict()

@router.get("/creditos")
async def obtener_creditos_usuario(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obtener créditos del usuario"""
    try:
        from app.models.servicio import Servicio
        
        creditos = db.query(Credito, Servicio).join(
            Servicio, Credito.servicio_id == Servicio.id
        ).filter(
            Credito.usuario_id == current_user.id,
            Credito.estado == "activo"
        ).all()
        
        creditos_response = []
        for credito, servicio in creditos:
            creditos_response.append({
                "id": credito.id,
                "servicio": servicio.codigo,
                "servicio_id": servicio.id,
                "servicio_nombre": servicio.nombre,
                "nombre": servicio.nombre,
                "cantidad": credito.cantidad_disponible,
                "cantidad_disponible": credito.cantidad_disponible,
                "cantidad_inicial": credito.cantidad_inicial,
                "precio_unitario": float(credito.precio_unitario),
                "duracion": servicio.duracion_minutos,
                "estado": credito.estado
            })
        
        return creditos_response
        
    except Exception as e:
        logger.error(f"Error obteniendo créditos: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo créditos")

@router.get("/{usuario_id}")
async def obtener_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener usuario por ID - CORREGIDO SIN EAGER LOADING PROBLEMÁTICO"""
    try:
        logger.info(f"Obteniendo usuario {usuario_id}")
        
        # Verificar permisos: admin puede ver todos, cliente solo su propio perfil
        if current_user.tipo != "administrador" and current_user.id != usuario_id:
            raise HTTPException(status_code=403, detail="No tienes permisos para ver este usuario")
        
        # CORREGIDO: Query simple sin joinedload problemático
        usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
        
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Calcular estadísticas manualmente para MVP
        try:
            # Contar citas del usuario
            total_citas = db.query(func.count(Cita.id)).filter(
                Cita.usuario_id == usuario_id
            ).scalar() or 0
            
            # Calcular créditos disponibles
            creditos_disponibles = db.query(func.sum(Credito.cantidad_disponible)).filter(
                Credito.usuario_id == usuario_id,
                Credito.estado == 'activo'
            ).scalar() or 0
            
            # Crear respuesta con estadísticas
            usuario_data = usuario.to_dict()
            usuario_data['total_citas'] = total_citas
            usuario_data['creditos_disponibles'] = creditos_disponibles
            
            logger.info(f"Usuario {usuario_id} obtenido exitosamente")
            return usuario_data
            
        except Exception as e:
            logger.error(f"Error calculando estadísticas para usuario {usuario_id}: {e}")
            # Retornar usuario básico sin estadísticas en caso de error
            return usuario.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo usuario {usuario_id}: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo usuario")

@router.get("/")
async def listar_usuarios(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Listar todos los usuarios (solo administradores) - Versión MVP"""
    try:
        logger.info("Listando usuarios para admin")
        
        # CORREGIDO: Query simple sin eager loading problemático
        usuarios = db.query(Usuario).offset(skip).limit(limit).all()
        
        logger.info(f"Usuarios cargados desde BD: {len(usuarios)}")
        
        usuarios_response = []
        for usuario in usuarios:
            try:
                # Calcular estadísticas manualmente
                total_citas = db.query(func.count(Cita.id)).filter(
                    Cita.usuario_id == usuario.id
                ).scalar() or 0
                
                creditos_disponibles = db.query(func.sum(Credito.cantidad_disponible)).filter(
                    Credito.usuario_id == usuario.id,
                    Credito.estado == 'activo'
                ).scalar() or 0
                
                usuario_dict = usuario.to_dict()
                usuario_dict['creditos_disponibles'] = creditos_disponibles
                usuario_dict['total_citas'] = total_citas
                
                usuarios_response.append(usuario_dict)
                
            except Exception as e:
                logger.warning(f"Error procesando usuario {usuario.id}: {e}")
                # Agregar usuario básico sin estadísticas
                usuarios_response.append(usuario.to_dict())
        
        return usuarios_response
        
    except Exception as e:
        logger.error(f"Error listando usuarios: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo usuarios")
