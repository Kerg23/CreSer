// Configuración global de la aplicación
const CONFIG = {
    API_BASE_URL: 'http://localhost:3000/api', // Cambiar en producción
    ENDPOINTS: {
        // Autenticación
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        VERIFY_TOKEN: '/auth/verify',
        
        // Noticias
        NOTICIAS: '/noticias',
        CREAR_NOTICIA: '/noticias',
        ACTUALIZAR_NOTICIA: '/noticias',
        ELIMINAR_NOTICIA: '/noticias',
        
        // Usuarios
        USUARIOS: '/usuarios',
        PERFIL: '/usuarios/perfil',
        
        // Citas
        CITAS: '/citas',
        AGENDAR_CITA: '/citas',
        CANCELAR_CITA: '/citas',
        
        // Pagos
        PAGOS: '/pagos',
        PROCESAR_PAGO: '/pagos/procesar',
        VERIFICAR_PAGO: '/pagos/verificar',
        
        // Contacto
        CONTACTO: '/contacto'
    },
    
    // Configuración de archivos
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
    
    // Mensajes
    MESSAGES: {
        ERROR_NETWORK: 'Error de conexión. Por favor, intenta nuevamente.',
        ERROR_AUTH: 'No tienes permisos para realizar esta acción.',
        SUCCESS_SAVE: 'Guardado exitosamente',
        SUCCESS_DELETE: 'Eliminado exitosamente',
        CONFIRM_DELETE: '¿Estás seguro de que quieres eliminar este elemento?'
    }
};

// Función para hacer peticiones HTTP
async function apiRequest(endpoint, options = {}) {
    const url = CONFIG.API_BASE_URL + endpoint;
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include'
    };
    
    // Si hay un token, añadirlo a los headers
    const token = localStorage.getItem('token');
    if (token) {
        defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Merge options
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(url, finalOptions);
        
        // Si es 401, redirigir al login
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'acceder.html';
            return;
        }
        
        // Si no es exitoso, lanzar error
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// Función para subir archivos
async function uploadFile(endpoint, formData) {
    const url = CONFIG.API_BASE_URL + endpoint;
    
    const token = localStorage.getItem('token');
    const headers = {};
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: formData,
            credentials: 'include'
        });
        
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'acceder.html';
            return;
        }
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Upload Error:', error);
        throw error;
    }
}

// Función para mostrar mensajes
function mostrarMensaje(texto, tipo = 'info') {
    const contenedor = document.getElementById('mensajes-container') || document.body;
    
    const mensaje = document.createElement('div');
    mensaje.className = `mensaje ${tipo}`;
    mensaje.innerHTML = `
        <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        ${texto}
        <button class="btn-cerrar-mensaje" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    contenedor.appendChild(mensaje);
    
    // Auto-remove después de 5 segundos
    setTimeout(() => {
        if (mensaje.parentElement) {
            mensaje.remove();
        }
    }, 5000);
}

// Función para mostrar/ocultar loading
function mostrarLoading(show = true) {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.style.display = show ? 'flex' : 'none';
    }
}

// Función para validar archivos
function validarArchivo(file, maxSize = CONFIG.MAX_FILE_SIZE, allowedTypes = CONFIG.ALLOWED_IMAGE_TYPES) {
    if (file.size > maxSize) {
        throw new Error(`El archivo es demasiado grande. Tamaño máximo: ${maxSize / (1024 * 1024)}MB`);
    }
    
    if (!allowedTypes.includes(file.type)) {
        throw new Error(`Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(', ')}`);
    }
    
    return true;
}

// Función para formatear fechas
function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Función para formatear precios
function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(precio);
}
