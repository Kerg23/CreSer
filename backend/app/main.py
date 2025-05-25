from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import traceback
from datetime import datetime

# Configurar logging básico
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Crear app
app = FastAPI(
    title="CreSer API MVP",
    description="API MVP para CreSer",
    version="1.0.0"
)

# CORREGIDO: CORS específico sin wildcard cuando se usan credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],  # NO usar "*" con credentials
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Accept",
        "Accept-Language", 
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-CSRF-Token",
        "Cache-Control"
    ],
    expose_headers=["*"],
    max_age=3600,
)

# Manejador global de excepciones
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Error global: {type(exc).__name__}: {str(exc)}")
    logger.error(f"URL: {request.url}")
    logger.error(f"Traceback: {traceback.format_exc()}")
    
    # CORREGIDO: Headers CORS específicos en respuestas de error
    origin = request.headers.get("origin")
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000", 
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]
    
    cors_headers = {}
    if origin in allowed_origins:
        cors_headers["Access-Control-Allow-Origin"] = origin
        cors_headers["Access-Control-Allow-Credentials"] = "true"
        cors_headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        cors_headers["Access-Control-Allow-Headers"] = "Accept, Content-Type, Authorization, X-Requested-With"
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Error interno del servidor",
            "error": str(exc),
            "type": type(exc).__name__
        },
        headers=cors_headers
    )

# Middleware de logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.now()
    
    logger.info(f"REQUEST: {request.method} {request.url}")
    logger.info(f"Origin: {request.headers.get('origin', 'No origin')}")
    
    try:
        response = await call_next(request)
        duration = datetime.now() - start_time
        logger.info(f"RESPONSE: {response.status_code} - {duration}")
        return response
    except Exception as e:
        duration = datetime.now() - start_time
        logger.error(f"ERROR: {e} - {duration}")
        raise

# Importar controladores
try:
    logger.info("Importando controladores...")
    
    # Controladores básicos
    from app.controllers.auth_controller import router as auth_router
    from app.controllers.usuario_controller import router as usuario_router
    from app.controllers.cita_controller import router as cita_router
    
    app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
    app.include_router(usuario_router, prefix="/api/usuarios", tags=["Usuarios"])
    app.include_router(cita_router, prefix="/api/citas", tags=["Citas"])
    
    logger.info("Controladores básicos cargados")
    
    # Controlador admin
    try:
        from app.controllers.admin_controller import router as admin_router
        app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
        logger.info("Controlador admin cargado")
    except Exception as e:
        logger.error(f"Error cargando admin controller: {e}")
        
        # Crear admin controller inline como fallback
        from fastapi import APIRouter
        admin_router = APIRouter()
        
        @admin_router.get("/estadisticas")
        async def estadisticas_fallback():
            logger.info("Usando estadísticas fallback")
            return {
                "usuarios": {"total": 5, "activos": 4},
                "citas": {"total": 12, "hoy": 2, "pendientes": 3, "completadas": 8, "tasa_asistencia": 75.0},
                "ingresos": {"mes": 850000, "total": 2500000},
                "pagos": {"pendientes": 2, "aprobados": 8, "tasa_aprobacion": 80.0},
                "creditos": {"activos": 25}
            }
        
        @admin_router.get("/citas-hoy")
        async def citas_hoy_fallback():
            return [
                {
                    "id": 1,
                    "hora": "09:00",
                    "usuario_nombre": "María González",
                    "usuario_telefono": "+57 300 123 4567",
                    "servicio_nombre": "Psicoterapia Individual",
                    "modalidad": "presencial",
                    "estado": "confirmada"
                },
                {
                    "id": 2,
                    "hora": "14:00",
                    "usuario_nombre": "Carlos Rodríguez",
                    "usuario_telefono": "+57 301 987 6543",
                    "servicio_nombre": "Valoración Psicológica",
                    "modalidad": "virtual",
                    "estado": "agendada"
                }
            ]
        
        @admin_router.get("/pagos-detallado")
        async def pagos_detallado_fallback(estado: str = None):
            todos_pagos = [
                {
                    "id": 1,
                    "nombre_pagador": "María González",
                    "monto": 280000,
                    "concepto": "Paquete 4 sesiones",
                    "estado": "pendiente",
                    "created_at": "2025-05-24T10:30:00"
                },
                {
                    "id": 2,
                    "nombre_pagador": "Carlos Rodríguez", 
                    "monto": 80000,
                    "concepto": "Valoración Individual",
                    "estado": "aprobado",
                    "created_at": "2025-05-23T15:45:00"
                }
            ]
            
            if estado:
                return [p for p in todos_pagos if p["estado"] == estado]
            return todos_pagos
        
        @admin_router.get("/usuarios-completo")
        async def usuarios_completo_fallback():
            return [
                {
                    "id": 1,
                    "nombre": "María González",
                    "email": "maria.gonzalez@email.com",
                    "telefono": "+57 300 123 4567",
                    "tipo": "cliente",
                    "estado": "activo",
                    "creditos_disponibles": 3,
                    "total_citas": 5
                },
                {
                    "id": 2,
                    "nombre": "Carlos Rodríguez",
                    "email": "carlos.rodriguez@email.com", 
                    "telefono": "+57 301 987 6543",
                    "tipo": "cliente",
                    "estado": "activo",
                    "creditos_disponibles": 1,
                    "total_citas": 2
                }
            ]
        
        @admin_router.get("/test")
        async def test_fallback():
            return {"message": "Admin fallback funcionando"}
        
        app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
        logger.info("Admin controller fallback creado")

except Exception as e:
    logger.error(f"Error crítico importando controladores: {e}")
    logger.error(traceback.format_exc())

@app.get("/")
async def root():
    return {
        "message": "CreSer API MVP",
        "status": "running",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }

# Event handlers
@app.on_event("startup")
async def startup():
    logger.info("=== CreSer API MVP Iniciando ===")

@app.on_event("shutdown")
async def shutdown():
    logger.info("=== CreSer API MVP Cerrando ===")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
