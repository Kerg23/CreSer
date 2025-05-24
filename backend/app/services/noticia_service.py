from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import re
import os
import uuid

from app.dao.noticia_dao import NoticiaDAO
from app.dao.usuario_dao import UsuarioDAO
from app.models.noticia import Noticia
from app.dto.noticia_dto import NoticiaCreateDTO, NoticiaUpdateDTO, NoticiaResponseDTO, NoticiaPublicaDTO
from app.utils.exceptions import BusinessException

class NoticiaService:
    """Servicio para gestión de noticias"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.noticia_dao = NoticiaDAO(db_session)
        self.usuario_dao = UsuarioDAO(db_session)
    
    def crear_noticia(self, noticia_dto: NoticiaCreateDTO, autor_id: int) -> NoticiaResponseDTO:
        """Crear nueva noticia"""
        try:
            # Generar slug único
            slug = self._generar_slug(noticia_dto.titulo)
            
            # Verificar que el slug no exista
            contador = 1
            slug_original = slug
            while self.noticia_dao.slug_exists(slug):
                slug = f"{slug_original}-{contador}"
                contador += 1
            
            # Crear noticia
            noticia = Noticia(
                titulo=noticia_dto.titulo,
                slug=slug,
                resumen=noticia_dto.resumen,
                contenido=noticia_dto.contenido,
                categoria=noticia_dto.categoria,
                imagen_portada=noticia_dto.imagen_portada,
                autor_id=autor_id,
                tags=noticia_dto.tags,
                meta_descripcion=noticia_dto.meta_descripcion or noticia_dto.resumen[:160],
                destacada=noticia_dto.destacada,
                estado="borrador",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            
            noticia_creada = self.noticia_dao.create(noticia)
            return NoticiaResponseDTO.model_validate(noticia_creada.to_dict())
            
        except Exception as e:
            raise BusinessException(f"Error creando noticia: {str(e)}")
    
    def publicar_noticia(self, noticia_id: int) -> NoticiaResponseDTO:
        """Publicar noticia (cambiar estado a publicada)"""
        try:
            noticia = self.noticia_dao.get_by_id(noticia_id)
            if not noticia:
                raise BusinessException("Noticia no encontrada")
            
            if noticia.estado == "publicada":
                raise BusinessException("La noticia ya está publicada")
            
            noticia.estado = "publicada"
            noticia.fecha_publicacion = datetime.now(timezone.utc)
            noticia.updated_at = datetime.now(timezone.utc)
            
            self.db.commit()
            self.db.refresh(noticia)
            
            return NoticiaResponseDTO.model_validate(noticia.to_dict())
            
        except BusinessException:
            raise
        except Exception as e:
            self.db.rollback()
            raise BusinessException(f"Error publicando noticia: {str(e)}")
    
    def obtener_noticias_publicas(self, categoria: Optional[str] = None, skip: int = 0, limit: int = 10) -> List[NoticiaPublicaDTO]:
        """Obtener noticias públicas"""
        try:
            if categoria:
                noticias = self.noticia_dao.get_by_categoria(categoria, skip, limit)
            else:
                noticias = self.noticia_dao.get_noticias_publicadas(skip, limit)
            
            return [NoticiaPublicaDTO.model_validate(noticia.to_dict()) for noticia in noticias]
        except Exception as e:
            raise BusinessException(f"Error obteniendo noticias públicas: {str(e)}")
    
    def obtener_noticia_por_slug(self, slug: str, incrementar_vista: bool = True) -> NoticiaResponseDTO:
        """Obtener noticia por slug"""
        try:
            noticia = self.noticia_dao.get_by_slug(slug)
            if not noticia:
                raise BusinessException("Noticia no encontrada")
            
            if noticia.estado != "publicada":
                raise BusinessException("Noticia no disponible")
            
            # Incrementar vistas si se solicita
            if incrementar_vista:
                self.noticia_dao.incrementar_vistas(noticia.id)
                noticia.vistas += 1  # Actualizar el objeto en memoria
            
            return NoticiaResponseDTO.model_validate(noticia.to_dict())
            
        except BusinessException:
            raise
        except Exception as e:
            raise BusinessException(f"Error obteniendo noticia: {str(e)}")
    
    def obtener_noticias_destacadas(self, limit: int = 5) -> List[NoticiaPublicaDTO]:
        """Obtener noticias destacadas"""
        try:
            noticias = self.noticia_dao.get_noticias_destacadas(limit)
            return [NoticiaPublicaDTO.model_validate(noticia.to_dict()) for noticia in noticias]
        except Exception as e:
            raise BusinessException(f"Error obteniendo noticias destacadas: {str(e)}")
    
    def buscar_noticias(self, termino: str, skip: int = 0, limit: int = 10) -> List[NoticiaPublicaDTO]:
        """Buscar noticias"""
        try:
            noticias = self.noticia_dao.buscar_noticias(termino, skip, limit)
            return [NoticiaPublicaDTO.model_validate(noticia.to_dict()) for noticia in noticias]
        except Exception as e:
            raise BusinessException(f"Error buscando noticias: {str(e)}")
    
    def listar_noticias_admin(self, estado: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[NoticiaResponseDTO]:
        """Listar noticias para administrador"""
        try:
            if estado:
                noticias = self.db.query(Noticia).filter(Noticia.estado == estado).order_by(Noticia.created_at.desc()).offset(skip).limit(limit).all()
            else:
                noticias = self.db.query(Noticia).order_by(Noticia.created_at.desc()).offset(skip).limit(limit).all()
            
            return [NoticiaResponseDTO.model_validate(noticia.to_dict()) for noticia in noticias]
        except Exception as e:
            raise BusinessException(f"Error listando noticias: {str(e)}")
    
    def actualizar_noticia(self, noticia_id: int, noticia_dto: NoticiaUpdateDTO) -> NoticiaResponseDTO:
        """Actualizar noticia"""
        try:
            noticia = self.noticia_dao.get_by_id(noticia_id)
            if not noticia:
                raise BusinessException("Noticia no encontrada")
            
            # Actualizar campos si se proporcionan
            if noticia_dto.titulo is not None:
                noticia.titulo = noticia_dto.titulo
                # Regenerar slug si cambió el título
                nuevo_slug = self._generar_slug(noticia_dto.titulo)
                if nuevo_slug != noticia.slug and not self.noticia_dao.slug_exists(nuevo_slug, noticia.id):
                    noticia.slug = nuevo_slug
            
            if noticia_dto.resumen is not None:
                noticia.resumen = noticia_dto.resumen
            if noticia_dto.contenido is not None:
                noticia.contenido = noticia_dto.contenido
            if noticia_dto.categoria is not None:
                noticia.categoria = noticia_dto.categoria
            if noticia_dto.imagen_portada is not None:
                noticia.imagen_portada = noticia_dto.imagen_portada
            if noticia_dto.tags is not None:
                noticia.tags = noticia_dto.tags
            if noticia_dto.meta_descripcion is not None:
                noticia.meta_descripcion = noticia_dto.meta_descripcion
            if noticia_dto.destacada is not None:
                noticia.destacada = noticia_dto.destacada
            
            noticia.updated_at = datetime.now(timezone.utc)
            
            self.db.commit()
            self.db.refresh(noticia)
            
            return NoticiaResponseDTO.model_validate(noticia.to_dict())
            
        except BusinessException:
            raise
        except Exception as e:
            self.db.rollback()
            raise BusinessException(f"Error actualizando noticia: {str(e)}")
    
    def eliminar_noticia(self, noticia_id: int) -> bool:
        """Eliminar noticia"""
        try:
            return self.noticia_dao.delete(noticia_id)
        except Exception as e:
            raise BusinessException(f"Error eliminando noticia: {str(e)}")
    
    def obtener_estadisticas(self) -> dict:
        """Obtener estadísticas de noticias"""
        try:
            total_noticias = self.db.query(Noticia).count()
            publicadas = self.db.query(Noticia).filter(Noticia.estado == "publicada").count()
            borradores = self.db.query(Noticia).filter(Noticia.estado == "borrador").count()
            destacadas = self.db.query(Noticia).filter(Noticia.destacada == True).count()
            
            # Top 5 noticias más vistas
            mas_vistas = self.db.query(Noticia).filter(
                Noticia.estado == "publicada"
            ).order_by(Noticia.vistas.desc()).limit(5).all()
            
            return {
                "total_noticias": total_noticias,
                "publicadas": publicadas,
                "borradores": borradores,
                "destacadas": destacadas,
                "mas_vistas": [
                    {
                        "id": noticia.id,
                        "titulo": noticia.titulo,
                        "vistas": noticia.vistas,
                        "slug": noticia.slug
                    }
                    for noticia in mas_vistas
                ]
            }
        except Exception as e:
            raise BusinessException(f"Error obteniendo estadísticas: {str(e)}")
    
    def _generar_slug(self, titulo: str) -> str:
        """Generar slug a partir del título"""
        # Convertir a minúsculas y reemplazar caracteres especiales
        slug = titulo.lower()
        slug = re.sub(r'[áàäâ]', 'a', slug)
        slug = re.sub(r'[éèëê]', 'e', slug)
        slug = re.sub(r'[íìïî]', 'i', slug)
        slug = re.sub(r'[óòöô]', 'o', slug)
        slug = re.sub(r'[úùüû]', 'u', slug)
        slug = re.sub(r'[ñ]', 'n', slug)
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)
        slug = re.sub(r'[\s_-]+', '-', slug)
        slug = slug.strip('-')
        
        return slug[:100]  # Limitar longitud
