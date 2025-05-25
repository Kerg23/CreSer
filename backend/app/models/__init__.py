from app.config.database import Base

# SOLO modelos que funcionan sin problemas
from .usuario import Usuario
from .servicio import Servicio
from .cita import Cita

# NO importar modelos problemáticos
# from .credito import Credito
# from .pago import Pago
# from .contacto import Contacto

__all__ = ["Base", "Usuario", "Servicio", "Cita"]

print(f"✅ Modelos MVP seguros cargados: {__all__}")
