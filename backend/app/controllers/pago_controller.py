from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional
from datetime import datetime, timezone
import logging
import os

from app.config.database import get_db
from app.models.pago import Pago
from app.models.usuario import Usuario
from app.utils.security import get_current_active_user, require_admin

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", response_model=List[dict])
async def listar_pagos(
    estado: Optional[str] = Query(None, description="Filtrar por estado"),
    metodo_pago: Optional[str] = Query(None, description="Filtrar por método de pago"),
    fecha_inicio: Optional[str] = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    fecha_fin: Optional[str] = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_admin = Depends(require_admin)
):
    """Listar pagos con filtros avanzados"""
    try:
        logger.info(f"Listando pagos con filtros: estado={estado}, método={metodo_pago}")
        
        query = db.query(Pago, Usuario).outerjoin(
            Usuario, Pago.usuario_id == Usuario.id
        )
        
        # Aplicar filtros
        if estado and estado != 'todos':
            query = query.filter(Pago.estado == estado)
        
        if metodo_pago:
            query = query.filter(Pago.metodo_pago == metodo_pago)
        
        if fecha_inicio:
            try:
                fecha_inicio_dt = datetime.strptime(fecha_inicio, '%Y-%m-%d')
                query = query.filter(Pago.created_at >= fecha_inicio_dt)
            except ValueError:
                raise HTTPException(status_code=400, detail="Formato de fecha inicio inválido")
        
        if fecha_fin:
            try:
                fecha_fin_dt = datetime.strptime(fecha_fin, '%Y-%m-%d')
                query = query.filter(Pago.created_at <= fecha_fin_dt)
            except ValueError:
                raise HTTPException(status_code=400, detail="Formato de fecha fin inválido")
        
        pagos_raw = query.order_by(Pago.created_at.desc()).offset(skip).limit(limit).all()
        
        pagos_response = []
        for pago, usuario in pagos_raw:
            pago_dict = pago.to_dict()
            if usuario:
                pago_dict['usuario_nombre'] = usuario.nombre
                pago_dict['usuario_email'] = usuario.email
            pagos_response.append(pago_dict)
        
        logger.info(f"Retornando {len(pagos_response)} pagos")
        return pagos_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listando pagos: {e}")
        raise HTTPException(status_code=500, detail="Error listando pagos")

@router.get("/estadisticas")
async def obtener_estadisticas_pagos(
    db: Session = Depends(get_db),
    current_admin = Depends(require_admin)
):
    """Obtener estadísticas de pagos para dashboard"""
    try:
        logger.info("Obteniendo estadísticas de pagos")
        
        # Estadísticas básicas
        total_pagos = db.query(func.count(Pago.id)).scalar() or 0
        pagos_pendientes = db.query(func.count(Pago.id)).filter(Pago.estado == 'pendiente').scalar() or 0
        pagos_aprobados = db.query(func.count(Pago.id)).filter(Pago.estado == 'aprobado').scalar() or 0
        pagos_rechazados = db.query(func.count(Pago.id)).filter(Pago.estado == 'rechazado').scalar() or 0
        
        # Montos
        monto_total = db.query(func.sum(Pago.monto)).scalar() or 0
        monto_aprobado = db.query(func.sum(Pago.monto)).filter(Pago.estado == 'aprobado').scalar() or 0
        monto_pendiente = db.query(func.sum(Pago.monto)).filter(Pago.estado == 'pendiente').scalar() or 0
        
        # Tasa de aprobación
        tasa_aprobacion = 0
        if total_pagos > 0:
            tasa_aprobacion = round((pagos_aprobados / total_pagos) * 100, 1)
        
        # Estadísticas por método de pago
        metodos_stats = db.query(
            Pago.metodo_pago,
            func.count(Pago.id).label('cantidad'),
            func.sum(Pago.monto).label('monto_total')
        ).group_by(Pago.metodo_pago).all()
        
        estadisticas = {
            "total_pagos": total_pagos,
            "pagos_pendientes": pagos_pendientes,
            "pagos_aprobados": pagos_aprobados,
            "pagos_rechazados": pagos_rechazados,
            "monto_total": float(monto_total),
            "monto_aprobado": float(monto_aprobado),
            "monto_pendiente": float(monto_pendiente),
            "tasa_aprobacion": tasa_aprobacion,
            "metodos_pago": [
                {
                    "metodo": metodo.metodo_pago,
                    "cantidad": metodo.cantidad,
                    "monto": float(metodo.monto_total or 0)
                }
                for metodo in metodos_stats
            ]
        }
        
        logger.info(f"Estadísticas calculadas: {estadisticas}")
        return estadisticas
        
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de pagos: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo estadísticas")

