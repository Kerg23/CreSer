from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from decouple import config
import logging
import traceback
import os
from datetime import datetime

# Configurar logging detallado
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

from app.config.database import db_config

# Crear app con debug habilitado
app = FastAPI(
    title="CreSer API",
    description="API para CreSer - Centro Terapéutico con Sistema de Pagos QR",
    version="1.0.0",
    debug=True
)

# Configurar CORS para tu frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000", 
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5500",  # Para Live Server
        "http://127.0.0.1:5500",
        "*"  # Para desarrollo
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crear directorios de uploads si no existen
os.makedirs("uploads/images", exist_ok=True)
os.makedirs("uploads/comprobantes", exist_ok=True)

# Servir archivos estáticos
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Exception handler personalizado
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Error en {request.url}: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Error interno del servidor",
            "error": str(exc) if config("DEBUG", default=True, cast=bool) else "Error interno"
        }
    )

# Verificar conexión al iniciar
@app.on_event("startup")
async def startup_event():
    if not db_config.test_connection():
        raise Exception("No se pudo conectar a la base de datos")

# Ruta de prueba
@app.get("/")
async def root():
    return {
        "message": "API de CreSer funcionando correctamente",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "online",
        "timestamp": datetime.now().isoformat()
    }

# Incluir controladores
try:
    from app.controllers.auth_controller import router as auth_router
    from app.controllers.usuario_controller import router as usuario_router
    from app.controllers.pago_controller import router as pago_router
    from app.controllers.cita_controller import router as cita_router
    from app.controllers.noticia_controller import router as noticia_router
    from app.controllers.contacto_controller import router as contacto_router
    
    app.include_router(auth_router, prefix="/api/auth", tags=["🔐 Autenticación"])
    app.include_router(usuario_router, prefix="/api/usuarios", tags=["👥 Usuarios"])
    app.include_router(pago_router, prefix="/api/pagos", tags=["💳 Pagos QR"])
    app.include_router(cita_router, prefix="/api/citas", tags=["📅 Citas Médicas"])
    app.include_router(noticia_router, prefix="/api/noticias", tags=["📰 Noticias y Blog"])
    app.include_router(contacto_router, prefix="/api/contacto", tags=["📞 Formulario de Contacto"])
    
    logger.info("✅ Controladores cargados correctamente")
except ImportError as e:
    logger.error(f"❌ Error importando controladores: {e}")

# Middleware de logging para requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.now()
    
    # Log de request
    logger.info(f"📥 {request.method} {request.url}")
    
    response = await call_next(request)
    
    # Log de response
    process_time = datetime.now() - start_time
    logger.info(f"📤 {request.method} {request.url} - {response.status_code} - {process_time}")
    
    return response

logger.info("🎉 Aplicación FastAPI inicializada correctamente")
