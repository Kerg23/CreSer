from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.config.database import Base
from datetime import datetime, timezone

class Noticia(Base):
    __tablename__ = "noticias"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True)
    titulo = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    resumen = Column(Text, nullable=False)
    contenido = Column(Text, nullable=False)
    imagen_portada = Column(String(500), nullable=True)
    categoria = Column(String(50), nullable=False)  # salud_mental, tips, eventos, testimonios
    estado = Column(String(20), default="borrador")  # borrador, publicada, archivada
    autor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha_publicacion = Column(DateTime, nullable=True)
    vistas = Column(Integer, default=0)
    destacada = Column(Boolean, default=False)
    tags = Column(String(500), nullable=True)  # Separados por comas
    meta_descripcion = Column(String(160), nullable=True)  # Para SEO
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict:
        """Convertir a diccionario"""
        return {
            "id": self.id,
            "titulo": self.titulo,
            "slug": self.slug,
            "resumen": self.resumen,
            "contenido": self.contenido,
            "imagen_portada": self.imagen_portada,
            "categoria": self.categoria,
            "estado": self.estado,
            "autor_id": self.autor_id,
            "fecha_publicacion": self.fecha_publicacion.isoformat() if self.fecha_publicacion else None,
            "vistas": self.vistas,
            "destacada": self.destacada,
            "tags": self.tags.split(",") if self.tags else [],
            "meta_descripcion": self.meta_descripcion,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
