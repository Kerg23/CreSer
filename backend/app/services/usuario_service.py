from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import logging

from app.dao.usuario_dao import UsuarioDAO
from app.models.usuario import Usuario
from app.dto.usuario_dto import UsuarioCreateDTO, UsuarioUpdateDTO, UsuarioResponseDTO
from app.utils.exceptions import BusinessException
from app.utils.security import get_password_hash

logger = logging.getLogger(__name__)

class UsuarioService:
    """Servicio para gestión de usuarios"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.usuario_dao = UsuarioDAO(db_session)
    
    def crear_usuario(self, usuario_dto: UsuarioCreateDTO) -> UsuarioResponseDTO:
        """Crear nuevo usuario"""
        try:
            # Verificar si el email ya existe
            if self.usuario_dao.get_by_email(usuario_dto.email):
                raise BusinessException("El email ya está registrado")
            
            # Crear usuario
            usuario = Usuario(
                nombre=usuario_dto.nombre,
                email=usuario_dto.email,
                telefono=usuario_dto.telefono,
                documento=usuario_dto.documento,
                password=get_password_hash(usuario_dto.password),
                tipo=usuario_dto.tipo,
                estado="activo",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            
            usuario_creado = self.usuario_dao.create(usuario)
            return UsuarioResponseDTO.model_validate(usuario_creado.to_dict())
            
        except BusinessException:
            raise
        except Exception as e:
            raise BusinessException(f"Error creando usuario: {str(e)}")
    
    def actualizar_usuario(self, usuario_id: int, usuario_dto: UsuarioUpdateDTO) -> UsuarioResponseDTO:
        """Actualizar usuario existente"""
        try:
            # Obtener usuario existente
            usuario = self.usuario_dao.get_by_id(usuario_id)
            if not usuario:
                raise BusinessException("Usuario no encontrado")
            
            # Verificar si el email ya existe en otro usuario
            if usuario_dto.email and usuario_dto.email != usuario.email:
                usuario_existente = self.usuario_dao.get_by_email(usuario_dto.email)
                if usuario_existente and usuario_existente.id != usuario_id:
                    raise BusinessException("El email ya está registrado por otro usuario")
            
            # Actualizar campos solo si están presentes en el DTO
            update_data = usuario_dto.dict(exclude_unset=True)
            
            for field, value in update_data.items():
                if hasattr(usuario, field):
                    setattr(usuario, field, value)
            
            # Actualizar timestamp
            usuario.updated_at = datetime.now(timezone.utc)
            
            # Guardar cambios
            self.db.commit()
            self.db.refresh(usuario)
            
            return UsuarioResponseDTO.model_validate(usuario.to_dict())
            
        except BusinessException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error actualizando usuario {usuario_id}: {e}")
            raise BusinessException(f"Error actualizando usuario: {str(e)}")
    
    def listar_usuarios(self, skip: int = 0, limit: int = 100) -> List[UsuarioResponseDTO]:
        """Listar usuarios"""
        try:
            usuarios = self.usuario_dao.get_all(skip, limit)
            return [UsuarioResponseDTO.model_validate(u.to_dict()) for u in usuarios]
        except Exception as e:
            raise BusinessException(f"Error listando usuarios: {str(e)}")
    
    def obtener_usuario_por_id(self, usuario_id: int) -> Optional[UsuarioResponseDTO]:
        """Obtener usuario por ID"""
        try:
            usuario = self.usuario_dao.get_by_id(usuario_id)
            if usuario:
                return UsuarioResponseDTO.model_validate(usuario.to_dict())
            return None
        except Exception as e:
            raise BusinessException(f"Error obteniendo usuario: {str(e)}")
    
    def obtener_usuario_por_email(self, email: str) -> Optional[UsuarioResponseDTO]:
        """Obtener usuario por email"""
        try:
            usuario = self.usuario_dao.get_by_email(email)
            if usuario:
                return UsuarioResponseDTO.model_validate(usuario.to_dict())
            return None
        except Exception as e:
            raise BusinessException(f"Error obteniendo usuario por email: {str(e)}")
    
    def eliminar_usuario(self, usuario_id: int) -> bool:
        """Eliminar usuario"""
        try:
            return self.usuario_dao.delete(usuario_id)
        except Exception as e:
            raise BusinessException(f"Error eliminando usuario: {str(e)}")
    
    def cambiar_estado_usuario(self, usuario_id: int, nuevo_estado: str) -> UsuarioResponseDTO:
        """Cambiar estado del usuario (activo, inactivo, suspendido)"""
        try:
            usuario = self.usuario_dao.get_by_id(usuario_id)
            if not usuario:
                raise BusinessException("Usuario no encontrado")
            
            estados_validos = ["activo", "inactivo", "suspendido"]
            if nuevo_estado not in estados_validos:
                raise BusinessException(f"Estado inválido. Estados válidos: {', '.join(estados_validos)}")
            
            usuario.estado = nuevo_estado
            usuario.updated_at = datetime.now(timezone.utc)
            
            self.db.commit()
            self.db.refresh(usuario)
            
            return UsuarioResponseDTO.model_validate(usuario.to_dict())
            
        except BusinessException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            raise BusinessException(f"Error cambiando estado del usuario: {str(e)}")
    
    def cambiar_password(self, usuario_id: int, nueva_password: str) -> bool:
        """Cambiar contraseña del usuario"""
        try:
            usuario = self.usuario_dao.get_by_id(usuario_id)
            if not usuario:
                raise BusinessException("Usuario no encontrado")
            
            usuario.password = get_password_hash(nueva_password)
            usuario.updated_at = datetime.now(timezone.utc)
            
            self.db.commit()
            return True
            
        except BusinessException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            raise BusinessException(f"Error cambiando contraseña: {str(e)}")
