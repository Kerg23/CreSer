from typing import Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from decouple import config
import logging

from app.dao.usuario_dao import UsuarioDAO
from app.models.usuario import Usuario
from app.dto.auth_dto import LoginDTO, TokenResponseDTO, RegisterDTO  # ← Agregar RegisterDTO
from app.dto.usuario_dto import UsuarioResponseDTO  # ← Agregar UsuarioResponseDTO
from app.utils.exceptions import AuthenticationException, BusinessException

logger = logging.getLogger(__name__)

class AuthService:
    """Servicio para autenticación y autorización"""
    
    def __init__(self, db_session: Session):
        logger.debug("Inicializando AuthService")
        self.usuario_dao = UsuarioDAO(db_session)
        self.secret_key = config("JWT_SECRET")
        self.algorithm = config("JWT_ALGORITHM", default="HS256")
        self.access_token_expire_days = int(config("JWT_EXPIRES_IN", default=7))
        logger.debug("AuthService inicializado correctamente")
    
    def authenticate_user(self, login_dto: LoginDTO) -> Optional[Usuario]:
        """Autenticar usuario con email y contraseña"""
        logger.debug(f"Buscando usuario con email: {login_dto.email}")
        
        try:
            usuario = self.usuario_dao.get_by_email(login_dto.email)
            logger.debug(f"Usuario encontrado: {usuario is not None}")
            
            if not usuario:
                logger.warning(f"Usuario no encontrado: {login_dto.email}")
                return None
            
            logger.debug("Verificando contraseña...")
            if not usuario.verify_password(login_dto.password):
                logger.warning("Contraseña incorrecta")
                return None
            
            # Verificar que el usuario esté activo
            if usuario.estado != "activo":
                logger.warning(f"Usuario inactivo: {usuario.estado}")
                raise AuthenticationException("Usuario inactivo o suspendido")
            
            logger.debug("Autenticación exitosa")
            return usuario
            
        except Exception as e:
            logger.error(f"Error en authenticate_user: {e}", exc_info=True)
            raise
    
    def create_access_token(self, usuario: Usuario) -> str:
        """Crear token JWT para el usuario"""
        logger.debug(f"Creando token para usuario: {usuario.email}")
        
        try:
            expire = datetime.utcnow() + timedelta(days=self.access_token_expire_days)
            
            to_encode = {
                "sub": usuario.email,
                "user_id": usuario.id,
                "tipo": usuario.tipo,
                "exp": expire
            }
            
            encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
            logger.debug("Token creado exitosamente")
            return encoded_jwt
            
        except Exception as e:
            logger.error(f"Error creando token: {e}", exc_info=True)
            raise
    
    def login(self, login_dto: LoginDTO) -> TokenResponseDTO:
        """Proceso completo de login"""
        logger.info(f"Iniciando proceso de login para: {login_dto.email}")
        
        try:
            usuario = self.authenticate_user(login_dto)
            
            if not usuario:
                raise AuthenticationException("Credenciales inválidas")
            
            access_token = self.create_access_token(usuario)
            
            response = TokenResponseDTO(
                access_token=access_token,
                token_type="bearer",
                user={
                    "id": usuario.id,
                    "nombre": usuario.nombre,
                    "email": usuario.email,
                    "tipo": usuario.tipo,
                    "estado": usuario.estado
                }
            )
            
            logger.info(f"Login exitoso para: {login_dto.email}")
            return response
            
        except AuthenticationException:
            raise
        except Exception as e:
            logger.error(f"Error inesperado en login: {e}", exc_info=True)
            raise
    
    # ← AGREGAR ESTE MÉTODO
    def register(self, register_dto: RegisterDTO) -> UsuarioResponseDTO:
        """Registrar nuevo usuario (solo clientes)"""
        logger.info(f"Iniciando registro para: {register_dto.email}")
        
        try:
            # Verificar que el email no exista
            if self.usuario_dao.email_exists(register_dto.email):
                raise BusinessException("El email ya está registrado")
            
            if self.usuario_dao.documento_exists(register_dto.documento):
                raise BusinessException("El documento ya está registrado")
            
            # Crear nuevo usuario
            usuario = Usuario(
                nombre=register_dto.nombre,
                email=register_dto.email,
                telefono=register_dto.telefono,
                documento=register_dto.documento,
                password=Usuario.hash_password(register_dto.password),
                tipo="cliente",  # Solo clientes pueden registrarse
                estado="activo",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            usuario_creado = self.usuario_dao.create(usuario)
            logger.info(f"Usuario registrado exitosamente: {register_dto.email}")
            
            return UsuarioResponseDTO.model_validate(usuario_creado.to_dict())
            
        except BusinessException:
            raise
        except Exception as e:
            logger.error(f"Error inesperado en register: {e}", exc_info=True)
            raise
    
    def verify_token(self, token: str) -> dict:
        """Verificar y decodificar token JWT"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            email: str = payload.get("sub")
            user_id: int = payload.get("user_id")
            tipo: str = payload.get("tipo")
            
            if email is None or user_id is None:
                raise AuthenticationException("Token inválido")
            
            return {"email": email, "user_id": user_id, "tipo": tipo}
        
        except JWTError:
            raise AuthenticationException("Token inválido o expirado")
    
    def get_current_user(self, token_data: dict) -> Usuario:
        """Obtener usuario actual basado en el token"""
        usuario = self.usuario_dao.get_by_email(token_data["email"])
        
        if not usuario:
            raise AuthenticationException("Usuario no encontrado")
        
        if usuario.estado != "activo":
            raise AuthenticationException("Usuario inactivo")
        
        return usuario
