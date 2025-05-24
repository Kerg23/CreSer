from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import date, time, datetime, timezone, timedelta
from app.dao.cita_dao import CitaDAO
from app.dao.usuario_dao import UsuarioDAO
from app.models.cita import Cita
from app.models.credito import Credito
from app.models.servicio import Servicio
from app.models.usuario import Usuario
from app.dto.cita_dto import CitaCreateDTO, CitaResponseDTO, CitaUpdateDTO
from app.utils.exceptions import BusinessException

class CitaService:
    """Servicio para gestión de citas"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.cita_dao = CitaDAO(db_session)
        self.usuario_dao = UsuarioDAO(db_session)
    
    def agendar_cita(self, cita_dto: CitaCreateDTO, usuario_id: int) -> CitaResponseDTO:
        """Agendar nueva cita"""
        try:
            # Validar que el servicio existe
            servicio = self.db.query(Servicio).filter(Servicio.id == cita_dto.servicio_id).first()
            if not servicio:
                raise BusinessException("Servicio no encontrado")
            
            # Verificar disponibilidad del horario
            if not self.cita_dao.verificar_disponibilidad(cita_dto.fecha, cita_dto.hora):
                raise BusinessException("El horario seleccionado no está disponible")
            
            # Verificar que el usuario tenga créditos disponibles
            credito_disponible = self._obtener_credito_disponible(usuario_id, cita_dto.servicio_id)
            if not credito_disponible:
                raise BusinessException("No tienes créditos disponibles para este servicio")
            
            # Validar horarios de atención
            if not self._validar_horario_atencion(cita_dto.fecha, cita_dto.hora):
                raise BusinessException("Horario fuera del rango de atención (Lunes a Viernes, 8:00 AM - 6:00 PM)")
            
            # Validar que la fecha no sea en el pasado
            if cita_dto.fecha < date.today():
                raise BusinessException("No se pueden agendar citas en fechas pasadas")
            
            # Crear la cita
            cita = Cita(
                usuario_id=usuario_id,
                servicio_id=cita_dto.servicio_id,
                credito_id=credito_disponible.id,
                fecha=cita_dto.fecha,
                hora=cita_dto.hora,
                modalidad=cita_dto.modalidad,
                estado="agendada",
                comentarios_cliente=cita_dto.comentarios_cliente,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            
            # Consumir el crédito
            credito_disponible.cantidad_disponible -= 1
            if credito_disponible.cantidad_disponible == 0:
                credito_disponible.estado = "agotado"
            
            # Guardar en base de datos
            self.db.add(cita)
            self.db.commit()
            self.db.refresh(cita)
            
            return CitaResponseDTO.model_validate(cita.to_dict())
            
        except BusinessException:
            raise
        except Exception as e:
            self.db.rollback()
            raise BusinessException(f"Error agendando cita: {str(e)}")
    
    def obtener_citas_usuario(self, usuario_id: int) -> List[CitaResponseDTO]:
        """Obtener citas de un usuario"""
        citas = self.cita_dao.get_citas_by_usuario(usuario_id)
        return [CitaResponseDTO.model_validate(cita.to_dict()) for cita in citas]
    
    def obtener_horarios_disponibles(self, fecha: date, servicio_id: int) -> List[str]:
        """Obtener horarios disponibles para una fecha"""
        # Horarios base de atención (8:00 AM a 6:00 PM)
        horarios_base = [
            "08:00", "09:00", "10:00", "11:00", "12:00",
            "14:00", "15:00", "16:00", "17:00", "18:00"
        ]
        
        # Validar que sea día laboral
        if fecha.weekday() >= 5:  # Sábado y domingo
            return []
        
        # Validar que no sea fecha pasada
        if fecha < date.today():
            return []
        
        # Obtener citas ocupadas
        citas_ocupadas = self.cita_dao.get_citas_by_fecha(fecha)
        horarios_ocupados = [
            cita.hora.strftime("%H:%M") 
            for cita in citas_ocupadas 
            if cita.estado in ["agendada", "confirmada"]
        ]
        
        # Filtrar horarios disponibles
        horarios_disponibles = [h for h in horarios_base if h not in horarios_ocupados]
        return horarios_disponibles
    
    def listar_citas_admin(self, fecha: Optional[date] = None, estado: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[CitaResponseDTO]:
        """Listar citas con filtros para administradores"""
        try:
            query = self.db.query(Cita)
            
            if fecha:
                query = query.filter(Cita.fecha == fecha)
            if estado:
                query = query.filter(Cita.estado == estado)
            
            citas = query.order_by(Cita.fecha.desc(), Cita.hora.desc()).offset(skip).limit(limit).all()
            return [CitaResponseDTO.model_validate(cita.to_dict()) for cita in citas]
        except Exception as e:
            raise BusinessException(f"Error listando citas: {str(e)}")
    
    def cancelar_cita(self, cita_id: int, usuario_id: int, motivo: str, cancelada_por: str) -> CitaResponseDTO:
        """Cancelar cita y restaurar crédito"""
        try:
            cita = self.db.query(Cita).filter(Cita.id == cita_id).first()
            if not cita:
                raise BusinessException("Cita no encontrada")
            
            # Verificar permisos
            if cancelada_por == "cliente" and cita.usuario_id != usuario_id:
                raise BusinessException("No tienes permisos para cancelar esta cita")
            
            if cita.estado in ["completada", "cancelada"]:
                raise BusinessException("No se puede cancelar una cita completada o ya cancelada")
            
            # Validar tiempo mínimo para cancelación (24 horas antes)
            fecha_cita = datetime.combine(cita.fecha, cita.hora)
            tiempo_limite = fecha_cita - timedelta(hours=24)
            
            if datetime.now() > tiempo_limite and cancelada_por == "cliente":
                raise BusinessException("No se puede cancelar con menos de 24 horas de anticipación")
            
            # Restaurar crédito
            credito = self.db.query(Credito).filter(Credito.id == cita.credito_id).first()
            if credito:
                credito.cantidad_disponible += 1
                credito.estado = "activo"
            
            # Actualizar cita
            cita.estado = "cancelada"
            cita.motivo_cancelacion = motivo
            cita.cancelada_por = cancelada_por
            cita.updated_at = datetime.now(timezone.utc)
            
            self.db.commit()
            self.db.refresh(cita)
            
            return CitaResponseDTO.model_validate(cita.to_dict())
        except BusinessException:
            raise
        except Exception as e:
            self.db.rollback()
            raise BusinessException(f"Error cancelando cita: {str(e)}")
    
    def confirmar_cita(self, cita_id: int, notas: Optional[str] = None, link_virtual: Optional[str] = None) -> CitaResponseDTO:
        """Confirmar cita (admin)"""
        try:
            cita = self.db.query(Cita).filter(Cita.id == cita_id).first()
            if not cita:
                raise BusinessException("Cita no encontrada")
            
            if cita.estado != "agendada":
                raise BusinessException("Solo se pueden confirmar citas agendadas")
            
            cita.estado = "confirmada"
            if notas:
                cita.notas_psicologa = notas
            if link_virtual and cita.modalidad == "virtual":
                cita.link_virtual = link_virtual
            cita.updated_at = datetime.now(timezone.utc)
            
            self.db.commit()
            self.db.refresh(cita)
            
            return CitaResponseDTO.model_validate(cita.to_dict())
        except BusinessException:
            raise
        except Exception as e:
            self.db.rollback()
            raise BusinessException(f"Error confirmando cita: {str(e)}")
    
    def completar_cita(self, cita_id: int, notas_sesion: str) -> CitaResponseDTO:
        """Marcar cita como completada"""
        try:
            cita = self.db.query(Cita).filter(Cita.id == cita_id).first()
            if not cita:
                raise BusinessException("Cita no encontrada")
            
            if cita.estado not in ["agendada", "confirmada"]:
                raise BusinessException("Solo se pueden completar citas agendadas o confirmadas")
            
            cita.estado = "completada"
            cita.notas_psicologa = notas_sesion
            cita.updated_at = datetime.now(timezone.utc)
            
            self.db.commit()
            self.db.refresh(cita)
            
            return CitaResponseDTO.model_validate(cita.to_dict())
        except BusinessException:
            raise
        except Exception as e:
            self.db.rollback()
            raise BusinessException(f"Error completando cita: {str(e)}")
    
    def obtener_agenda_dia(self, fecha: date) -> dict:
        """Obtener agenda del día para la psicóloga"""
        try:
            citas = self.cita_dao.get_citas_by_fecha(fecha)
            
            agenda = []
            for cita in citas:
                usuario = self.usuario_dao.get_by_id(cita.usuario_id)
                servicio = self.db.query(Servicio).filter(Servicio.id == cita.servicio_id).first()
                
                agenda.append({
                    "id": cita.id,
                    "hora": cita.hora.strftime("%H:%M"),
                    "cliente": usuario.nombre if usuario else "Usuario no encontrado",
                    "telefono": usuario.telefono if usuario else "",
                    "servicio": servicio.nombre if servicio else "Servicio no encontrado",
                    "modalidad": cita.modalidad,
                    "estado": cita.estado,
                    "comentarios": cita.comentarios_cliente,
                    "notas": cita.notas_psicologa,
                    "link_virtual": cita.link_virtual
                })
            
            return {
                "fecha": fecha.isoformat(),
                "total_citas": len(agenda),
                "citas": sorted(agenda, key=lambda x: x["hora"])
            }
        except Exception as e:
            raise BusinessException(f"Error obteniendo agenda: {str(e)}")
    
    def obtener_estadisticas(self) -> dict:
        """Obtener estadísticas de citas"""
        try:
            total_citas = self.db.query(Cita).count()
            citas_agendadas = self.db.query(Cita).filter(Cita.estado == "agendada").count()
            citas_confirmadas = self.db.query(Cita).filter(Cita.estado == "confirmada").count()
            citas_completadas = self.db.query(Cita).filter(Cita.estado == "completada").count()
            citas_canceladas = self.db.query(Cita).filter(Cita.estado == "cancelada").count()
            citas_no_asistio = self.db.query(Cita).filter(Cita.estado == "no_asistio").count()
            
            # Estadísticas del mes actual
            hoy = date.today()
            inicio_mes = hoy.replace(day=1)
            citas_mes = self.db.query(Cita).filter(
                Cita.fecha >= inicio_mes,
                Cita.fecha <= hoy
            ).count()
            
            return {
                "total_citas": total_citas,
                "agendadas": citas_agendadas,
                "confirmadas": citas_confirmadas,
                "completadas": citas_completadas,
                "canceladas": citas_canceladas,
                "no_asistio": citas_no_asistio,
                "citas_mes_actual": citas_mes,
                "tasa_asistencia": round((citas_completadas / total_citas * 100), 2) if total_citas > 0 else 0,
                "tasa_cancelacion": round((citas_canceladas / total_citas * 100), 2) if total_citas > 0 else 0
            }
        except Exception as e:
            raise BusinessException(f"Error obteniendo estadísticas: {str(e)}")
    
    def _obtener_credito_disponible(self, usuario_id: int, servicio_id: int) -> Optional[Credito]:
        """Obtener crédito disponible para el servicio"""
        return self.db.query(Credito).filter(
            Credito.usuario_id == usuario_id,
            Credito.servicio_id == servicio_id,
            Credito.cantidad_disponible > 0,
            Credito.estado == "activo"
        ).first()
    
    def _validar_horario_atencion(self, fecha: date, hora: time) -> bool:
        """Validar que esté dentro del horario de atención"""
        # No atender sábados y domingos
        if fecha.weekday() >= 5:  # 5=sábado, 6=domingo
            return False
        
        # Horario de 8:00 AM a 6:00 PM
        hora_inicio = time(8, 0)
        hora_fin = time(18, 0)
        
        return hora_inicio <= hora <= hora_fin
