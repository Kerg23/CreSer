from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from fastapi import Request

from app.dao.contacto_dao import ContactoDAO
from app.dao.usuario_dao import UsuarioDAO
from app.models.contacto import Contacto
from app.dto.contacto_dto import ContactoCreateDTO, ContactoUpdateDTO, ContactoResponseDTO, ContactoPublicoDTO
from app.utils.exceptions import BusinessException

class ContactoService:
    """Servicio para gestión de contactos"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.contacto_dao = ContactoDAO(db_session)
        self.usuario_dao = UsuarioDAO(db_session)
    
    def crear_contacto(self, contacto_dto: ContactoCreateDTO, request: Request = None) -> ContactoPublicoDTO:
        """Crear nuevo mensaje de contacto"""
        try:
            # Obtener información de la request para tracking básico
            ip_origen = None
            user_agent = None
            
            if request:
                ip_origen = request.client.host if request.client else None
                user_agent = request.headers.get("user-agent", "")[:500]
            
            # Crear contacto
            contacto = Contacto(
                nombre=contacto_dto.nombre,
                email=contacto_dto.email,
                telefono=contacto_dto.telefono,
                asunto=contacto_dto.asunto,
                mensaje=contacto_dto.mensaje,
                tipo_consulta=contacto_dto.tipo_consulta,
                estado="pendiente",
                ip_origen=ip_origen,
                user_agent=user_agent,
                leido=False,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            
            contacto_creado = self.contacto_dao.create(contacto)
            
            # TODO: Enviar notificación por email al admin
            # self._enviar_notificacion_admin(contacto_creado)
            
            # TODO: Enviar email de confirmación al usuario
            # self._enviar_confirmacion_usuario(contacto_creado)
            
            return ContactoPublicoDTO.model_validate(contacto_creado.to_dict())
            
        except Exception as e:
            raise BusinessException(f"Error creando contacto: {str(e)}")
    
    def listar_contactos_admin(self, estado: Optional[str] = None, tipo: Optional[str] = None, skip: int = 0, limit: int = 50) -> List[ContactoResponseDTO]:
        """Listar contactos para administrador"""
        try:
            if estado:
                contactos = self.contacto_dao.get_by_estado(estado, skip, limit)
            elif tipo:
                contactos = self.contacto_dao.get_by_tipo_consulta(tipo, skip, limit)
            else:
                contactos = self.contacto_dao.get_all(skip, limit)
            
            return [ContactoResponseDTO.model_validate(contacto.to_dict()) for contacto in contactos]
        except Exception as e:
            raise BusinessException(f"Error listando contactos: {str(e)}")
    
    def obtener_contacto_por_id(self, contacto_id: int, marcar_leido: bool = True) -> ContactoResponseDTO:
        """Obtener contacto por ID"""
        try:
            contacto = self.contacto_dao.get_by_id(contacto_id)
            if not contacto:
                raise BusinessException("Contacto no encontrado")
            
            # Marcar como leído si se solicita
            if marcar_leido and not contacto.leido:
                self.contacto_dao.marcar_como_leido(contacto_id)
                contacto.leido = True
            
            return ContactoResponseDTO.model_validate(contacto.to_dict())
            
        except BusinessException:
            raise
        except Exception as e:
            raise BusinessException(f"Error obteniendo contacto: {str(e)}")
    
    def actualizar_contacto(self, contacto_id: int, contacto_dto: ContactoUpdateDTO, admin_id: int) -> ContactoResponseDTO:
        """Actualizar contacto (admin)"""
        try:
            contacto = self.contacto_dao.get_by_id(contacto_id)
            if not contacto:
                raise BusinessException("Contacto no encontrado")
            
            # Actualizar campos si se proporcionan
            if contacto_dto.estado is not None:
                contacto.estado = contacto_dto.estado
                if contacto_dto.estado == "respondido":
                    contacto.fecha_respuesta = datetime.now(timezone.utc)
                    contacto.respondido_por = admin_id
            
            if contacto_dto.notas_internas is not None:
                contacto.notas_internas = contacto_dto.notas_internas
            
            if contacto_dto.leido is not None:
                contacto.leido = contacto_dto.leido
            
            contacto.updated_at = datetime.now(timezone.utc)
            
            self.db.commit()
            self.db.refresh(contacto)
            
            return ContactoResponseDTO.model_validate(contacto.to_dict())
            
        except BusinessException:
            raise
        except Exception as e:
            self.db.rollback()
            raise BusinessException(f"Error actualizando contacto: {str(e)}")
    
    def obtener_contactos_pendientes(self, skip: int = 0, limit: int = 50) -> List[ContactoResponseDTO]:
        """Obtener contactos pendientes"""
        try:
            contactos = self.contacto_dao.get_contactos_pendientes(skip, limit)
            return [ContactoResponseDTO.model_validate(contacto.to_dict()) for contacto in contactos]
        except Exception as e:
            raise BusinessException(f"Error obteniendo contactos pendientes: {str(e)}")
    
    def obtener_contactos_no_leidos(self) -> List[ContactoResponseDTO]:
        """Obtener contactos no leídos"""
        try:
            contactos = self.contacto_dao.get_contactos_no_leidos()
            return [ContactoResponseDTO.model_validate(contacto.to_dict()) for contacto in contactos]
        except Exception as e:
            raise BusinessException(f"Error obteniendo contactos no leídos: {str(e)}")
    
    def buscar_contactos(self, termino: str, skip: int = 0, limit: int = 50) -> List[ContactoResponseDTO]:
        """Buscar contactos"""
        try:
            contactos = self.contacto_dao.buscar_contactos(termino, skip, limit)
            return [ContactoResponseDTO.model_validate(contacto.to_dict()) for contacto in contactos]
        except Exception as e:
            raise BusinessException(f"Error buscando contactos: {str(e)}")
    
    def eliminar_contacto(self, contacto_id: int) -> bool:
        """Eliminar contacto"""
        try:
            return self.contacto_dao.delete(contacto_id)
        except Exception as e:
            raise BusinessException(f"Error eliminando contacto: {str(e)}")
    
    def obtener_estadisticas(self) -> dict:
        """Obtener estadísticas de contactos"""
        try:
            conteos = self.contacto_dao.contar_por_estado()
            
            # Contactos por tipo de consulta
            tipos = ["informacion", "cita", "emergencia", "sugerencia"]
            por_tipo = {}
            for tipo in tipos:
                por_tipo[tipo] = self.db.query(Contacto).filter(Contacto.tipo_consulta == tipo).count()
            
            # Contactos del mes actual
            hoy = datetime.now(timezone.utc)
            inicio_mes = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            contactos_mes = self.db.query(Contacto).filter(
                Contacto.created_at >= inicio_mes
            ).count()
            
            return {
                **conteos,
                "por_tipo": por_tipo,
                "contactos_mes_actual": contactos_mes,
                "tasa_respuesta": round((conteos["respondidos"] / conteos["total"] * 100), 2) if conteos["total"] > 0 else 0
            }
        except Exception as e:
            raise BusinessException(f"Error obteniendo estadísticas: {str(e)}")
    
    def _enviar_notificacion_admin(self, contacto: Contacto):
        """Enviar notificación por email al admin (TODO)"""
        # Implementar envío de email
        pass
    
    def _enviar_confirmacion_usuario(self, contacto: Contacto):
        """Enviar email de confirmación al usuario (TODO)"""
        # Implementar envío de email de confirmación
        pass
