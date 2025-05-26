// ============ GESTIÓN DE HEADER ADAPTATIVO SIMPLIFICADO ============

// Variables globales
let headerInicializado = false;

// Inicialización principal
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando header adaptativo...');
    inicializarHeaderAdaptativo();
});

// Función principal de inicialización
function inicializarHeaderAdaptativo() {
    // Verificar si ya se inicializó para evitar duplicados
    if (headerInicializado) {
        console.log('⚠️ Header ya inicializado, saltando...');
        return;
    }

    // Verificar disponibilidad de auth con timeout
    verificarAuthYConfigurar();
}

// Verificación robusta de auth
function verificarAuthYConfigurar() {
    let intentos = 0;
    const maxIntentos = 30; // 3 segundos máximo
    
    const verificar = () => {
        intentos++;
        
        // Verificar si auth está disponible y es funcional
        if (typeof auth !== 'undefined' && auth && typeof auth.isAuthenticated === 'function') {
            console.log('✅ Auth disponible, configurando header...');
            configurarHeaderAdaptativo();
            headerInicializado = true;
        } else if (intentos < maxIntentos) {
            console.log(`⏳ Esperando auth... intento ${intentos}/${maxIntentos}`);
            setTimeout(verificar, 100);
        } else {
            console.warn('⚠️ Auth no disponible, configurando header básico');
            configurarHeaderBasico();
            headerInicializado = true;
        }
    };
    
    verificar();
}

// Configuración principal del header
function configurarHeaderAdaptativo() {
    const navContainer = document.getElementById('nav-auth-container');
    if (!navContainer) {
        console.warn('⚠️ Contenedor nav-auth-container no encontrado');
        return;
    }

    let isLoggedIn = false;
    let user = null;
    
    try {
        // Verificación segura del estado de autenticación
        isLoggedIn = auth && typeof auth.isAuthenticated === 'function' && auth.isAuthenticated();
        user = isLoggedIn && typeof auth.getUser === 'function' ? auth.getUser() : null;
        
        console.log('🔍 Estado de autenticación:', { isLoggedIn, user: user?.nombre || 'N/A' });
        
    } catch (error) {
        console.warn('⚠️ Error verificando autenticación:', error);
        isLoggedIn = false;
        user = null;
    }

    if (isLoggedIn && user) {
        renderizarBotonCerrarSesion(navContainer);
    } else {
        renderizarBotonAcceder(navContainer);
    }
}

// Renderizar botón cerrar sesión para usuario logueado
function renderizarBotonCerrarSesion(container) {
    container.innerHTML = `
        <div class="boton-acceder">
            <a href="#" onclick="cerrarSesion()" class="btn-logout">
                <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
            </a>
        </div>
    `;
}

// Renderizar botón de acceder para usuarios no logueados
function renderizarBotonAcceder(container) {
    container.innerHTML = `
        <div class="boton-acceder">
            <a href="acceder.html" class="btn-acceder">
                <i class="fas fa-sign-in-alt"></i> Acceder
            </a>
        </div>
    `;
}

// Configuración básica sin auth
function configurarHeaderBasico() {
    const navContainer = document.getElementById('nav-auth-container');
    if (navContainer) {
        renderizarBotonAcceder(navContainer);
    }
}

// ============ GESTIÓN DE CIERRE DE SESIÓN ============

function cerrarSesion() {
    // Mostrar confirmación
    if (confirm('¿Estás seguro de que quieres cerrar la sesión?')) {
        ejecutarCierreSesion();
    }
}

function ejecutarCierreSesion() {
    console.log('🚪 Cerrando sesión desde header...');
    
    try {
        // Intentar usar auth.logout si está disponible
        if (typeof auth !== 'undefined' && auth && typeof auth.logout === 'function') {
            auth.logout();
        } else {
            // Fallback manual
            limpiarDatosSesion();
            mostrarMensajeExito('Sesión cerrada correctamente');
            
            // Actualizar header inmediatamente
            setTimeout(() => {
                configurarHeaderAdaptativo();
            }, 100);
            
            // Redirigir si estamos en página protegida
            if (esPaginaProtegida()) {
                setTimeout(() => {
                    window.location.href = 'acceder.html';
                }, 1500);
            }
        }
    } catch (error) {
        console.error('Error cerrando sesión:', error);
        limpiarDatosSesion();
        window.location.reload();
    }
}

function limpiarDatosSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
}

function esPaginaProtegida() {
    const paginasProtegidas = ['perfil-cliente.html', 'perfil-admin.html', 'agendar-cita.html'];
    const paginaActual = window.location.pathname.split('/').pop();
    return paginasProtegidas.includes(paginaActual);
}

// ============ UTILIDADES ============

function mostrarMensajeExito(mensaje) {
    const toast = document.createElement('div');
    toast.className = 'toast-success';
    toast.textContent = mensaje;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 10001;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ============ ACTUALIZACIÓN AUTOMÁTICA ============

// Escuchar cambios en localStorage para actualizar header
window.addEventListener('storage', function(event) {
    if (event.key === 'token' || event.key === 'user') {
        console.log('🔄 Cambio detectado en autenticación, actualizando header...');
        setTimeout(configurarHeaderAdaptativo, 100);
    }
});

// Función pública para actualizar header manualmente
window.actualizarHeader = function() {
    console.log('🔄 Actualizando header manualmente...');
    headerInicializado = false;
    inicializarHeaderAdaptativo();
};

// Hacer cerrarSesion global para el onclick
window.cerrarSesion = cerrarSesion;

console.log('✅ Header adaptativo simplificado de CreSer cargado');
