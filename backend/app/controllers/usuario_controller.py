from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from app.config.database import get_db
from app.services.usuario_service import UsuarioService
from app.dto.usuario_dto import UsuarioResponseDTO, UsuarioCreateDTO, UsuarioUpdateDTO
from app.utils.exceptions import BusinessException
from app.utils.security import get_current_active_user, require_admin
from app.models.usuario import Usuario
from app.models.credito import Credito
from app.models.servicio import Servicio
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/perfil", response_model=UsuarioResponseDTO)
async def obtener_perfil_usuario(
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener perfil del usuario actual"""
    return UsuarioResponseDTO.model_validate(current_user.to_dict())

@router.get("/creditos", response_model=List[dict])
async def obtener_creditos_usuario(
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Obtener créditos del usuario"""
    try:
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

@router.get("/", response_model=List[UsuarioResponseDTO])
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
                
                # Para MVP, créditos disponibles será 0
                creditos_disponibles = 0
                
                usuario_dict = usuario.to_dict()
                usuario_dict['creditos_disponibles'] = creditos_disponibles
                usuario_dict['total_citas'] = total_citas
                
                usuarios_response.append(UsuarioResponseDTO.model_validate(usuario_dict))
                
            except Exception as e:
                logger.warning(f"Error procesando usuario {usuario.id}: {e}")
                # Agregar usuario básico sin estadísticas
                usuarios_response.append(UsuarioResponseDTO.model_validate(usuario.to_dict()))
        
        return usuarios_response
        
    except Exception as e:
        logger.error(f"Error listando usuarios: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo usuarios")


@router.get("/{usuario_id}", response_model=UsuarioResponseDTO)
async def obtener_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Obtener usuario por ID (solo administradores)"""
    try:
        # CORREGIDO: Cargar usuario con relaciones
        usuario = db.query(Usuario).options(
            joinedload(Usuario.creditos),
            joinedload(Usuario.citas)
        ).filter(Usuario.id == usuario_id).first()
        
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        return UsuarioResponseDTO.model_validate(usuario.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo usuario: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo usuario")

@router.post("/", response_model=UsuarioResponseDTO, status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    usuario_dto: UsuarioCreateDTO,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Crear nuevo usuario (solo administradores)"""
    try:
        usuario_service = UsuarioService(db)
        return usuario_service.crear_usuario(usuario_dto)
    except BusinessException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creando usuario: {e}")
        raise HTTPException(status_code=500, detail="Error creando usuario")

@router.put("/{usuario_id}", response_model=UsuarioResponseDTO)
async def actualizar_usuario(
    usuario_id: int,
    usuario_dto: UsuarioUpdateDTO,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Actualizar usuario (solo administradores)"""
    try:
        usuario_service = UsuarioService(db)
        usuario_actualizado = usuario_service.actualizar_usuario(usuario_id, usuario_dto)
        return usuario_actualizado
    except BusinessException as e:
        logger.error(f"Error de negocio actualizando usuario {usuario_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error inesperado actualizando usuario {usuario_id}: {e}")
        raise HTTPException(status_code=500, detail="Error actualizando usuario")

@router.delete("/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Eliminar usuario (solo administradores)"""
    try:
        usuario_service = UsuarioService(db)
        eliminado = usuario_service.eliminar_usuario(usuario_id)
        if not eliminado:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error eliminando usuario: {e}")
        raise HTTPException(status_code=500, detail="Error eliminando usuario")

@router.put("/{usuario_id}/estado", response_model=UsuarioResponseDTO)
async def cambiar_estado_usuario(
    usuario_id: int,
    nuevo_estado: str,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Cambiar estado del usuario"""
    try:
        usuario_service = UsuarioService(db)
        return usuario_service.cambiar_estado_usuario(usuario_id, nuevo_estado)
    except BusinessException as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error cambiando estado del usuario: {e}")
        raise HTTPException(status_code=500, detail="Error cambiando estado del usuario")

# NUEVO: Endpoint específico para admin con datos completos
@router.get("/admin/completo", response_model=List[dict])
async def obtener_usuarios_completo_admin(
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Obtener usuarios con información completa para admin"""
    try:
        logger.info("🔄 Cargando usuarios completos para admin...")
        
        # Query optimizado con joins
        usuarios = db.query(Usuario).options(
            joinedload(Usuario.creditos),
            joinedload(Usuario.citas)
        ).all()
        
        logger.info(f"✅ {len(usuarios)} usuarios cargados desde BD")
        
        usuarios_completos = []
        for usuario in usuarios:
            try:
                # Calcular estadísticas
                creditos_disponibles = 0
                total_citas = 0
                
                if hasattr(usuario, 'creditos'):
                    creditos_disponibles = sum([
                        c.cantidad_disponible for c in usuario.creditos 
                        if c.estado == 'activo'
                    ])
                
                if hasattr(usuario, 'citas'):
                    total_citas = len(usuario.citas)
                
                usuario_data = {
                    'id': usuario.id,
                    'nombre': usuario.nombre,
                    'email': usuario.email,
                    'telefono': usuario.telefono,
                    'documento': usuario.documento,
                    'tipo': usuario.tipo,
                    'estado': usuario.estado,
                    'creditos_disponibles': creditos_disponibles,
                    'total_citas': total_citas,
                    'created_at': usuario.created_at.isoformat() if usuario.created_at else None,
                    'updated_at': usuario.updated_at.isoformat() if usuario.updated_at else None
                }
                
                usuarios_completos.append(usuario_data)
                
            except Exception as e:
                logger.error(f"Error procesando usuario {usuario.id}: {e}")
                # Agregar usuario básico sin estadísticas
                usuarios_completos.append({
                    'id': usuario.id,
                    'nombre': usuario.nombre,
                    'email': usuario.email,
                    'telefono': usuario.telefono,
                    'documento': usuario.documento,
                    'tipo': usuario.tipo,
                    'estado': usuario.estado,
                    'creditos_disponibles': 0,
                    'total_citas': 0,
                    'created_at': usuario.created_at.isoformat() if usuario.created_at else None,
                    'updated_at': usuario.updated_at.isoformat() if usuario.updated_at else None
                })
        
        logger.info(f"✅ Usuarios procesados: {len(usuarios_completos)}")
        return usuarios_completos
        
    except Exception as e:
        logger.error(f"❌ Error obteniendo usuarios completos: {e}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo usuarios: {str(e)}")


@router.get("/{usuario_id}", response_model=UsuarioResponseDTO)
async def obtener_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener usuario por ID - Versión MVP sin eager loading problemático"""
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
            
            # Para MVP, créditos disponibles será 0 (sistema no implementado)
            creditos_disponibles = 0
            
            # Crear respuesta con estadísticas
            usuario_data = usuario.to_dict()
            usuario_data['total_citas'] = total_citas
            usuario_data['creditos_disponibles'] = creditos_disponibles
            
            logger.info(f"Usuario {usuario_id} obtenido exitosamente")
            return UsuarioResponseDTO.model_validate(usuario_data)
            
        except Exception as e:
            logger.error(f"Error calculando estadísticas para usuario {usuario_id}: {e}")
            # Retornar usuario básico sin estadísticas en caso de error
            return UsuarioResponseDTO.model_validate(usuario.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo usuario {usuario_id}: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo usuario")

