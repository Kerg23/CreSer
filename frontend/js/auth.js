// Gestión de autenticación
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
        
        // Verificar token si existe
        if (this.token) {
            this.verificarToken();
        }
        
        // Actualizar UI
        this.actualizarUI();
    }
    
    async verificarToken() {
        try {
            const response = await apiRequest(CONFIG.ENDPOINTS.VERIFY_TOKEN, {
                method: 'POST'
            });
            
            if (response.valid) {
                this.user = response.user;
                localStorage.setItem('user', JSON.stringify(this.user));
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Error verificando token:', error);
            this.logout();
        }
    }
    
    async login(email, password) {
        try {
            const response = await apiRequest(CONFIG.ENDPOINTS.LOGIN, {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            
            this.token = response.token;
            this.user = response.user;
            
            // Guardar en localStorage
            localStorage.setItem('token', this.token);
            localStorage.setItem('user', JSON.stringify(this.user));
            
            // Actualizar UI
            this.actualizarUI();
            
            return response;
        } catch (error) {
            throw error;
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
            this.actualizarUI();
            
            // Redirigir si estamos en página protegida
            if (this.esPaginaProtegida()) {
                window.location.href = 'acceder.html';
            }
        }
    }
    
    isAuthenticated() {
        return this.token && this.user;
    }
    
    isAdmin() {
        return this.user && this.user.tipo === 'administrador';
    }
    
    getUser() {
        return this.user;
    }
    
    getToken() {
        return this.token;
    }
    
    actualizarUI() {
        const btnAcceder = document.getElementById('btn-acceder');
        const adminPanel = document.getElementById('admin-panel');
        
        if (this.isAuthenticated()) {
            // Usuario logueado
            if (btnAcceder) {
                btnAcceder.textContent = 'Mi Perfil';
                btnAcceder.href = this.isAdmin() ? 'perfil-admin.html' : 'perfil-cliente.html';
            }
            
            // Mostrar panel admin si es administrador
            if (this.isAdmin() && adminPanel) {
                adminPanel.style.display = 'block';
            }
            
            // Mostrar botones de admin en noticias
            if (this.isAdmin()) {
                document.querySelectorAll('.admin-acciones').forEach(el => {
                    el.style.display = 'flex';
                });
            }
        } else {
            // Usuario no logueado
            if (btnAcceder) {
                btnAcceder.textContent = 'Acceder';
                btnAcceder.href = 'acceder.html';
            }
            
            // Ocultar panel admin
            if (adminPanel) {
                adminPanel.style.display = 'none';
            }
            
            // Ocultar botones de admin
            document.querySelectorAll('.admin-acciones').forEach(el => {
                el.style.display = 'none';
            });
        }
    }
    
    esPaginaProtegida() {
        const paginasProtegidas = ['perfil-cliente.html', 'perfil-admin.html'];
        const paginaActual = window.location.pathname.split('/').pop();
        return paginasProtegidas.includes(paginaActual);
    }
    
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'acceder.html';
            return false;
        }
        return true;
    }
    
    requireAdmin() {
        if (!this.isAdmin()) {
            mostrarMensaje('No tienes permisos para realizar esta acción', 'error');
            return false;
        }
        return true;
    }
}

// Instancia global del auth manager
const authManager = new AuthManager();

// Función global para cerrar sesión
function cerrarSesion() {
    authManager.logout();
}
