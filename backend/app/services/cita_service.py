from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone, date, time
import logging

from app.dao.cita_dao import CitaDAO
from app.models.cita import Cita
from app.models.usuario import Usuario
from app.models.servicio import Servicio
from app.dto.cita_dto import CitaCreateDTO, CitaResponseDTO
from app.utils.exceptions import BusinessException

logger = logging.getLogger(__name__)

class CitaService:
    """Servicio simplificado para MVP"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.cita_dao = CitaDAO(db_session)
    
    def agendar_cita_admin(self, cita_dto: CitaCreateDTO, admin_id: int) -> CitaResponseDTO:
        """Versión MVP: Agendar cita sin validar créditos"""
        try:
            logger.info(f"Admin {admin_id} agendando cita para usuario {cita_dto.usuario_id}")
            
            # Verificar disponibilidad básica
            if not self._verificar_disponibilidad_horario(cita_dto.fecha, cita_dto.hora):
                raise BusinessException("El horario seleccionado no está disponible")
            
            # CREAR CITA SIMPLE PARA MVP (sin credito_id)
            cita = Cita(
                usuario_id=cita_dto.usuario_id,
                servicio_id=cita_dto.servicio_id,
                credito_id=None,  # NULL para MVP
                fecha=cita_dto.fecha,
                hora=cita_dto.hora,
                modalidad=cita_dto.modalidad,
                estado=getattr(cita_dto, 'estado', 'agendada'),
                comentarios_cliente=getattr(cita_dto, 'comentarios_cliente', None),
                comentarios_admin=getattr(cita_dto, 'comentarios_admin', f"Cita MVP por admin {admin_id}"),
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            
            cita_creada = self.cita_dao.create(cita)
            
            self.db.commit()
            self.db.refresh(cita_creada)
            
            logger.info(f"Cita MVP {cita_creada.id} creada exitosamente")
            
            return CitaResponseDTO.model_validate(cita_creada.to_dict())
            
        except BusinessException:
            self.db.rollback()
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error MVP agendando cita: {e}")
            raise BusinessException(f"Error agendando cita MVP: {str(e)}")
    
    def _verificar_disponibilidad_horario(self, fecha: date, hora: time) -> bool:
        """Verificación básica para MVP"""
        try:
            cita_existente = self.db.query(Cita).filter(
                Cita.fecha == fecha,
                Cita.hora == hora,
                Cita.estado.in_(["agendada", "confirmada"])
            ).first()
            
            return cita_existente is None
            
        except Exception as e:
            logger.error(f"Error verificando disponibilidad MVP: {e}")
            return True  # Para MVP, permitir en caso de error
    
    def obtener_citas_usuario(self, usuario_id: int) -> List[CitaResponseDTO]:
        """Versión MVP simplificada"""
        try:
            citas = self.cita_dao.get_by_usuario(usuario_id)
            return [CitaResponseDTO.model_validate(c.to_dict()) for c in citas]
        except Exception as e:
            logger.error(f"Error MVP obteniendo citas: {e}")
            return []  # Retornar lista vacía en caso de error para MVP
    
    def listar_citas_admin(self, usuario_id: int = None, fecha: str = None, periodo: str = None, estado: str = None, skip: int = 0, limit: int = 100) -> List[CitaResponseDTO]:
        """Versión MVP simplificada"""
        try:
            query = self.db.query(Cita)
            
            if usuario_id:
                query = query.filter(Cita.usuario_id == usuario_id)
            
            if fecha:
                query = query.filter(Cita.fecha == fecha)
            
            if estado:
                query = query.filter(Cita.estado == estado)
            
            if periodo == "hoy":
                query = query.filter(Cita.fecha == date.today())
            
            citas = query.order_by(Cita.fecha.desc(), Cita.hora.desc()).offset(skip).limit(limit).all()
            return [CitaResponseDTO.model_validate(c.to_dict()) for c in citas]
            
        except Exception as e:
            logger.error(f"Error MVP listando citas: {e}")
            return []  # Retornar lista vacía para MVP
