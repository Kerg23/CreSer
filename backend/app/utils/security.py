from datetime import datetime, timedelta
from typing import Optional, Union
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import logging
import os

from app.config.database import get_db
from app.models.usuario import Usuario

logger = logging.getLogger(__name__)

# CORREGIDO: Configuración de seguridad con clave secreta fuerte y consistente
SECRET_KEY = os.getenv("SECRET_KEY", "creser_secret_key_2025_muy_segura_cambiar_en_produccion_12345")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 horas para desarrollo

# Configuración de hash de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configuración de autenticación Bearer
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verificar contraseña"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generar hash de contraseña"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Crear token JWT"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    # CORREGIDO: Usar la misma SECRET_KEY consistentemente
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    logger.info(f"Token creado con SECRET_KEY: {SECRET_KEY[:10]}...")
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verificar token JWT"""
    try:
        # CORREGIDO: Usar la misma SECRET_KEY para verificar
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return payload
    except JWTError as e:
        logger.error(f"Error verificando token: {e}")
        return None

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Usuario:
    """Obtener usuario actual desde token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # CORREGIDO: Logging para debugging y usar SECRET_KEY consistente
        logger.info(f"Verificando token con SECRET_KEY: {SECRET_KEY[:10]}...")
        logger.info(f"Token recibido: {credentials.credentials[:20]}...")
        
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        
        logger.info(f"Token decodificado exitosamente para email: {email}")
        
        if email is None:
            logger.error("Email no encontrado en token")
            raise credentials_exception
            
    except JWTError as e:
        logger.error(f"Error decodificando JWT: {e}")
        logger.error(f"SECRET_KEY usado: {SECRET_KEY[:10]}...")
        raise credentials_exception
    
    user = db.query(Usuario).filter(Usuario.email == email).first()
    if user is None:
        logger.error(f"Usuario no encontrado para email: {email}")
        raise credentials_exception
        
    logger.info(f"Usuario autenticado exitosamente: {user.email}")
    return user

async def get_current_active_user(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    """Obtener usuario activo actual"""
    if current_user.estado != "activo":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Usuario inactivo"
        )
    return current_user

async def require_admin(current_user: Usuario = Depends(get_current_active_user)) -> Usuario:
    """Requerir permisos de administrador"""
    if current_user.tipo != "administrador":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos de administrador"
        )
    return current_user

def authenticate_user(db: Session, email: str, password: str) -> Union[Usuario, bool]:
    """Autenticar usuario"""
    user = db.query(Usuario).filter(Usuario.email == email).first()
    if not user:
        logger.error(f"Usuario no encontrado: {email}")
        return False
    if not verify_password(password, user.password):
        logger.error(f"Contraseña incorrecta para usuario: {email}")
        return False
    
    logger.info(f"Usuario autenticado exitosamente: {email}")
    return user

# Función para generar token de recuperación de contraseña
def create_password_reset_token(email: str) -> str:
    """Crear token para recuperación de contraseña"""
    expire = datetime.utcnow() + timedelta(hours=1)
    to_encode = {"sub": email, "exp": expire, "type": "password_reset"}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_password_reset_token(token: str) -> Optional[str]:
    """Verificar token de recuperación de contraseña"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if email is None or token_type != "password_reset":
            return None
        return email
    except JWTError:
        return None

def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validar fuerza de contraseña"""
    if len(password) < 6:
        return False, "La contraseña debe tener al menos 6 caracteres"
    
    if not any(c.isdigit() for c in password):
        return False, "La contraseña debe contener al menos un número"
    
    if not any(c.isalpha() for c in password):
        return False, "La contraseña debe contener al menos una letra"
    
    return True, "Contraseña válida"
