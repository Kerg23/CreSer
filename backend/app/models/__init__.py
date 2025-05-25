from app.config.database import Base

# Importar modelos en orden correcto
from .usuario import Usuario
from .servicio import Servicio
from .cita import Cita
from .pago import Pago  # AGREGADO

__all__ = ["Base", "Usuario", "Servicio", "Cita", "Pago"]

print(f"✅ Modelos cargados: {__all__}")
