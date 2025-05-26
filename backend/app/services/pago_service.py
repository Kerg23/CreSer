from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
import os
import uuid

from app.dao.usuario_dao import UsuarioDAO
from app.models.usuario import Usuario
from app.models.pago import Pago
from app.models.credito import Credito
from app.models.servicio import Servicio
from app.dto.pago_dto import PagoCreateDTO, PagoResponseDTO, PagoAprobacionDTO
from app.utils.exceptions import BusinessException

class PagoService:
    """Servicio para gestión de pagos y créditos"""
    
    def __init__(self, db_session: Session):
        self.db = db_session
        self.usuario_dao = UsuarioDAO(db_session)
    
    def procesar_pago(self, pago_dto: PagoCreateDTO, comprobante_file) -> PagoResponseDTO:
        """Procesar nuevo pago con comprobante"""
        try:
            # Verificar si el usuario existe
            usuario_existente = self.usuario_dao.get_by_email(pago_dto.email)
            
            # Guardar comprobante
            comprobante_filename = self._guardar_comprobante(comprobante_file)
            
            # Crear pago
            pago = Pago(
                usuario_id=usuario_existente.id if usuario_existente else None,
                monto=pago_dto.monto,
                metodo_pago="qr",
                estado="pendiente",
                concepto=pago_dto.concepto,
                tipo_compra=pago_dto.tipo_compra,
                comprobante=comprobante_filename,
                fecha_pago=datetime.now(timezone.utc),
                referencia=pago_dto.referencia_bancaria,
                nombre_pagador=pago_dto.nombre,
                email_pagador=pago_dto.email,
                telefono_pagador=pago_dto.telefono,
                documento_pagador=pago_dto.documento,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            
            self.db.add(pago)
            self.db.commit()
            self.db.refresh(pago)
            
            # Si el usuario no existe, crearlo automáticamente
            if not usuario_existente:
                self._crear_usuario_automatico(pago_dto)
            
            return PagoResponseDTO.model_validate(pago.to_dict())
            
        except Exception as e:
            self.db.rollback()
            raise BusinessException(f"Error procesando pago: {str(e)}")
    
    def aprobar_pago(self, pago_id: int, aprobacion_dto: PagoAprobacionDTO, admin_id: int) -> PagoResponseDTO:
        """Aprobar o rechazar pago y asignar créditos"""
        try:
            pago = self.db.query(Pago).filter(Pago.id == pago_id).first()
            
            if not pago:
                raise BusinessException("Pago no encontrado")
            
            if pago.estado != "pendiente":
                raise BusinessException("El pago ya fue procesado")
            
            # Actualizar estado del pago
            pago.estado = aprobacion_dto.estado
            pago.fecha_aprobacion = datetime.now(timezone.utc)
            pago.aprobado_por = admin_id
            pago.notas_admin = aprobacion_dto.notas_admin
            
            # Si se aprueba, asignar créditos
            if aprobacion_dto.estado == "aprobado":
                self._asignar_creditos(pago, aprobacion_dto.servicios_asignados)
            
            self.db.commit()
            self.db.refresh(pago)
            
            return PagoResponseDTO.model_validate(pago.to_dict())
            
        except Exception as e:
            self.db.rollback()
            raise BusinessException(f"Error aprobando pago: {str(e)}")
    
    def listar_pagos_pendientes(self) -> List[PagoResponseDTO]:
        """Listar pagos pendientes de aprobación"""
        pagos = self.db.query(Pago).filter(Pago.estado == "pendiente").order_by(Pago.created_at.desc()).all()
        return [PagoResponseDTO.model_validate(pago.to_dict()) for pago in pagos]
    
    def obtener_creditos_usuario(self, usuario_id: int) -> List[dict]:
        """Obtener créditos disponibles del usuario"""
        creditos = self.db.query(Credito, Servicio).join(
            Servicio, Credito.servicio_id == Servicio.id
        ).filter(
            Credito.usuario_id == usuario_id,
            Credito.cantidad_disponible > 0,
            Credito.estado == "activo"
        ).all()
        
        resultado = []
        for credito, servicio in creditos:
            resultado.append({
                "id": credito.id,
                "servicio_nombre": servicio.nombre,
                "cantidad_inicial": credito.cantidad_inicial,
                "cantidad_disponible": credito.cantidad_disponible,
                "precio_unitario": float(credito.precio_unitario),
                "fecha_vencimiento": credito.fecha_vencimiento.isoformat() if credito.fecha_vencimiento else None,
                "estado": credito.estado
            })
        
        return resultado
    
   
    def _guardar_comprobante(self, file) -> str:
        """Guardar archivo de comprobante con validación"""
        if not file:
            raise BusinessException("No se proporcionó comprobante")
        
        # AGREGAR VALIDACIÓN DE TIPO
        allowed_types = ["image/jpeg", "image/jpg", "image/png"]
        if file.content_type not in allowed_types:
            raise BusinessException("Tipo de archivo no permitido. Use JPG, JPEG o PNG")
        
        # AGREGAR VALIDACIÓN DE TAMAÑO (2MB máximo)
        file_size = 0
        file.file.seek(0)  # Ir al inicio del archivo
        content = file.file.read()
        file_size = len(content)
        
        if file_size > 2 * 1024 * 1024:  # 2MB
            raise BusinessException("Archivo muy grande. Máximo 2MB")
        
        # Generar nombre único
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        filename = f"comprobante_{uuid.uuid4()}.{file_extension}"
        file_path = f"uploads/comprobantes/{filename}"
        
        # Crear directorio si no existe
        os.makedirs("uploads/comprobantes", exist_ok=True)
        
        # Guardar archivo
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        return file_path

    
    def _crear_usuario_automatico(self, pago_dto: PagoCreateDTO):
        """Crear usuario automáticamente cuando no existe"""
        try:
            # Generar contraseña temporal
            password_temp = f"CreSer{pago_dto.documento}"
            
            usuario = Usuario(
                nombre=pago_dto.nombre,
                email=pago_dto.email,
                telefono=pago_dto.telefono,
                documento=pago_dto.documento,
                password=Usuario.hash_password(password_temp),
                tipo="cliente",
                estado="activo",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            
            self.db.add(usuario)
            self.db.commit()
            
            # TODO: Enviar email con credenciales
            # self._enviar_credenciales_email(usuario, password_temp)
            
        except Exception as e:
            raise BusinessException(f"Error creando usuario automático: {str(e)}")
    
    def _asignar_creditos(self, pago: Pago, servicios_asignados: Optional[List] = None):
        """Asignar créditos según el pago aprobado"""
        try:
            # Obtener usuario (crear si no existe)
            usuario = self.db.query(Usuario).filter(Usuario.id == pago.usuario_id).first()
            
            if not usuario:
                # Buscar por email del pagador
                usuario = self.usuario_dao.get_by_email(pago.email_pagador)
                if usuario:
                    pago.usuario_id = usuario.id
            
            if not usuario:
                raise BusinessException("Usuario no encontrado para asignar créditos")
            
            # Asignar créditos según el tipo de compra
            if pago.tipo_compra == "paquete":
                self._asignar_creditos_paquete(pago, usuario.id)
            else:
                self._asignar_creditos_individual(pago, usuario.id, servicios_asignados)
                
        except Exception as e:
            raise BusinessException(f"Error asignando créditos: {str(e)}")
    
    def _asignar_creditos_paquete(self, pago: Pago, usuario_id: int):
        """Asignar créditos según paquete predefinido"""
        # Mapeo de paquetes (esto debería venir de base de datos)
        paquetes = {
            "evaluacion_completa": [
                {"servicio_codigo": "VAL-IND", "cantidad": 1},
                {"servicio_codigo": "EVA-SES", "cantidad": 4}
            ],
            "psicoterapia_4": [
                {"servicio_codigo": "PSI-IND", "cantidad": 4}
            ],
            "psicoterapia_8": [
                {"servicio_codigo": "PSI-IND", "cantidad": 8}
            ]
        }
        
        # Determinar paquete basado en monto (lógica simplificada)
        if pago.monto >= 500000:
            paquete_servicios = paquetes["psicoterapia_8"]
        elif pago.monto >= 260000:
            paquete_servicios = paquetes["psicoterapia_4"]
        else:
            paquete_servicios = paquetes["evaluacion_completa"]
        
        # Crear créditos
        for item in paquete_servicios:
            servicio = self.db.query(Servicio).filter(Servicio.codigo == item["servicio_codigo"]).first()
            if servicio:
                credito = Credito(
                    usuario_id=usuario_id,
                    pago_id=pago.id,
                    servicio_id=servicio.id,
                    cantidad_inicial=item["cantidad"],
                    cantidad_disponible=item["cantidad"],
                    precio_unitario=servicio.precio,
                    fecha_vencimiento=datetime.now(timezone.utc).date() + timedelta(days=365),  # 1 año
                    estado="activo",
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc)
                )
                self.db.add(credito)
    
    def _asignar_creditos_individual(self, pago: Pago, usuario_id: int, servicios_asignados: Optional[List]):
        """Asignar créditos para servicios individuales"""
        if not servicios_asignados:
            # Asignar crédito genérico de psicoterapia individual
            servicio = self.db.query(Servicio).filter(Servicio.codigo == "PSI-IND").first()
            if servicio:
                cantidad = int(pago.monto / servicio.precio)
                if cantidad > 0:
                    credito = Credito(
                        usuario_id=usuario_id,
                        pago_id=pago.id,
                        servicio_id=servicio.id,
                        cantidad_inicial=cantidad,
                        cantidad_disponible=cantidad,
                        precio_unitario=servicio.precio,
                        fecha_vencimiento=datetime.now(timezone.utc).date() + timedelta(days=365),
                        estado="activo",
                        created_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc)
                    )
                    self.db.add(credito)
