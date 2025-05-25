from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import logging

from app.config.database import get_db
from app.models.servicio import Servicio

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/")
async def listar_servicios(
    db: Session = Depends(get_db)
):
    """Listar todos los servicios de la base de datos"""
    try:
        logger.info("🔍 Obteniendo servicios reales de la base de datos...")
        
        # Query directo a la BD
        servicios = db.query(Servicio).filter(Servicio.estado == 'activo').all()
        
        logger.info(f"📊 Encontrados {len(servicios)} servicios activos en BD")
        
        servicios_response = []
        for servicio in servicios:
            try:
                servicio_data = {
                    "id": servicio.id,
                    "codigo": servicio.codigo,
                    "nombre": servicio.nombre,
                    "descripcion": servicio.descripcion or '',
                    "precio": float(servicio.precio),
                    "duracion_minutos": servicio.duracion_minutos,
                    "categoria": servicio.categoria or 'general',
                    "estado": servicio.estado
                }
                servicios_response.append(servicio_data)
                logger.info(f"✅ Servicio: {servicio.codigo} - {servicio.nombre} - ${servicio.precio}")
            except Exception as e:
                logger.error(f"❌ Error procesando servicio {servicio.id}: {e}")
        
        logger.info(f"🎯 Retornando {len(servicios_response)} servicios procesados")
        return servicios_response
        
    except Exception as e:
        logger.error(f"❌ Error obteniendo servicios de BD: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{servicio_id}")
async def obtener_servicio(
    servicio_id: int,
    db: Session = Depends(get_db)
):
    """Obtener servicio por ID"""
    try:
        servicio = db.query(Servicio).filter(Servicio.id == servicio_id).first()
        
        if not servicio:
            raise HTTPException(status_code=404, detail="Servicio no encontrado")
        
        return {
            "id": servicio.id,
            "codigo": servicio.codigo,
            "nombre": servicio.nombre,
            "descripcion": servicio.descripcion or '',
            "precio": float(servicio.precio),
            "duracion_minutos": servicio.duracion_minutos,
            "categoria": servicio.categoria or 'general',
            "estado": servicio.estado
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo servicio {servicio_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
