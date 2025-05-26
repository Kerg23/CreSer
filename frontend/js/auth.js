// Sistema de autenticación optimizado para CreSer
class AuthManager {
    constructor() {
        this.user = null;
        this.token = null;
        this.init();
    }

    init() {
        // Cargar datos del localStorage
        this.token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                this.user = JSON.parse(userData);
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.logout();
            }
        }

        // Configurar formulario de login si existe
        this.setupLoginForm();
        
        // Actualizar UI
        this.updateUI();
    }

    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            console.log('✅ Formulario de login configurado');
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const submitButton = event.target.querySelector('button[type="submit"]');
        
        if (!email || !password) {
            mostrarMensaje('Por favor, completa todos los campos', 'error');
            return;
        }
        
        // Validar email básico
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            mostrarMensaje('Por favor, ingresa un email válido', 'error');
            return;
        }
        
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Iniciando sesión...';
        
        try {
            const response = await apiRequest(CONFIG.ENDPOINTS.LOGIN, {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            
            // Manejar respuesta de FastAPI
            this.token = response.access_token;
            this.user = response.user;
            
            if (!this.token || !this.user) {
                throw new Error('Respuesta de login inválida');
            }
            
            // Guardar en localStorage
            localStorage.setItem('token', this.token);
            localStorage.setItem('user', JSON.stringify(this.user));
            
            mostrarMensaje(`¡Bienvenido, ${this.user.nombre}!`, 'success');
            
            // Actualizar UI
            this.updateUI();
            
            // Redirigir según tipo de usuario
            setTimeout(() => {
                if (this.user.tipo === 'administrador') {
                    window.location.href = 'perfil-admin.html';
                } else {
                    window.location.href = 'perfil-cliente.html';
                }
            }, 1500);
            
        } catch (error) {
            console.error('Error en login:', error);
            mostrarMensaje(error.message || 'Error al iniciar sesión', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    }

    async logout() {
        try {
            if (this.token) {
                await apiRequest(CONFIG.ENDPOINTS.LOGOUT, {
                    method: 'POST'
                });
            }
        } catch (error) {
            console.error('Error en logout:', error);
        } finally {
            // Limpiar datos locales
            this.token = null;
            this.user = null;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Actualizar UI
            this.updateUI();
            
            mostrarMensaje('Sesión cerrada correctamente', 'info');
            
            // Redirigir si estamos en página protegida
            if (this.esPaginaProtegida()) {
                setTimeout(() => {
                    window.location.href = 'acceder.html';
                }, 1000);
            }
        }
    }

    isAuthenticated() {
        return !!(this.token && this.user);
    }

    isAdmin() {
        return this.user && this.user.tipo === 'administrador';
    }

    getUser() {
        return this.user;
    }

    updateUI() {
        // Actualizar botón de acceder en navbar
        const botonAcceder = document.querySelector('.boton-acceder a');
        if (botonAcceder) {
            if (this.isAuthenticated()) {
                botonAcceder.textContent = `Hola, ${this.user.nombre}`;
                botonAcceder.href = this.isAdmin() ? 'perfil-admin.html' : 'perfil-cliente.html';
                botonAcceder.classList.remove('activo');
            } else {
                botonAcceder.textContent = 'Acceder';
                botonAcceder.href = 'acceder.html';
            }
        }

        // Mostrar/ocultar elementos admin
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            el.style.display = this.isAdmin() ? 'block' : 'none';
        });
    }

    esPaginaProtegida() {
        const paginasProtegidas = ['perfil-cliente.html', 'perfil-admin.html', 'agendar-cita.html'];
        const paginaActual = window.location.pathname.split('/').pop();
        return paginasProtegidas.includes(paginaActual);
    }

    requireAuth() {
        if (!this.isAuthenticated()) {
            mostrarMensaje('Debes iniciar sesión para acceder a esta página', 'warning');
            setTimeout(() => {
                window.location.href = 'acceder.html';
            }, 2000);
            return false;
        }
        return true;
    }

    requireAdmin() {
        if (!this.requireAuth()) return false;
        
        if (!this.isAdmin()) {
            mostrarMensaje('No tienes permisos para acceder a esta página', 'error');
            setTimeout(() => {
                window.location.href = 'perfil-cliente.html';
            }, 2000);
            return false;
        }
        return true;
    }
}

// Crear instancia global
const auth = new AuthManager();
window.auth = auth;

// Verificar autenticación en páginas protegidas al cargar
document.addEventListener('DOMContentLoaded', function() {
    const paginaActual = window.location.pathname.split('/').pop();
    
    if (paginaActual === 'perfil-admin.html') {
        auth.requireAdmin();
    } else if (['perfil-cliente.html', 'agendar-cita.html'].includes(paginaActual)) {
        auth.requireAuth();
    }
});

console.log('✅ Sistema de autenticación inicializado');
