from typing import Optional, List
from sqlalchemy.orm import Session
from datetime import date, time
from app.dao.base_dao import BaseDAO
from app.models.cita import Cita

class CitaDAO(BaseDAO[Cita]):
    """DAO para gestión de citas"""
    
    def __init__(self, db_session: Session):
        super().__init__(db_session, Cita)
    
    def get_citas_by_usuario(self, usuario_id: int) -> List[Cita]:
        """Obtener citas de un usuario"""
        try:
            return self.db.query(Cita).filter(
                Cita.usuario_id == usuario_id
            ).order_by(Cita.fecha.desc(), Cita.hora.desc()).all()
        except Exception as e:
            raise Exception(f"Error obteniendo citas del usuario: {str(e)}")
    
    def get_citas_by_fecha(self, fecha: date) -> List[Cita]:
        """Obtener citas de una fecha específica"""
        try:
            return self.db.query(Cita).filter(
                Cita.fecha == fecha
            ).order_by(Cita.hora).all()
        except Exception as e:
            raise Exception(f"Error obteniendo citas por fecha: {str(e)}")
    
    def verificar_disponibilidad(self, fecha: date, hora: time) -> bool:
        """Verificar si un horario está disponible"""
        try:
            cita_existente = self.db.query(Cita).filter(
                Cita.fecha == fecha,
                Cita.hora == hora,
                Cita.estado.in_(["agendada", "confirmada"])
            ).first()
            return cita_existente is None
        except Exception as e:
            raise Exception(f"Error verificando disponibilidad: {str(e)}")
    
    def get_citas_pendientes(self) -> List[Cita]:
        """Obtener citas pendientes de confirmación"""
        try:
            return self.db.query(Cita).filter(
                Cita.estado == "agendada"
            ).order_by(Cita.fecha, Cita.hora).all()
        except Exception as e:
            raise Exception(f"Error obteniendo citas pendientes: {str(e)}")
    
    def get_citas_by_estado(self, estado: str) -> List[Cita]:
        """Obtener citas por estado"""
        try:
            return self.db.query(Cita).filter(
                Cita.estado == estado
            ).order_by(Cita.fecha.desc(), Cita.hora.desc()).all()
        except Exception as e:
            raise Exception(f"Error obteniendo citas por estado: {str(e)}")
    
    def get_citas_by_fecha_range(self, fecha_inicio: date, fecha_fin: date) -> List[Cita]:
        """Obtener citas en un rango de fechas"""
        try:
            return self.db.query(Cita).filter(
                Cita.fecha >= fecha_inicio,
                Cita.fecha <= fecha_fin
            ).order_by(Cita.fecha, Cita.hora).all()
        except Exception as e:
            raise Exception(f"Error obteniendo citas por rango: {str(e)}")
