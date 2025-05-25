# CRÍTICO: Importar Base primero
from app.config.database import Base

# Importar modelos en orden correcto (sin dependencias circulares)
from .usuario import Usuario
from .servicio import Servicio
from .cita import Cita

# OPCIONAL: Solo importar Credito si lo necesitas para el MVP
try:
    from .credito import Credito
    __all__ = ["Base", "Usuario", "Servicio", "Cita", "Credito"]
except ImportError:
    __all__ = ["Base", "Usuario", "Servicio", "Cita"]

# NO importar Pago para MVP para evitar complicaciones
