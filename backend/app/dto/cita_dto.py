from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, time

class CitaCreateDTO(BaseModel):
    """DTO para crear nueva cita"""
    servicio_id: int = Field(..., description="ID del servicio")
    fecha: date = Field(..., description="Fecha de la cita (YYYY-MM-DD)")
    hora: time = Field(..., description="Hora de la cita (HH:MM)")
    modalidad: str = Field(..., pattern="^(presencial|virtual)$", description="Modalidad de la cita")
    comentarios_cliente: Optional[str] = Field(None, max_length=500, description="Comentarios del cliente")

class CitaResponseDTO(BaseModel):
    """DTO para respuesta de cita"""
    id: int
    usuario_id: int
    servicio_id: int
    credito_id: int
    fecha: str
    hora: str
    modalidad: str
    estado: str
    comentarios_cliente: Optional[str]
    notas_psicologa: Optional[str]
    link_virtual: Optional[str]
    motivo_cancelacion: Optional[str]
    cancelada_por: Optional[str]
    recordatorio_enviado: Optional[int]
    fecha_recordatorio: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True

class CitaUpdateDTO(BaseModel):
    """DTO para actualizar cita"""
    estado: Optional[str] = Field(None, pattern="^(agendada|confirmada|completada|cancelada|no_asistio)$")
    notas_psicologa: Optional[str] = Field(None, max_length=500)
    link_virtual: Optional[str] = Field(None, max_length=500)
    motivo_cancelacion: Optional[str] = Field(None, max_length=500)

class HorarioDisponibleDTO(BaseModel):
    """DTO para horarios disponibles"""
    fecha: str
    servicio_id: int
    horarios_disponibles: list[str]

class AgendaDiaDTO(BaseModel):
    """DTO para agenda del día"""
    fecha: str
    total_citas: int
    citas: list[dict]
