from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class NoticiaCreateDTO(BaseModel):
    """DTO para crear noticia"""
    titulo: str = Field(..., min_length=5, max_length=255)
    resumen: str = Field(..., min_length=10, max_length=500)
    contenido: str = Field(..., min_length=50)
    categoria: str = Field(..., pattern="^(salud_mental|tips|eventos|testimonios)$")
    imagen_portada: Optional[str] = None
    tags: Optional[str] = Field(None, max_length=500, description="Tags separados por comas")
    meta_descripcion: Optional[str] = Field(None, max_length=160)
    destacada: Optional[bool] = False

class NoticiaUpdateDTO(BaseModel):
    """DTO para actualizar noticia"""
    titulo: Optional[str] = Field(None, min_length=5, max_length=255)
    resumen: Optional[str] = Field(None, min_length=10, max_length=500)
    contenido: Optional[str] = Field(None, min_length=50)
    categoria: Optional[str] = Field(None, pattern="^(salud_mental|tips|eventos|testimonios)$")
    imagen_portada: Optional[str] = None
    tags: Optional[str] = Field(None, max_length=500)
    meta_descripcion: Optional[str] = Field(None, max_length=160)
    destacada: Optional[bool] = None

class NoticiaResponseDTO(BaseModel):
    """DTO para respuesta de noticia"""
    id: int
    titulo: str
    slug: str
    resumen: str
    contenido: str
    imagen_portada: Optional[str]
    categoria: str
    estado: str
    autor_id: int
    fecha_publicacion: Optional[str]
    vistas: int
    destacada: bool
    tags: List[str]
    meta_descripcion: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True

class NoticiaPublicaDTO(BaseModel):
    """DTO para noticias públicas (sin contenido completo)"""
    id: int
    titulo: str
    slug: str
    resumen: str
    imagen_portada: Optional[str]
    categoria: str
    fecha_publicacion: Optional[str]
    vistas: int
    destacada: bool
    tags: List[str]
    created_at: Optional[str]

    class Config:
        from_attributes = True
