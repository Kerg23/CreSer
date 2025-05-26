from typing import Optional, List
from sqlalchemy.orm import Session
from app.dao.base_dao import BaseDAO
from app.models.usuario import Usuario

class UsuarioDAO(BaseDAO[Usuario]):
    """DAO para gestión de usuarios"""
    
    def __init__(self, db_session: Session):
        super().__init__(db_session, Usuario)
    
    def get_by_email(self, email: str) -> Optional[Usuario]:
        """Obtener usuario por email"""
        try:
            return self.db.query(Usuario).filter(Usuario.email == email).first()
        except Exception as e:
            raise Exception(f"Error obteniendo usuario por email: {str(e)}")
    
    def email_exists(self, email: str, exclude_id: Optional[int] = None) -> bool:
        """Verificar si el email ya existe"""
        try:
            query = self.db.query(Usuario).filter(Usuario.email == email)
            if exclude_id:
                query = query.filter(Usuario.id != exclude_id)
            return query.first() is not None
        except Exception as e:
            raise Exception(f"Error verificando email existente: {str(e)}")
    
    def documento_exists(self, documento: str, exclude_id: Optional[int] = None) -> bool:
        """Verificar si el documento ya existe"""
        try:
            query = self.db.query(Usuario).filter(Usuario.documento == documento)
            if exclude_id:
                query = query.filter(Usuario.id != exclude_id)
            return query.first() is not None
        except Exception as e:
            raise Exception(f"Error verificando documento existente: {str(e)}")
