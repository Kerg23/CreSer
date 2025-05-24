from typing import List, Optional
from sqlalchemy.orm import Session
from app.dao.usuario_dao import UsuarioDAO
from app.models.usuario import Usuario, TipoUsuario
from app.dto.usuario_dto import UsuarioResponseDTO
from app.utils.exceptions import BusinessException
from datetime import datetime

class UsuarioService:
    """Servicio para lógica de negocio de usuarios"""
    
    def __init__(self, db_session: Session):
        self.usuario_dao = UsuarioDAO(db_session)
    
    def obtener_usuario_por_id(self, usuario_id: int) -> Optional[UsuarioResponseDTO]:
        """Obtener usuario por ID"""
        usuario = self.usuario_dao.get_by_id(usuario_id)
        if usuario:
            return UsuarioResponseDTO.model_validate(usuario.to_dict())
        return None
    
    def obtener_usuario_por_email(self, email: str) -> Optional[Usuario]:
        """Obtener usuario por email (para autenticación)"""
        return self.usuario_dao.get_by_email(email)
    
    def listar_usuarios(self, skip: int = 0, limit: int = 100) -> List[UsuarioResponseDTO]:
        """Listar todos los usuarios"""
        usuarios = self.usuario_dao.get_all(skip, limit)
        return [UsuarioResponseDTO.model_validate(usuario.to_dict()) for usuario in usuarios]
