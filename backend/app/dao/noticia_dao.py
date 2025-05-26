from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from app.dao.base_dao import BaseDAO
from app.models.noticia import Noticia

class NoticiaDAO(BaseDAO[Noticia]):
    """DAO para gestión de noticias"""
    
    def __init__(self, db_session: Session):
        super().__init__(db_session, Noticia)
    
    def get_noticias_publicadas(self, skip: int = 0, limit: int = 10) -> List[Noticia]:
        """Obtener noticias publicadas ordenadas por fecha"""
        try:
            return self.db.query(Noticia).filter(
                Noticia.estado == "publicada"
            ).order_by(desc(Noticia.fecha_publicacion)).offset(skip).limit(limit).all()
        except Exception as e:
            raise Exception(f"Error obteniendo noticias publicadas: {str(e)}")
    
    def get_noticias_destacadas(self, limit: int = 5) -> List[Noticia]:
        """Obtener noticias destacadas"""
        try:
            return self.db.query(Noticia).filter(
                Noticia.estado == "publicada",
                Noticia.destacada == True
            ).order_by(desc(Noticia.fecha_publicacion)).limit(limit).all()
        except Exception as e:
            raise Exception(f"Error obteniendo noticias destacadas: {str(e)}")
    
    def get_by_slug(self, slug: str) -> Optional[Noticia]:
        """Obtener noticia por slug"""
        try:
            return self.db.query(Noticia).filter(Noticia.slug == slug).first()
        except Exception as e:
            raise Exception(f"Error obteniendo noticia por slug: {str(e)}")
    
    def get_by_categoria(self, categoria: str, skip: int = 0, limit: int = 10) -> List[Noticia]:
        """Obtener noticias por categoría"""
        try:
            return self.db.query(Noticia).filter(
                Noticia.categoria == categoria,
                Noticia.estado == "publicada"
            ).order_by(desc(Noticia.fecha_publicacion)).offset(skip).limit(limit).all()
        except Exception as e:
            raise Exception(f"Error obteniendo noticias por categoría: {str(e)}")
    
    def buscar_noticias(self, termino: str, skip: int = 0, limit: int = 10) -> List[Noticia]:
        """Buscar noticias por término"""
        try:
            return self.db.query(Noticia).filter(
                Noticia.estado == "publicada"
            ).filter(
                Noticia.titulo.contains(termino) | 
                Noticia.resumen.contains(termino) |
                Noticia.contenido.contains(termino) |
                Noticia.tags.contains(termino)
            ).order_by(desc(Noticia.fecha_publicacion)).offset(skip).limit(limit).all()
        except Exception as e:
            raise Exception(f"Error buscando noticias: {str(e)}")
    
    def incrementar_vistas(self, noticia_id: int) -> bool:
        """Incrementar contador de vistas"""
        try:
            noticia = self.get_by_id(noticia_id)
            if noticia:
                noticia.vistas += 1
                self.db.commit()
                return True
            return False
        except Exception as e:
            raise Exception(f"Error incrementando vistas: {str(e)}")
    
    def slug_exists(self, slug: str, exclude_id: Optional[int] = None) -> bool:
        """Verificar si el slug ya existe"""
        try:
            query = self.db.query(Noticia).filter(Noticia.slug == slug)
            if exclude_id:
                query = query.filter(Noticia.id != exclude_id)
            return query.first() is not None
        except Exception as e:
            raise Exception(f"Error verificando slug existente: {str(e)}")
