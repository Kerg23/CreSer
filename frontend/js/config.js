// Configuración global de la aplicación CreSer
const CONFIG = {
    API_BASE_URL: 'http://localhost:8000/api',
    ENDPOINTS: {
        // Autenticación
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        REGISTER: '/auth/register',
        VERIFY_TOKEN: '/auth/verify',
        ME: '/auth/me',

        // Usuarios
        USUARIOS: '/usuarios',
        PERFIL: '/usuarios/perfil',
        CREDITOS: '/usuarios/creditos',
        MIS_CITAS: '/citas/mis-citas',
        CAMBIAR_PASSWORD: '/auth/cambiar-password',
        CONFIGURACION: '/usuarios/configuracion',

        // Citas
        CITAS: '/citas',
        AGENDAR_CITA: '/citas/agendar',
        MIS_CITAS: '/citas/mis-citas',
        HORARIOS_DISPONIBLES: '/citas/horarios-disponibles',
        SERVICIOS_DISPONIBLES: '/citas/servicios-disponibles',

        // AGREGADO: Servicios básicos
        SERVICIOS: '/servicios',

        // Pagos
        PAGOS: '/pagos',
        PROCESAR_PAGO: '/pagos/procesar',
        MIS_CREDITOS: '/pagos/mis-creditos',
        PAGOS_PENDIENTES: '/pagos/pendientes',
        APROBAR_PAGO: '/pagos/{id}/aprobar',
        INFO_QR: '/pagos/info-qr',

        // Administración
        ADMIN_ESTADISTICAS: '/admin/estadisticas',
        ADMIN_CITAS_HOY: '/admin/citas-hoy',
        ADMIN_USUARIOS_COMPLETO: '/admin/usuarios-completo',
        ADMIN_PAGOS_DETALLADO: '/admin/pagos-detallado',

        // Noticias
        NOTICIAS: '/noticias/publicas',
        NOTICIAS_DESTACADAS: '/noticias/destacadas',

        // Contacto
        CONTACTO: '/contacto'

        // AGREGADO: Servicios básicos

    },

    // Configuración de la aplicación
    APP_NAME: 'CreSer',
    APP_VERSION: '1.0.0',

    // Configuración de UI
    ITEMS_PER_PAGE: 10,
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],

    // Configuración de tiempo
    TOKEN_REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutos
    REQUEST_TIMEOUT: 30000, // 30 segundos

    // Configuración de validación
    PASSWORD_MIN_LENGTH: 6,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_REGEX: /^[\+]?[1-9][\d]{0,15}$/,

    // Estados de citas
    ESTADOS_CITA: {
        AGENDADA: 'agendada',
        CONFIRMADA: 'confirmada',
        COMPLETADA: 'completada',
        CANCELADA: 'cancelada',
        NO_ASISTIO: 'no_asistio'
    },

    // Estados de pagos
    ESTADOS_PAGO: {
        PENDIENTE: 'pendiente',
        APROBADO: 'aprobado',
        RECHAZADO: 'rechazado'
    },

    // Tipos de usuario
    TIPOS_USUARIO: {
        CLIENTE: 'cliente',
        ADMINISTRADOR: 'administrador'
    },

    // Modalidades de cita
    MODALIDADES: {
        PRESENCIAL: 'presencial',
        VIRTUAL: 'virtual'
    }
};

// Función principal para realizar peticiones a la API
async function apiRequest(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;

    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        credentials: 'include',
        timeout: CONFIG.REQUEST_TIMEOUT
    };

    // Agregar token de autorización si existe
    const token = localStorage.getItem('token');
    if (token) {
        defaultOptions.headers['Authorization'] = `Bearer ${token}`;
    }

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };

    try {
        console.log(`🌐 API Request: ${finalOptions.method} ${url}`);
        console.log('📤 Headers:', finalOptions.headers);

        // Crear AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

        finalOptions.signal = controller.signal;

        const response = await fetch(url, finalOptions);

        clearTimeout(timeoutId);

        console.log(`📥 Response: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error Response:', errorText);

            // Manejo específico de errores de autenticación
            if (response.status === 401) {
                console.warn('Token expirado o inválido, redirigiendo a login...');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/acceder.html';
                return;
            }

            if (response.status === 403) {
                throw new Error('No tienes permisos para realizar esta acción');
            }

            if (response.status === 404) {
                throw new Error('Recurso no encontrado');
            }

            if (response.status >= 500) {
                throw new Error('Error interno del servidor. Intenta nuevamente.');
            }

            throw new Error(errorText || `Error HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ API Success:', data);
        return data;

    } catch (error) {
        console.error('❌ API Error:', error);

        // Manejo específico de errores de red
        if (error.name === 'AbortError') {
            throw new Error('La petición tardó demasiado tiempo. Verifica tu conexión.');
        }

        if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
            throw new Error('Error de conexión con el servidor. Verifica que el backend esté ejecutándose.');
        }

        if (error.message.includes('NetworkError')) {
            throw new Error('Error de red. Verifica tu conexión a internet.');
        }

        throw error;
    }
}

