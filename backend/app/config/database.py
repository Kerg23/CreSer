from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from decouple import config
from typing import Generator
import logging

logger = logging.getLogger(__name__)

class DatabaseConfig:
    def __init__(self):
        self.database_url = f"mysql+pymysql://{config('DB_USER')}:{config('DB_PASSWORD')}@{config('DB_HOST')}:{config('DB_PORT')}/{config('DB_NAME')}"
        self.engine = create_engine(self.database_url, echo=False)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.Base = declarative_base()
    
    def get_session(self) -> Generator[Session, None, None]:
        """Obtener sesión de base de datos con manejo correcto de excepciones"""
        db = self.SessionLocal()
        try:
            yield db
            db.commit()  # ← Agregar commit automático
        except Exception as e:
            logger.error(f"Error en sesión de BD: {e}", exc_info=True)
            db.rollback()
            raise  # ← IMPORTANTE: Re-lanzar la excepción
        finally:
            db.close()
    
    def test_connection(self) -> bool:
        """Verificar conexión a la base de datos"""
        try:
            with self.engine.connect() as connection:
                connection.execute(text("SELECT 1"))
                print("✅ Conexión a MySQL exitosa")
                return True
        except Exception as e:
            print(f"❌ Error conectando a MySQL: {e}")
            return False

# Instancia global
db_config = DatabaseConfig()
Base = db_config.Base

def get_db() -> Generator[Session, None, None]:
    """Dependency para obtener sesión de BD con manejo correcto de errores"""
    db = db_config.SessionLocal()
    try:
        logger.debug("Creando nueva sesión de BD")
        yield db
        logger.debug("Sesión de BD completada exitosamente")
    except Exception as e:
        logger.error(f"Error en sesión de BD: {e}", exc_info=True)
        db.rollback()
        raise  # ← CRÍTICO: Re-lanzar la excepción para que FastAPI la capture
    finally:
        logger.debug("Cerrando sesión de BD")
        db.close()
