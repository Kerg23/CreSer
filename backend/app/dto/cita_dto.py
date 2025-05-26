from pydantic import BaseModel, Field
from datetime import date, time, datetime
from typing import Optional

class CitaCreateDTO(BaseModel):
    usuario_id: Optional[int] = Field(None, description="ID del usuario (requerido para admins)")
    servicio_id: int = Field(..., description="ID del servicio")
    fecha: date = Field(..., description="Fecha de la cita")
    hora: time = Field(..., description="Hora de la cita")
    modalidad: str = Field(..., description="Modalidad: presencial o virtual")
    comentarios_cliente: Optional[str] = Field(None, description="Comentarios del cliente")
    comentarios_admin: Optional[str] = Field(None, description="Comentarios del administrador")
    estado: Optional[str] = Field("agendada", description="Estado inicial de la cita")

    class Config:
        extra = "allow"

class CitaResponseDTO(BaseModel):
    id: int
    usuario_id: int
    servicio_id: int
    fecha: date
    hora: time
    modalidad: str
    estado: str
    comentarios_cliente: Optional[str] = None
    comentarios_admin: Optional[str] = None
    notas_psicologa: Optional[str] = None
    motivo_cancelacion: Optional[str] = None
    link_virtual: Optional[str] = None
    fecha_completada: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Información adicional
    usuario_nombre: Optional[str] = None
    usuario_email: Optional[str] = None
    usuario_telefono: Optional[str] = None
    servicio_nombre: Optional[str] = None
    servicio_codigo: Optional[str] = None
    duracion_minutos: Optional[int] = None

    class Config:
        from_attributes = True

class CitaUpdateDTO(BaseModel):
    fecha: Optional[date] = Field(None, description="Nueva fecha de la cita")
    hora: Optional[time] = Field(None, description="Nueva hora de la cita")
    modalidad: Optional[str] = Field(None, description="Nueva modalidad")
    estado: Optional[str] = Field(None, description="Nuevo estado")
    comentarios_cliente: Optional[str] = Field(None, description="Comentarios del cliente")
    comentarios_admin: Optional[str] = Field(None, description="Comentarios del administrador")
    notas_psicologa: Optional[str] = Field(None, description="Notas de la psicóloga")
    motivo_cancelacion: Optional[str] = Field(None, description="Motivo de cancelación")
    link_virtual: Optional[str] = Field(None, description="Link para cita virtual")

    class Config:
        extra = "allow"

class CitaConfirmarDTO(BaseModel):
    notas_psicologa: Optional[str] = Field(None, description="Notas de confirmación")
    link_virtual: Optional[str] = Field(None, description="Link para cita virtual")

class CitaCompletarDTO(BaseModel):
    notas_sesion: str = Field(..., description="Notas de la sesión completada")
    observaciones: Optional[str] = Field(None, description="Observaciones adicionales")

class CitaCancelarDTO(BaseModel):
    motivo: str = Field(..., description="Motivo de la cancelación")
    cancelado_por: Optional[str] = Field(None, description="Quien cancela: cliente o administrador")