// Función para realizar peticiones con archivos
async function apiRequestWithFile(endpoint, formData, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;

    const defaultOptions = {
        method: 'POST',
        credentials: 'include',
    };

    // Agregar token de autorización si existe
    const token = localStorage.getItem('token');
    if (token) {
        defaultOptions.headers = {
            'Authorization': `Bearer ${token}`
        };
    }

    const finalOptions = {
        ...defaultOptions,
        ...options,
        body: formData
    };

    // No establecer Content-Type para FormData, el navegador lo hace automáticamente
    if (finalOptions.headers && finalOptions.headers['Content-Type']) {
        delete finalOptions.headers['Content-Type'];
    }

    try {
        console.log(`📁 File Upload: ${finalOptions.method} ${url}`);

        const response = await fetch(url, finalOptions);

        console.log(`📥 Upload Response: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Upload Error:', errorText);
            throw new Error(errorText || `Error HTTP ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Upload Success:', data);
        return data;

    } catch (error) {
        console.error('❌ Upload Error:', error);
        throw error;
    }
}

// Funciones de utilidad para la API
const API_UTILS = {
    // Formatear URL con parámetros
    formatUrl: (endpoint, params = {}) => {
        let url = endpoint;
        Object.keys(params).forEach(key => {
            url = url.replace(`{${key}}`, params[key]);
        });
        return url;
    },

    // Construir query string
    buildQueryString: (params) => {
        const queryParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
                queryParams.append(key, params[key]);
            }
        });
        return queryParams.toString();
    },

    // Validar archivo
    validateFile: (file) => {
        if (!file) {
            throw new Error('No se ha seleccionado ningún archivo');
        }

        if (file.size > CONFIG.MAX_FILE_SIZE) {
            throw new Error(`El archivo es demasiado grande. Máximo ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`);
        }

        if (!CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
            throw new Error('Tipo de archivo no permitido');
        }

        return true;
    },

    // Validar email
    validateEmail: (email) => {
        return CONFIG.EMAIL_REGEX.test(email);
    },

    // Validar teléfono
    validatePhone: (phone) => {
        return CONFIG.PHONE_REGEX.test(phone);
    },

    // Validar contraseña
    validatePassword: (password) => {
        return password && password.length >= CONFIG.PASSWORD_MIN_LENGTH;
    }
};

// Funciones de utilidad para formateo
const FORMAT_UTILS = {
    // Formatear precio en pesos colombianos
    formatPrice: (amount) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    },

    // Formatear fecha
    formatDate: (dateString) => {
        if (!dateString) return 'No especificada';

        try {
            let date;
            
            // SOLUCIÓN: Manejar fechas de solo día (YYYY-MM-DD) sin zona horaria
            if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // Crear fecha local sin zona horaria
                const [year, month, day] = dateString.split('-');
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else {
                date = new Date(dateString);
            }
            
            return new Intl.DateTimeFormat('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(date);
        } catch (error) {
            console.error('Error formateando fecha:', error);
            return 'Fecha inválida';
        }
    },

    // Formatear fecha y hora - TAMBIÉN CORREGIDO
    formatDateTime: (dateString) => {
        if (!dateString) return 'No especificada';

        try {
            let date;
            
            if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [year, month, day] = dateString.split('-');
                date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            } else {
                date = new Date(dateString);
            }
            
            return new Intl.DateTimeFormat('es-CO', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).format(date);
        } catch (error) {
            console.error('Error formateando fecha y hora:', error);
            return 'Fecha inválida';
        }
    },

    // Formatear hora
    formatTime: (timeString) => {
        if (!timeString) return 'No especificada';

        // Si es formato HH:MM, convertir a formato 12 horas
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;

        return `${hour12}:${minutes} ${ampm}`;
    },

    // Capitalizar primera letra
    capitalize: (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    // Truncar texto
    truncate: (str, length = 50) => {
        if (!str) return '';
        return str.length > length ? str.substring(0, length) + '...' : str;
    }
};

