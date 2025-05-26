from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.models.credito import Credito
from app.models.usuario import Usuario
from app.models.servicio import Servicio
from app.utils.security import get_current_active_user, require_admin
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", status_code=status.HTTP_201_CREATED)
async def crear_credito(
    credito_data: dict,
    db: Session = Depends(get_db)
):
    """Crear un nuevo crédito"""
    try:
        logger.info(f"Creando nuevo crédito: {credito_data}")
        
        nuevo_credito = Credito(
            usuario_id=credito_data['usuario_id'],
            pago_id=credito_data.get('pago_id'),
            servicio_id=credito_data['servicio_id'],
            cantidad_inicial=credito_data['cantidad_inicial'],
            cantidad_disponible=credito_data['cantidad_disponible'],
            precio_unitario=credito_data['precio_unitario'],
            fecha_vencimiento=credito_data.get('fecha_vencimiento'),
            estado=credito_data.get('estado', 'activo')
        )
        
        db.add(nuevo_credito)
        db.commit()
        db.refresh(nuevo_credito)
        
        logger.info(f"Crédito {nuevo_credito.id} creado exitosamente")
        return nuevo_credito.to_dict()
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creando crédito: {e}")
        raise HTTPException(status_code=500, detail="Error creando crédito")

@router.get("/usuario/{usuario_id}")
async def obtener_creditos_usuario(
    usuario_id: int,
    db: Session = Depends(get_db)
):
    """Obtener créditos de un usuario específico"""
    try:
        creditos = db.query(Credito).join(Servicio).filter(
            Credito.usuario_id == usuario_id,
            Credito.estado == 'activo'
        ).all()
        
        return [credito.to_dict() for credito in creditos]
        
    except Exception as e:
        logger.error(f"Error obteniendo créditos del usuario {usuario_id}: {e}")
        raise HTTPException(status_code=500, detail="Error obteniendo créditos")

@router.get("/")
async def listar_creditos(
    db: Session = Depends(get_db),
    current_admin = Depends(require_admin)
):
    """Listar todos los créditos (solo admin)"""
    try:
        creditos = db.query(Credito).join(Servicio).join(Usuario).all()
        return [credito.to_dict() for credito in creditos]
        
    except Exception as e:
        logger.error(f"Error listando créditos: {e}")
        raise HTTPException(status_code=500, detail="Error listando créditos")
