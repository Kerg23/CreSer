from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import logging
from datetime import datetime, timezone

from app.config.database import get_db
from app.utils.security import get_current_active_user, require_admin, get_password_hash
from app.models.usuario import Usuario
from app.models.cita import Cita
from app.models.credito import Credito

logger = logging.getLogger(__name__)

router = APIRouter()

# ============ ENDPOINTS ESPECÍFICOS PRIMERO ============

@router.get("/perfil")
async def obtener_perfil_usuario(
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener perfil del usuario actual"""
    return current_user.to_dict()

# AGREGADO: ENDPOINT FALTANTE PUT /perfil
@router.put("/perfil")
async def actualizar_perfil_usuario(
    datos: dict,
    current_user: Usuario = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Actualizar perfil del usuario autenticado"""
    try:
        logger.info(f"Actualizando perfil del usuario {current_user.id}")
        
        # Obtener usuario fresco de la BD
        usuario = db.query(Usuario).filter(Usuario.id == current_user.id).first()
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Campos que el usuario puede actualizar
        campos_permitidos = ['nombre', 'telefono', 'documento', 'direccion', 'fecha_nacimiento', 'genero', 'configuracion']
        
        # Actualizar solo campos permitidos
        for campo in campos_permitidos:
            if campo in datos and datos[campo] is not None:
                setattr(usuario, campo, datos[campo])
                logger.info(f"Campo {campo} actualizado")
        
        # Verificar documento único si se está cambiando
        if 'documento' in datos and datos['documento'] != usuario.documento:
            if datos['documento']:  # Solo si no es None o vacío
                doc_existente = db.query(Usuario).filter(
                    Usuario.documento == datos['documento'],
                    Usuario.id != current_user.id
                ).first()
                if doc_existente:
                    raise HTTPException(status_code=400, detail="Ya existe un usuario con este documento")
        
        # Actualizar timestamp
        usuario.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(usuario)
        
        logger.info(f"Perfil del usuario {current_user.id} actualizado exitosamente")
        
        return usuario.to_dict()
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error actualizando perfil del usuario {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error actualizando perfil: {str(e)}")

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

@router.get("/")
async def listar_usuarios(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Listar todos los usuarios (solo administradores)"""
    try:
        logger.info("Listando usuarios para admin")
        
        usuarios = db.query(Usuario).offset(skip).limit(limit).all()
        
        logger.info(f"Usuarios cargados desde BD: {len(usuarios)}")
        
        usuarios_response = []
        for usuario in usuarios:
            try:
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
                usuarios_response.append(usuario.to_dict())
        
        return usuarios_response
        
    except Exception as e:
        logger.error(f"Error listando usuarios: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo usuarios")

@router.post("/", status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    usuario_data: dict,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Crear nuevo usuario (solo administradores)"""
    try:
        logger.info(f"Admin {current_admin.id} creando nuevo usuario")
        
        # Verificar si el email ya existe
        email_existente = db.query(Usuario).filter(Usuario.email == usuario_data['email']).first()
        if email_existente:
            raise HTTPException(status_code=400, detail="Ya existe un usuario con este email")
        
        # Verificar si el documento ya existe (si se proporciona)
        if usuario_data.get('documento'):
            doc_existente = db.query(Usuario).filter(Usuario.documento == usuario_data['documento']).first()
            if doc_existente:
                raise HTTPException(status_code=400, detail="Ya existe un usuario con este documento")
        
        # Hashear contraseña
        password_hash = get_password_hash(usuario_data['password'])
        
        # Crear nuevo usuario
        nuevo_usuario = Usuario(
            nombre=usuario_data['nombre'],
            email=usuario_data['email'],
            telefono=usuario_data['telefono'],
            documento=usuario_data.get('documento'),
            password=password_hash,
            direccion=usuario_data.get('direccion'),
            fecha_nacimiento=usuario_data.get('fecha_nacimiento'),
            genero=usuario_data.get('genero'),
            tipo=usuario_data.get('tipo', 'cliente'),
            estado=usuario_data.get('estado', 'activo')
        )
        
        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)
        
        logger.info(f"Usuario {nuevo_usuario.id} creado exitosamente por admin {current_admin.id}")
        
        return nuevo_usuario.to_dict()
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creando usuario: {e}")
        raise HTTPException(status_code=500, detail=f"Error creando usuario: {str(e)}")

# ============ ENDPOINTS CON PARÁMETROS AL FINAL ============

@router.get("/{usuario_id}")
async def obtener_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener usuario por ID"""
    try:
        logger.info(f"Obteniendo usuario {usuario_id}")
        
        # Verificar permisos: admin puede ver todos, cliente solo su propio perfil
        if current_user.tipo != "administrador" and current_user.id != usuario_id:
            raise HTTPException(status_code=403, detail="No tienes permisos para ver este usuario")
        
        usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
        
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Calcular estadísticas manualmente
        try:
            total_citas = db.query(func.count(Cita.id)).filter(
                Cita.usuario_id == usuario_id
            ).scalar() or 0
            
            creditos_disponibles = db.query(func.sum(Credito.cantidad_disponible)).filter(
                Credito.usuario_id == usuario_id,
                Credito.estado == 'activo'
            ).scalar() or 0
            
            usuario_data = usuario.to_dict()
            usuario_data['total_citas'] = total_citas
            usuario_data['creditos_disponibles'] = creditos_disponibles
            
            logger.info(f"Usuario {usuario_id} obtenido exitosamente")
            return usuario_data
            
        except Exception as e:
            logger.error(f"Error calculando estadísticas para usuario {usuario_id}: {e}")
            return usuario.to_dict()
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo usuario {usuario_id}: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo usuario")

@router.put("/{usuario_id}")
async def actualizar_usuario(
    usuario_id: int,
    usuario_data: dict,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Actualizar usuario"""
    try:
        logger.info(f"Actualizando usuario {usuario_id}")
        
        # Verificar permisos
        if current_user.tipo != "administrador" and current_user.id != usuario_id:
            raise HTTPException(status_code=403, detail="No tienes permisos para actualizar este usuario")
        
        usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
        
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Actualizar campos permitidos
        campos_actualizables = ['nombre', 'telefono', 'documento', 'direccion', 'fecha_nacimiento', 'genero']
        
        # Solo admin puede cambiar estado y tipo
        if current_user.tipo == "administrador":
            campos_actualizables.extend(['estado', 'tipo'])
        
        for campo in campos_actualizables:
            if campo in usuario_data and usuario_data[campo] is not None:
                setattr(usuario, campo, usuario_data[campo])
        
        # Verificar email único si se está cambiando
        if 'email' in usuario_data and usuario_data['email'] != usuario.email:
            if current_user.tipo == "administrador":  # Solo admin puede cambiar email
                email_existente = db.query(Usuario).filter(
                    Usuario.email == usuario_data['email'],
                    Usuario.id != usuario_id
                ).first()
                if email_existente:
                    raise HTTPException(status_code=400, detail="Ya existe un usuario con este email")
                usuario.email = usuario_data['email']
        
        # Verificar documento único si se está cambiando
        if 'documento' in usuario_data and usuario_data['documento'] != usuario.documento:
            if usuario_data['documento']:  # Solo si no es None o vacío
                doc_existente = db.query(Usuario).filter(
                    Usuario.documento == usuario_data['documento'],
                    Usuario.id != usuario_id
                ).first()
                if doc_existente:
                    raise HTTPException(status_code=400, detail="Ya existe un usuario con este documento")
        
        # Actualizar contraseña si se proporciona
        if 'password' in usuario_data and usuario_data['password']:
            usuario.password = get_password_hash(usuario_data['password'])
        
        # Actualizar timestamp
        usuario.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(usuario)
        
        logger.info(f"Usuario {usuario_id} actualizado exitosamente")
        
        return usuario.to_dict()
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error actualizando usuario {usuario_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error actualizando usuario: {str(e)}")

@router.delete("/{usuario_id}")
async def eliminar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Eliminar usuario (solo administradores)"""
    try:
        logger.info(f"Admin {current_admin.id} eliminando usuario {usuario_id}")
        
        usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
        
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # No permitir eliminar administradores
        if usuario.tipo == "administrador":
            raise HTTPException(status_code=400, detail="No se puede eliminar un administrador")
        
        # No permitir auto-eliminación
        if usuario.id == current_admin.id:
            raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
        
        # Verificar si tiene citas pendientes
        citas_pendientes = db.query(func.count(Cita.id)).filter(
            Cita.usuario_id == usuario_id,
            Cita.estado.in_(['agendada', 'confirmada'])
        ).scalar() or 0
        
        if citas_pendientes > 0:
            raise HTTPException(status_code=400, detail=f"No se puede eliminar: tiene {citas_pendientes} citas pendientes")
        
        # En lugar de eliminar, cambiar estado a inactivo
        usuario.estado = 'inactivo'
        usuario.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"Usuario {usuario_id} desactivado exitosamente")
        
        return {"message": "Usuario desactivado exitosamente"}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error eliminando usuario {usuario_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error eliminando usuario: {str(e)}")