// Funciones de utilidad para el DOM
const DOM_UTILS = {
    // Mostrar/ocultar elemento
    toggle: (elementId, show = null) => {
        const element = document.getElementById(elementId);
        if (element) {
            if (show === null) {
                element.style.display = element.style.display === 'none' ? 'block' : 'none';
            } else {
                element.style.display = show ? 'block' : 'none';
            }
        }
    },

    // Agregar clase CSS
    addClass: (elementId, className) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add(className);
        }
    },

    // Remover clase CSS
    removeClass: (elementId, className) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove(className);
        }
    },

    // Crear elemento con atributos
    createElement: (tag, attributes = {}, content = '') => {
        const element = document.createElement(tag);

        Object.keys(attributes).forEach(key => {
            element.setAttribute(key, attributes[key]);
        });

        if (content) {
            element.innerHTML = content;
        }

        return element;
    }
};

// Funciones de utilidad para localStorage
const STORAGE_UTILS = {
    // Guardar en localStorage con JSON
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Error guardando en localStorage:', error);
        }
    },

    // Obtener de localStorage con JSON
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error obteniendo de localStorage:', error);
            return defaultValue;
        }
    },

    // Remover de localStorage
    remove: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error removiendo de localStorage:', error);
        }
    },

    // Limpiar localStorage
    clear: () => {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('Error limpiando localStorage:', error);
        }
    }
};

// Funciones globales de utilidad (compatibilidad con código existente)
function formatearPrecio(amount) {
    return FORMAT_UTILS.formatPrice(amount);
}

function formatearFecha(dateString) {
    return FORMAT_UTILS.formatDate(dateString);
}

function formatearFechaHora(dateString) {
    return FORMAT_UTILS.formatDateTime(dateString);
}

function mostrarMensaje(mensaje, tipo = 'info', duracion = 5000) {
    // Crear contenedor de mensajes si no existe
    let container = document.getElementById('mensajes-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'mensajes-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }

    // Crear mensaje
    const mensajeElement = document.createElement('div');
    mensajeElement.className = `mensaje mensaje-${tipo}`;
    mensajeElement.style.cssText = `
        background: ${tipo === 'success' ? '#d4edda' : tipo === 'error' ? '#f8d7da' : tipo === 'warning' ? '#fff3cd' : '#d1ecf1'};
        color: ${tipo === 'success' ? '#155724' : tipo === 'error' ? '#721c24' : tipo === 'warning' ? '#856404' : '#0c5460'};
        border: 1px solid ${tipo === 'success' ? '#c3e6cb' : tipo === 'error' ? '#f5c6cb' : tipo === 'warning' ? '#ffeaa7' : '#bee5eb'};
        padding: 12px 16px;
        margin-bottom: 10px;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease-out;
    `;
    mensajeElement.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${mensaje}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer; color: inherit; margin-left: 10px;">&times;</button>
        </div>
    `;

    // Agregar animación CSS si no existe
    if (!document.getElementById('mensaje-styles')) {
        const styles = document.createElement('style');
        styles.id = 'mensaje-styles';
        styles.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(styles);
    }

    container.appendChild(mensajeElement);

    // Auto-remover después de la duración especificada
    if (duracion > 0) {
        setTimeout(() => {
            if (mensajeElement.parentNode) {
                mensajeElement.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => {
                    if (mensajeElement.parentNode) {
                        mensajeElement.remove();
                    }
                }, 300);
            }
        }, duracion);
    }
}

// Log de inicialización
console.log('✅ Configuración de CreSer cargada');
console.log(`📡 API Base URL: ${CONFIG.API_BASE_URL}`);
console.log(`🏷️ Versión: ${CONFIG.APP_VERSION}`);

// Exportar configuración para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CONFIG,
        apiRequest,
        apiRequestWithFile,
        API_UTILS,
        FORMAT_UTILS,
        DOM_UTILS,
        STORAGE_UTILS
    };
}
