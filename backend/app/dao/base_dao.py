from abc import ABC, abstractmethod
from typing import List, Optional, TypeVar, Generic
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

T = TypeVar('T')

class BaseDAO(ABC, Generic[T]):
    """Clase base para todos los DAOs"""
    
    def __init__(self, db_session: Session, model_class):
        self.db = db_session
        self.model_class = model_class
    
    def create(self, entity: T) -> T:
        """Crear una nueva entidad"""
        try:
            self.db.add(entity)
            self.db.commit()
            self.db.refresh(entity)
            return entity
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Error creando entidad: {str(e)}")
    
    def get_by_id(self, entity_id: int) -> Optional[T]:
        """Obtener entidad por ID"""
        try:
            return self.db.query(self.model_class).filter(self.model_class.id == entity_id).first()
        except SQLAlchemyError as e:
            raise Exception(f"Error obteniendo entidad por ID: {str(e)}")
    
    def get_all(self, skip: int = 0, limit: int = 100) -> List[T]:
        """Obtener todas las entidades"""
        try:
            return self.db.query(self.model_class).offset(skip).limit(limit).all()
        except SQLAlchemyError as e:
            raise Exception(f"Error obteniendo todas las entidades: {str(e)}")
    
    def update(self, entity: T) -> T:
        """Actualizar entidad"""
        try:
            self.db.commit()
            self.db.refresh(entity)
            return entity
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Error actualizando entidad: {str(e)}")
    
    def delete(self, entity_id: int) -> bool:
        """Eliminar entidad"""
        try:
            entity = self.get_by_id(entity_id)
            if entity:
                self.db.delete(entity)
                self.db.commit()
                return True
            return False
        except SQLAlchemyError as e:
            self.db.rollback()
            raise Exception(f"Error eliminando entidad: {str(e)}")