@router.post("/", status_code=status.HTTP_201_CREATED)
async def crear_pago(
    pago_data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Crear un nuevo pago"""
    try:
        logger.info(f"Creando nuevo pago: {pago_data}")
        
        nuevo_pago = Pago(
            usuario_id=pago_data.get('usuario_id'),
            nombre_pagador=pago_data['nombre_pagador'],
            email_pagador=pago_data['email_pagador'],
            telefono_pagador=pago_data.get('telefono_pagador'),
            documento_pagador=pago_data.get('documento_pagador'),
            monto=pago_data['monto'],
            concepto=pago_data['concepto'],
            metodo_pago=pago_data.get('metodo_pago', 'qr'),
            tipo_compra=pago_data['tipo_compra'],
            referencia_bancaria=pago_data.get('referencia_bancaria'),
            estado='pendiente'
        )
        
        db.add(nuevo_pago)
        db.commit()
        db.refresh(nuevo_pago)
        
        logger.info(f"Pago {nuevo_pago.id} creado exitosamente")
        return nuevo_pago.to_dict()
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creando pago: {e}")
        raise HTTPException(status_code=500, detail="Error creando pago")

@router.put("/{pago_id}/aprobar")
async def aprobar_pago(
    pago_id: int,
    notas_admin: Optional[str] = Query(None, description="Notas del administrador"),
    db: Session = Depends(get_db),
    current_admin = Depends(require_admin)
):
    """Aprobar un pago"""
    try:
        logger.info(f"Aprobando pago {pago_id} por admin {current_admin.id}")
        
        pago = db.query(Pago).filter(Pago.id == pago_id).first()
        if not pago:
            raise HTTPException(status_code=404, detail="Pago no encontrado")
        
        if pago.estado != 'pendiente':
            raise HTTPException(status_code=400, detail="Solo se pueden aprobar pagos pendientes")
        
        pago.estado = 'aprobado'
        pago.notas_admin = notas_admin or f"Aprobado por {current_admin.nombre}"
        pago.fecha_aprobacion = datetime.now(timezone.utc)
        pago.aprobado_por = current_admin.id
        pago.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        logger.info(f"Pago {pago_id} aprobado exitosamente")
        return pago.to_dict()
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error aprobando pago: {e}")
        raise HTTPException(status_code=500, detail="Error aprobando pago")

@router.put("/{pago_id}/rechazar")
async def rechazar_pago(
    pago_id: int,
    motivo: str = Query(..., description="Motivo del rechazo"),
    db: Session = Depends(get_db),
    current_admin = Depends(require_admin)
):
    """Rechazar un pago"""
    try:
        logger.info(f"Rechazando pago {pago_id} por admin {current_admin.id}")
        
        pago = db.query(Pago).filter(Pago.id == pago_id).first()
        if not pago:
            raise HTTPException(status_code=404, detail="Pago no encontrado")
        
        if pago.estado != 'pendiente':
            raise HTTPException(status_code=400, detail="Solo se pueden rechazar pagos pendientes")
        
        pago.estado = 'rechazado'
        pago.notas_admin = f"Rechazado por {current_admin.nombre}: {motivo}"
        pago.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        logger.info(f"Pago {pago_id} rechazado exitosamente")
        return pago.to_dict()
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error rechazando pago: {e}")
        raise HTTPException(status_code=500, detail="Error rechazando pago")

@router.get("/{pago_id}")
async def obtener_pago(
    pago_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(require_admin)
):
    """Obtener detalles de un pago específico"""
    try:
        pago = db.query(Pago, Usuario).outerjoin(
            Usuario, Pago.usuario_id == Usuario.id
        ).filter(Pago.id == pago_id).first()
        
        if not pago:
            raise HTTPException(status_code=404, detail="Pago no encontrado")
        
        pago_obj, usuario = pago
        pago_dict = pago_obj.to_dict()
        
        if usuario:
            pago_dict['usuario_nombre'] = usuario.nombre
            pago_dict['usuario_email'] = usuario.email
            pago_dict['usuario_telefono'] = usuario.telefono
        
        return pago_dict
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo pago {pago_id}: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo pago")

@router.post("/{pago_id}/comprobante")
async def subir_comprobante(
    pago_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Subir comprobante de pago"""
    try:
        logger.info(f"Subiendo comprobante para pago {pago_id}")
        
        pago = db.query(Pago).filter(Pago.id == pago_id).first()
        if not pago:
            raise HTTPException(status_code=404, detail="Pago no encontrado")
        
        # Validar tipo de archivo
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Tipo de archivo no permitido")
        
        # Crear directorio si no existe
        upload_dir = "uploads/comprobantes"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Guardar archivo
        filename = f"comprobante_{pago_id}_{int(datetime.now().timestamp())}_{file.filename}"
        filepath = os.path.join(upload_dir, filename)
        
        with open(filepath, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Actualizar pago
        pago.comprobante = filename
        pago.updated_at = datetime.now(timezone.utc)
        db.commit()
        
        logger.info(f"Comprobante subido exitosamente: {filename}")
        return {"message": "Comprobante subido exitosamente", "filename": filename}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error subiendo comprobante: {e}")
        raise HTTPException(status_code=500, detail="Error subiendo comprobante")
