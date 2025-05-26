# scripts/init_admin.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.config.database import db_config
from app.models.usuario import Usuario
from datetime import datetime, timezone

def crear_usuario_admin():
    """Crear usuario administrador inicial si no existe"""
    
    db: Session = next(db_config.get_session())
    
    try:
        admin_existente = db.query(Usuario).filter(
            Usuario.email == 'terapeuticocreser@gmail.com'
        ).first()
        
        if admin_existente:
            print("ℹ️  Usuario administrador ya existe")
            print(f"📧 Email: {admin_existente.email}")
            print(f"👤 Nombre: {admin_existente.nombre}")
            return admin_existente
        
        # Crear nuevo usuario administrador
        admin = Usuario(
            nombre='Diana Milena Rodríguez',
            email='terapeuticocreser@gmail.com',
            telefono='+57 310 227 7005',
            documento='1110540728',
            password=Usuario.hash_password('Diosmeamoprimero'),
            tipo="administrador",  # ← String directo, no enum
            estado="activo",       # ← String directo, no enum
            direccion='Ibagué, Colombia',
            configuracion={
                "notificaciones_email": True,
                "notificaciones_sms": True,
                "recordatorios_citas": True
            },
            created_at=datetime.now(timezone.utc),  # ← Corregir datetime
            updated_at=datetime.now(timezone.utc)   # ← Corregir datetime
        )
        
        db.add(admin)
        db.commit()
        db.refresh(admin)
        
        print("✅ Usuario administrador creado exitosamente")
        print(f"📧 Email: terapeuticocreser@gmail.com")
        print(f"🔑 Password: Diosmeamoprimero")
        print(f"👤 Nombre: {admin.nombre}")
        print(f"🆔 ID: {admin.id}")
        
        return admin
        
    except Exception as e:
        print(f"❌ Error creando usuario administrador: {e}")
        db.rollback()
        return None
    finally:
        db.close()

def verificar_login_admin():
    """Verificar que el login del admin funciona"""
    
    db: Session = next(db_config.get_session())
    
    try:
        admin = db.query(Usuario).filter(Usuario.email == 'terapeuticocreser@gmail.com').first()

        if admin and admin.verify_password('Diosmeamoprimero'):
            print("✅ Verificación de login exitosa")
            print("🔐 La contraseña funciona correctamente")
            return True
        else:
            print("❌ Error en verificación de login")
            return False
            
    except Exception as e:
        print(f"❌ Error verificando login: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Inicializando usuario administrador...")
    print("=" * 50)
    
    if not db_config.test_connection():
        print("❌ No se pudo conectar a la base de datos")
        exit(1)
    
    admin = crear_usuario_admin()
    
    if admin:
        print("=" * 50)
        print("🔍 Verificando login...")
        verificar_login_admin()
        print("=" * 50)
        print("🎉 Inicialización completada")
        print("\n📋 Credenciales de acceso:")
        print("   Email: terapeuticocreser@gmail.com")
        print("   Password: Diosmeamoprimero")
        print("\n🌐 Prueba el login en: http://localhost:8000/docs")
    else:
        print("❌ Error en la inicialización")
        exit(1)
