from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List

from app.config.database import get_db
from app.services.pago_service import PagoService
from app.dto.pago_dto import PagoCreateDTO, PagoResponseDTO, PagoAprobacionDTO
from app.utils.exceptions import BusinessException
from app.utils.security import get_current_active_user, require_admin
from app.models.usuario import Usuario

router = APIRouter()

@router.post("/procesar", response_model=PagoResponseDTO, status_code=status.HTTP_201_CREATED)
async def procesar_pago(
    nombre: str = Form(...),
    email: str = Form(...),
    telefono: str = Form(...),
    documento: str = Form(...),
    monto: float = Form(...),
    concepto: str = Form(...),
    tipo_compra: str = Form(...),
    comprobante: UploadFile = File(...),
    paquete_seleccionado: str = Form(None),
    referencia_bancaria: str = Form(None),
    db: Session = Depends(get_db)
):
    """Procesar nuevo pago con comprobante QR"""
    try:
        pago_dto = PagoCreateDTO(
            nombre=nombre,
            email=email,
            telefono=telefono,
            documento=documento,
            monto=monto,
            concepto=concepto,
            tipo_compra=tipo_compra,
            paquete_seleccionado=paquete_seleccionado,
            referencia_bancaria=referencia_bancaria
        )
        
        pago_service = PagoService(db)
        return pago_service.procesar_pago(pago_dto, comprobante)
        
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/pendientes", response_model=List[PagoResponseDTO])
async def listar_pagos_pendientes(
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Listar pagos pendientes de aprobación (solo administradores)"""
    try:
        pago_service = PagoService(db)
        return pago_service.listar_pagos_pendientes()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/{pago_id}/aprobar", response_model=PagoResponseDTO)
async def aprobar_pago(
    pago_id: int,
    aprobacion_dto: PagoAprobacionDTO,
    db: Session = Depends(get_db),
    current_admin: Usuario = Depends(require_admin)
):
    """Aprobar o rechazar pago (solo administradores)"""
    try:
        pago_service = PagoService(db)
        return pago_service.aprobar_pago(pago_id, aprobacion_dto, current_admin.id)
    except BusinessException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/mis-creditos")
async def obtener_mis_creditos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_active_user)
):
    """Obtener créditos disponibles del usuario actual"""
    try:
        pago_service = PagoService(db)
        return pago_service.obtener_creditos_usuario(current_user.id)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/info-qr")
async def obtener_info_qr():
    """Obtener información del QR para pagos"""
    return {
        "banco": "Banco de CreSer",
        "titular": "Diana Milena Rodríguez",
        "tipo_cuenta": "Ahorros",
        "numero_cuenta": "****7005",
        "instrucciones": [
            "1. Escanea el código QR con tu app bancaria",
            "2. Ingresa el monto según el paquete seleccionado",
            "3. Completa la transferencia",
            "4. Toma captura de pantalla del comprobante",
            "5. Sube el comprobante en este formulario"
        ],
        "paquetes_disponibles": {
            "evaluacion_completa": {
                "nombre": "Evaluación Completa",
                "precio": 350000,
                "descripcion": "Proceso completo de evaluación y diagnóstico (5 sesiones)",
                "incluye": ["1 Valoración Individual", "4 Sesiones de Evaluación"]
            },
            "psicoterapia_4": {
                "nombre": "Psicoterapia 4 Sesiones",
                "precio": 260000,
                "descripcion": "Paquete de 4 sesiones de psicoterapia individual",
                "incluye": ["4 Sesiones de Psicoterapia Individual"]
            },
            "psicoterapia_8": {
                "nombre": "Psicoterapia 8 Sesiones",
                "precio": 500000,
                "descripcion": "Paquete de 8 sesiones de psicoterapia individual",
                "incluye": ["8 Sesiones de Psicoterapia Individual"]
            }
        }
    }
