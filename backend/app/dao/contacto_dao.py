from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from app.dao.base_dao import BaseDAO
from app.models.contacto import Contacto

class ContactoDAO(BaseDAO[Contacto]):
    """DAO para gestión de contactos"""
    
    def __init__(self, db_session: Session):
        super().__init__(db_session, Contacto)
    
    def get_contactos_pendientes(self, skip: int = 0, limit: int = 50) -> List[Contacto]:
        """Obtener contactos pendientes"""
        try:
            return self.db.query(Contacto).filter(
                Contacto.estado == "pendiente"
            ).order_by(desc(Contacto.created_at)).offset(skip).limit(limit).all()
        except Exception as e:
            raise Exception(f"Error obteniendo contactos pendientes: {str(e)}")
    
    def get_contactos_no_leidos(self) -> List[Contacto]:
        """Obtener contactos no leídos"""
        try:
            return self.db.query(Contacto).filter(
                Contacto.leido == False
            ).order_by(desc(Contacto.created_at)).all()
        except Exception as e:
            raise Exception(f"Error obteniendo contactos no leídos: {str(e)}")
    
    def get_by_tipo_consulta(self, tipo: str, skip: int = 0, limit: int = 50) -> List[Contacto]:
        """Obtener contactos por tipo de consulta"""
        try:
            return self.db.query(Contacto).filter(
                Contacto.tipo_consulta == tipo
            ).order_by(desc(Contacto.created_at)).offset(skip).limit(limit).all()
        except Exception as e:
            raise Exception(f"Error obteniendo contactos por tipo: {str(e)}")
    
    def get_by_estado(self, estado: str, skip: int = 0, limit: int = 50) -> List[Contacto]:
        """Obtener contactos por estado"""
        try:
            return self.db.query(Contacto).filter(
                Contacto.estado == estado
            ).order_by(desc(Contacto.created_at)).offset(skip).limit(limit).all()
        except Exception as e:
            raise Exception(f"Error obteniendo contactos por estado: {str(e)}")
    
    def marcar_como_leido(self, contacto_id: int) -> bool:
        """Marcar contacto como leído"""
        try:
            contacto = self.get_by_id(contacto_id)
            if contacto:
                contacto.leido = True
                self.db.commit()
                return True
            return False
        except Exception as e:
            raise Exception(f"Error marcando como leído: {str(e)}")
    
    def buscar_contactos(self, termino: str, skip: int = 0, limit: int = 50) -> List[Contacto]:
        """Buscar contactos por término"""
        try:
            return self.db.query(Contacto).filter(
                Contacto.nombre.contains(termino) | 
                Contacto.email.contains(termino) |
                Contacto.asunto.contains(termino) |
                Contacto.mensaje.contains(termino)
            ).order_by(desc(Contacto.created_at)).offset(skip).limit(limit).all()
        except Exception as e:
            raise Exception(f"Error buscando contactos: {str(e)}")
    
    def contar_por_estado(self) -> dict:
        """Contar contactos por estado"""
        try:
            pendientes = self.db.query(Contacto).filter(Contacto.estado == "pendiente").count()
            respondidos = self.db.query(Contacto).filter(Contacto.estado == "respondido").count()
            archivados = self.db.query(Contacto).filter(Contacto.estado == "archivado").count()
            no_leidos = self.db.query(Contacto).filter(Contacto.leido == False).count()
            
            return {
                "pendientes": pendientes,
                "respondidos": respondidos,
                "archivados": archivados,
                "no_leidos": no_leidos,
                "total": pendientes + respondidos + archivados
            }
        except Exception as e:
            raise Exception(f"Error contando contactos: {str(e)}")
