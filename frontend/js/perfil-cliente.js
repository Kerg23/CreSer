// ============ CONFIGURACIÓN Y VARIABLES GLOBALES ============
let editandoInfo = false;
let datosOriginales = {};
let creditosUsuario = [];
let citasUsuario = [];
let loadingStates = new Set();

// Cache para optimización
const dataCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// ============ UTILIDADES DE OPTIMIZACIÓN ============

// Debounce para optimizar eventos
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Cache manager
class CacheManager {
    static set(key, data) {
        dataCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    static get(key) {
        const cached = dataCache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > CACHE_DURATION) {
            dataCache.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    static clear() {
        dataCache.clear();
    }
    
    static invalidate(pattern) {
        for (const key of dataCache.keys()) {
            if (key.includes(pattern)) {
                dataCache.delete(key);
            }
        }
    }
}

// Loading manager
class LoadingManager {
    static start(operation) {
        loadingStates.add(operation);
        this.updateUI();
    }
    
    static end(operation) {
        loadingStates.delete(operation);
        this.updateUI();
    }
    
    static updateUI() {
        const isLoading = loadingStates.size > 0;
        document.body.classList.toggle('loading', isLoading);
    }
}

// Error handler optimizado
class ErrorHandler {
    static handle(error, operation) {
        console.error(`❌ Error en ${operation}:`, error);
        
        let message = 'Ha ocurrido un error inesperado';
        
        if (error.message.includes('Failed to fetch')) {
            message = 'Error de conexión. Verifica tu internet.';
        } else if (error.message.includes('401')) {
            message = 'Sesión expirada. Redirigiendo...';
            setTimeout(() => this.logout(), 2000);
        } else if (error.message.includes('403')) {
            message = 'No tienes permisos para esta acción';
        } else if (error.message.includes('404')) {
            message = 'Recurso no encontrado';
        } else if (error.message) {
            message = error.message;
        }
        
        mostrarMensaje(message, 'error');
    }
    
    static logout() {
        if (typeof auth !== 'undefined' && auth.logout) {
            auth.logout();
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
        }
    }
}

// ============ INICIALIZACIÓN OPTIMIZADA ============

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando perfil de cliente optimizado...');
    
    // Verificar autenticación
    if (!verificarAutenticacion()) {
        return;
    }
    
    // Inicializar componentes en paralelo
    inicializarPerfil();
});

function verificarAutenticacion() {
    // Verificar con authManager o auth
    const authSystem = window.authManager || window.auth;
    
    if (!authSystem || !authSystem.requireAuth()) {
        console.error('❌ Usuario no autenticado');
        window.location.href = '/login.html';
        return false;
    }
    
    // Verificar que es cliente
    const user = authSystem.getUser();
    if (user && user.tipo !== 'cliente') {
        console.error('❌ Acceso denegado - Solo para clientes');
        window.location.href = '/login.html';
        return false;
    }
    
    return true;
}

async function inicializarPerfil() {
    try {
        // Configurar eventos primero
        configurarEventos();
        
        // Cargar datos en paralelo
        await Promise.allSettled([
            cargarDatosUsuario(),
            cargarCreditos(),
            cargarCitas(),
            cargarHistorialPagos()
        ]);
        
        configurarNotificaciones();
        
        console.log('✅ Perfil de cliente inicializado correctamente');
        
    } catch (error) {
        ErrorHandler.handle(error, 'inicialización del perfil');
    }
}

// ============ CARGA DE DATOS OPTIMIZADA ============

async function cargarDatosUsuario() {
    const operation = 'cargar-usuario';
    
    try {
        LoadingManager.start(operation);
        console.log('🔄 Cargando datos del usuario...');
        
        // Verificar cache
        const cached = CacheManager.get('usuario-datos');
        if (cached) {
            llenarDatosUsuario(cached);
            console.log('✅ Datos del usuario cargados desde cache');
        }
        
        // Cargar datos frescos
        const response = await apiRequest(CONFIG.ENDPOINTS.PERFIL);
        const usuario = response.usuario || response;
        
        CacheManager.set('usuario-datos', usuario);
        llenarDatosUsuario(usuario);
        
        // Guardar datos originales
        datosOriginales = { ...usuario };
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

function llenarDatosUsuario(usuario) {
    // Llenar formulario con datos
    const campos = {
        'nombre': usuario.nombre || '',
        'email': usuario.email || '',
        'telefono': usuario.telefono || '',
        'documento': usuario.documento || ''
    };
    
    Object.entries(campos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.value = valor;
        }
    });
    
    // Actualizar sidebar
    const nombreUsuario = document.getElementById('nombre-usuario');
    const emailUsuario = document.getElementById('email-usuario');
    
    if (nombreUsuario) nombreUsuario.textContent = usuario.nombre || 'Usuario';
    if (emailUsuario) emailUsuario.textContent = usuario.email || '';
    
    // Configuración de notificaciones
    if (usuario.configuracion) {
        const notifConfig = usuario.configuracion;
        const checkboxes = {
            'notif-email': notifConfig.notificaciones_email,
            'notif-sms': notifConfig.notificaciones_sms,
            'notif-recordatorios': notifConfig.recordatorios_citas
        };
        
        Object.entries(checkboxes).forEach(([id, checked]) => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.checked = checked;
        });
    }
}

async function cargarCreditos() {
    const operation = 'cargar-creditos';
    
    try {
        LoadingManager.start(operation);
        console.log('🔄 Cargando créditos del usuario...');
        
        // Verificar cache
        const cached = CacheManager.get('usuario-creditos');
        if (cached) {
            renderizarCreditos(cached);
            console.log('✅ Créditos cargados desde cache');
        }
        
        // Cargar datos frescos
        const response = await apiRequest(CONFIG.ENDPOINTS.CREDITOS);
        const creditos = response.creditos || response || [];
        
        CacheManager.set('usuario-creditos', creditos);
        creditosUsuario = creditos;
        renderizarCreditos(creditos);
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

function renderizarCreditos(creditos) {
    const container = document.querySelector('.creditos-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!creditos || creditos.length === 0) {
        container.innerHTML = `
            <div class="sin-creditos">
                <p>No tienes créditos disponibles.</p>
                <a href="comprar.html" class="btn btn-primary">Comprar créditos aquí</a>
            </div>
        `;
        return;
    }
    
    // Usar fragment para mejor rendimiento
    const fragment = document.createDocumentFragment();
    
    creditos.forEach(credito => {
        const creditoCard = document.createElement('div');
        const cantidadDisponible = credito.cantidad_disponible || credito.cantidad || 0;
        
        creditoCard.className = cantidadDisponible > 0 ? 'credito-card' : 'credito-card sin-creditos';
        
        creditoCard.innerHTML = `
            <div class="credito-header">
                <h4>${credito.servicio_nombre || credito.nombre}</h4>
                <span class="credito-cantidad">${cantidadDisponible} créditos</span>
            </div>
            <p class="credito-descripcion">
                Válido para sesiones de ${credito.duracion || '60'} minutos
            </p>
            <div class="credito-acciones">
                ${cantidadDisponible > 0 ? 
                    `<button onclick="agendarCitaConCredito(${credito.servicio_id || credito.id})" class="btn btn-sm btn-primary">Agendar Cita</button>` : 
                    `<a href="comprar.html?servicio=${credito.servicio_id || credito.id}" class="btn btn-sm btn-outline">Comprar Créditos</a>`
                }
            </div>
        `;
        
        fragment.appendChild(creditoCard);
    });
    
    container.appendChild(fragment);
}

async function cargarCitas() {
    const operation = 'cargar-citas';
    
    try {
        LoadingManager.start(operation);
        console.log('🔄 Cargando citas del usuario...');
        
        // Verificar cache
        const cached = CacheManager.get('usuario-citas');
        if (cached) {
            procesarCitas(cached);
            console.log('✅ Citas cargadas desde cache');
        }
        
        // Cargar datos frescos
        const response = await apiRequest(CONFIG.ENDPOINTS.MIS_CITAS);
        const citas = response.citas || response || [];
        
        CacheManager.set('usuario-citas', citas);
        citasUsuario = citas;
        procesarCitas(citas);
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

function procesarCitas(citas) {
    const ahora = new Date();
    
    // Filtrar citas por estado
    const citasProximas = citas.filter(cita => {
        const fechaCita = new Date(cita.fecha);
        return fechaCita >= ahora && ['agendada', 'confirmada'].includes(cita.estado);
    });
    
    const citasPasadas = citas.filter(cita => {
        const fechaCita = new Date(cita.fecha);
        return fechaCita < ahora || cita.estado === 'completada';
    });
    
    const citasCanceladas = citas.filter(cita => cita.estado === 'cancelada');
    
    // Actualizar contadores en tabs
    actualizarContadoresTabs({
        proximas: citasProximas.length,
        pasadas: citasPasadas.length,
        canceladas: citasCanceladas.length
    });
    
    // Mostrar citas próximas por defecto
    renderizarCitas(citasProximas, 'proximas');
}

function actualizarContadoresTabs(contadores) {
    Object.entries(contadores).forEach(([tipo, count]) => {
        const tab = document.getElementById(`tab-${tipo}`);
        if (tab) {
            const counter = tab.querySelector('.counter');
            if (counter) {
                counter.textContent = count;
            }
        }
    });
}

function renderizarCitas(citas, tipo) {
    const container = document.querySelector('.citas-lista');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (citas.length === 0) {
        const mensajes = {
            'proximas': 'No tienes citas próximas.',
            'pasadas': 'No tienes historial de citas.',
            'canceladas': 'No tienes citas canceladas.'
        };
        
        container.innerHTML = `
            <div class="sin-citas">
                <p>${mensajes[tipo] || 'No hay citas en esta categoría.'}</p>
                ${tipo === 'proximas' ? '<button onclick="mostrarModalNuevaCita()" class="btn btn-primary">Agendar Nueva Cita</button>' : ''}
            </div>
        `;
        return;
    }
    
    // Usar fragment para mejor rendimiento
    const fragment = document.createDocumentFragment();
    
    citas.forEach(cita => {
        const citaCard = document.createElement('div');
        citaCard.className = `cita-card ${tipo}`;
        
        const fecha = new Date(cita.fecha);
        const dia = fecha.getDate();
        const mes = fecha.toLocaleDateString('es-ES', { month: 'short' });
        
        citaCard.innerHTML = `
            <div class="cita-fecha">
                <div class="dia">${dia}</div>
                <div class="mes">${mes}</div>
            </div>
            <div class="cita-info">
                <h4>${cita.servicio_nombre || 'Servicio'}</h4>
                <p><strong>Fecha:</strong> ${formatearFecha(cita.fecha)}</p>
                <p><strong>Hora:</strong> ${cita.hora}</p>
                <p><strong>Modalidad:</strong> ${cita.modalidad}</p>
                <p><strong>Estado:</strong> <span class="estado ${cita.estado}">${cita.estado}</span></p>
                ${cita.link_virtual ? `<p><strong>Link:</strong> <a href="${cita.link_virtual}" target="_blank">Unirse a la sesión</a></p>` : ''}
            </div>
            <div class="cita-acciones">
                ${tipo === 'proximas' && cita.estado === 'agendada' ? `
                    <button onclick="cancelarCita(${cita.id})" class="btn btn-sm btn-danger">Cancelar</button>
                ` : ''}
                <button onclick="verDetallesCita(${cita.id})" class="btn btn-sm btn-outline">Ver Detalles</button>
            </div>
        `;
        
        fragment.appendChild(citaCard);
    });
    
    container.appendChild(fragment);
}

async function cargarHistorialPagos() {
    const operation = 'cargar-pagos';
    
    try {
        LoadingManager.start(operation);
        console.log('🔄 Cargando historial de pagos...');
        
        // Para MVP, usar datos de ejemplo
        const pagos = [
            {
                id: 1,
                fecha: '2025-05-20',
                concepto: 'Paquete Psicoterapia 4 Sesiones',
                metodo: 'QR',
                monto: 260000,
                estado: 'aprobado'
            },
            {
                id: 2,
                fecha: '2025-05-10',
                concepto: 'Orientación Familiar',
                metodo: 'QR',
                monto: 110000,
                estado: 'aprobado'
            }
        ];
        
        renderizarHistorialPagos(pagos);
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

function renderizarHistorialPagos(pagos) {
    const tbody = document.querySelector('#tabla-pagos tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!pagos || pagos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay historial de pagos</td></tr>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    pagos.forEach(pago => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatearFecha(pago.fecha)}</td>
            <td>${pago.concepto}</td>
            <td>${pago.metodo}</td>
            <td>${formatearPrecio(pago.monto)}</td>
            <td><span class="estado ${pago.estado}">${pago.estado}</span></td>
            <td>
                <button onclick="verComprobantePago(${pago.id})" class="btn btn-sm btn-outline">Ver</button>
            </td>
        `;
        fragment.appendChild(row);
    });
    
    tbody.appendChild(fragment);
}

// ============ CONFIGURACIÓN DE EVENTOS OPTIMIZADA ============

function configurarEventos() {
    console.log('🔧 Configurando eventos del perfil...');
    
    // Navegación del sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const seccion = this.dataset.section;
            if (seccion) {
                mostrarSeccion(seccion);
            }
        });
    });
    
    // Botón editar información
    const btnEditar = document.getElementById('btn-editar-info');
    if (btnEditar) {
        btnEditar.addEventListener('click', toggleEditarInfo);
    }
    
    // Formulario de información personal
    const formInfo = document.getElementById('form-info-personal');
    if (formInfo) {
        formInfo.addEventListener('submit', guardarInformacionPersonal);
    }
    
    // Botón cancelar edición
    const btnCancelar = document.getElementById('btn-cancelar-info');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', cancelarEdicion);
    }
    
    // Formulario de cambiar contraseña
    const formPassword = document.getElementById('form-cambiar-password');
    if (formPassword) {
        formPassword.addEventListener('submit', cambiarPassword);
    }
    
    // Tabs de citas
    document.querySelectorAll('.tab-citas').forEach(tab => {
        tab.addEventListener('click', function() {
            const tipo = this.dataset.tipo;
            if (tipo) {
                cambiarTabCitas(tipo);
            }
        });
    });
    
    // Avatar
    const btnCambiarAvatar = document.getElementById('btn-cambiar-avatar');
    const inputAvatar = document.getElementById('input-avatar');
    
    if (btnCambiarAvatar && inputAvatar) {
        btnCambiarAvatar.addEventListener('click', () => inputAvatar.click());
        inputAvatar.addEventListener('change', cambiarAvatar);
    }
    
    // Botón nueva cita
    const btnNuevaCita = document.getElementById('btn-nueva-cita');
    if (btnNuevaCita) {
        btnNuevaCita.addEventListener('click', mostrarModalNuevaCita);
    }
    
    // Botón cerrar sesión
    const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
    if (btnCerrarSesion) {
        btnCerrarSesion.addEventListener('click', cerrarSesion);
    }
    
    // Botón eliminar cuenta
    const btnEliminarCuenta = document.getElementById('btn-eliminar-cuenta');
    if (btnEliminarCuenta) {
        btnEliminarCuenta.addEventListener('click', confirmarEliminacion);
    }
    
    console.log('✅ Eventos configurados correctamente');
}

// ============ GESTIÓN DE INFORMACIÓN PERSONAL ============

function toggleEditarInfo() {
    editandoInfo = !editandoInfo;
    
    const campos = ['nombre', 'telefono', 'documento'];
    const btnEditar = document.getElementById('btn-editar-info');
    const formActions = document.getElementById('form-actions');
    
    campos.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento) {
            elemento.disabled = !editandoInfo;
        }
    });
    
    if (btnEditar) {
        btnEditar.textContent = editandoInfo ? 'Editando...' : 'Editar';
        btnEditar.disabled = editandoInfo;
    }
    
    if (formActions) {
        formActions.style.display = editandoInfo ? 'flex' : 'none';
    }
    
    if (!editandoInfo) {
        restaurarDatosOriginales();
    }
}

function restaurarDatosOriginales() {
    const campos = ['nombre', 'telefono', 'documento'];
    campos.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento && datosOriginales[campo] !== undefined) {
            elemento.value = datosOriginales[campo] || '';
        }
    });
}

function cancelarEdicion() {
    if (editandoInfo) {
        toggleEditarInfo();
    }
}

async function guardarInformacionPersonal(event) {
    event.preventDefault();
    
    const operation = 'guardar-info';
    
    try {
        LoadingManager.start(operation);
        
        const formData = new FormData(event.target);
        const datosActualizados = {
            nombre: formData.get('nombre'),
            telefono: formData.get('telefono'),
            documento: formData.get('documento')
        };
        
        await apiRequest(CONFIG.ENDPOINTS.PERFIL, {
            method: 'PUT',
            body: JSON.stringify(datosActualizados)
        });
        
        mostrarMensaje('Información actualizada correctamente', 'success');
        
        // Actualizar datos originales y cache
        datosOriginales = { ...datosOriginales, ...datosActualizados };
        CacheManager.invalidate('usuario');
        
        toggleEditarInfo();
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

async function cambiarPassword(event) {
    event.preventDefault();
    
    const operation = 'cambiar-password';
    
    try {
        LoadingManager.start(operation);
        
        const formData = new FormData(event.target);
        const passwordActual = formData.get('password-actual');
        const passwordNueva = formData.get('password-nueva');
        const passwordConfirmar = formData.get('password-confirmar');
        
        if (passwordNueva !== passwordConfirmar) {
            mostrarMensaje('Las contraseñas no coinciden', 'error');
            return;
        }
        
        if (passwordNueva.length < 6) {
            mostrarMensaje('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        await apiRequest(CONFIG.ENDPOINTS.CAMBIAR_PASSWORD, {
            method: 'PUT',
            body: JSON.stringify({
                password_actual: passwordActual,
                password_nueva: passwordNueva
            })
        });
        
        mostrarMensaje('Contraseña cambiada correctamente', 'success');
        event.target.reset();
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

// ============ GESTIÓN DE CITAS ============

function cambiarTabCitas(tipo) {
    // Actualizar tabs activos
    document.querySelectorAll('.tab-citas').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const tabActivo = document.querySelector(`[data-tipo="${tipo}"]`);
    if (tabActivo) {
        tabActivo.classList.add('active');
    }
    
    // Filtrar y mostrar citas según el tipo
    const ahora = new Date();
    let citasFiltradas = [];
    
    switch (tipo) {
        case 'proximas':
            citasFiltradas = citasUsuario.filter(cita => {
                const fechaCita = new Date(cita.fecha);
                return fechaCita >= ahora && ['agendada', 'confirmada'].includes(cita.estado);
            });
            break;
        case 'pasadas':
            citasFiltradas = citasUsuario.filter(cita => {
                const fechaCita = new Date(cita.fecha);
                return fechaCita < ahora || cita.estado === 'completada';
            });
            break;
        case 'canceladas':
            citasFiltradas = citasUsuario.filter(cita => cita.estado === 'cancelada');
            break;
    }
    
    renderizarCitas(citasFiltradas, tipo);
}

async function cancelarCita(citaId) {
    if (!confirm('¿Estás seguro de que quieres cancelar esta cita?')) return;
    
    const operation = `cancelar-cita-${citaId}`;
    
    try {
        LoadingManager.start(operation);
        
        const motivo = prompt('Motivo de la cancelación (opcional):');
        
        await apiRequest(`${CONFIG.ENDPOINTS.CITAS}/${citaId}/cancelar`, {
            method: 'PUT',
            body: JSON.stringify({
                motivo: motivo || 'Cancelada por el cliente'
            })
        });
        
        mostrarMensaje('Cita cancelada exitosamente', 'success');
        
        // Invalidar cache y recargar datos
        CacheManager.invalidate('citas');
        CacheManager.invalidate('creditos');
        
        await Promise.all([
            cargarCitas(),
            cargarCreditos()
        ]);
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

function verDetallesCita(citaId) {
    const cita = citasUsuario.find(c => c.id === citaId);
    if (!cita) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-detalles-cita';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); display: flex; align-items: center; 
        justify-content: center; z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="background: white; padding: 20px; border-radius: 8px; max-width: 500px; width: 90%;">
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3>Detalles de la Cita</h3>
                <button onclick="this.closest('.modal-detalles-cita').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            <div class="cita-detalles">
                <p><strong>Servicio:</strong> ${cita.servicio_nombre}</p>
                <p><strong>Fecha:</strong> ${formatearFecha(cita.fecha)}</p>
                <p><strong>Hora:</strong> ${cita.hora}</p>
                <p><strong>Modalidad:</strong> ${cita.modalidad}</p>
                <p><strong>Estado:</strong> <span class="estado ${cita.estado}">${cita.estado}</span></p>
                ${cita.comentarios_cliente ? `<p><strong>Tus comentarios:</strong> ${cita.comentarios_cliente}</p>` : ''}
                ${cita.link_virtual ? `<p><strong>Link de la sesión:</strong> <a href="${cita.link_virtual}" target="_blank">Unirse</a></p>` : ''}
            </div>
            <div class="modal-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="this.closest('.modal-detalles-cita').remove()" class="btn btn-secondary">Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cerrar modal al hacer click fuera
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function mostrarModalNuevaCita() {
    // Redirigir a página de agendar cita
    window.location.href = '/agendar-cita.html';
}

function agendarCitaConCredito(servicioId) {
    // Redirigir a página de agendar cita con servicio preseleccionado
    window.location.href = `/agendar-cita.html?servicio=${servicioId}`;
}

// ============ CONFIGURACIÓN Y NOTIFICACIONES ============

function configurarNotificaciones() {
    const switches = ['notif-email', 'notif-sms', 'notif-recordatorios'];
    
    switches.forEach(switchId => {
        const elemento = document.getElementById(switchId);
        if (elemento) {
            elemento.addEventListener('change', debounce(guardarConfiguracionNotificaciones, 500));
        }
    });
}

async function guardarConfiguracionNotificaciones() {
    const operation = 'guardar-notificaciones';
    
    try {
        LoadingManager.start(operation);
        
        const configuracion = {
            notificaciones_email: document.getElementById('notif-email')?.checked || false,
            notificaciones_sms: document.getElementById('notif-sms')?.checked || false,
            recordatorios_citas: document.getElementById('notif-recordatorios')?.checked || false
        };
        
        await apiRequest(CONFIG.ENDPOINTS.CONFIGURACION, {
            method: 'PUT',
            body: JSON.stringify(configuracion)
        });
        
        mostrarMensaje('Configuración de notificaciones actualizada', 'success');
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
        // Revertir cambios en caso de error
        await cargarDatosUsuario();
    } finally {
        LoadingManager.end(operation);
    }
}

// ============ FUNCIONES AUXILIARES ============

function mostrarSeccion(seccionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar sección seleccionada
    const seccion = document.getElementById(seccionId);
    if (seccion) {
        seccion.classList.add('active');
    }
    
    // Actualizar navegación
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const navItem = document.querySelector(`[data-section="${seccionId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
}

async function cambiarAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const operation = 'cambiar-avatar';
    
    try {
        LoadingManager.start(operation);
        
        // Validar archivo
        if (file.size > 5 * 1024 * 1024) { // 5MB
            throw new Error('El archivo es demasiado grande. Máximo 5MB.');
        }
        
        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
            throw new Error('Tipo de archivo no permitido. Solo JPG, JPEG y PNG.');
        }
        
        const formData = new FormData();
        formData.append('avatar', file);
        
        const response = await apiRequestWithFile('/usuarios/avatar', formData);
        
        // Actualizar imagen del avatar
        const avatarImg = document.getElementById('avatar-usuario');
        if (avatarImg && response.avatarUrl) {
            avatarImg.src = response.avatarUrl;
        }
        
        mostrarMensaje('Avatar actualizado exitosamente', 'success');
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

function verComprobantePago(pagoId) {
    mostrarMensaje('Funcionalidad de comprobantes en desarrollo', 'info');
}

async function confirmarEliminacion() {
    if (!confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) {
        return;
    }
    
    if (!confirm('Se eliminarán todos tus datos permanentemente. ¿Continuar?')) {
        return;
    }
    
    const operation = 'eliminar-cuenta';
    
    try {
        LoadingManager.start(operation);
        
        await apiRequest('/usuarios/eliminar', {
            method: 'DELETE'
        });
        
        mostrarMensaje('Cuenta eliminada exitosamente', 'success');
        
        // Cerrar sesión y redirigir
        setTimeout(() => {
            ErrorHandler.logout();
        }, 2000);
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

function cerrarSesion() {
    if (confirm('¿Estás seguro de que quieres cerrar la sesión?')) {
        CacheManager.clear();
        ErrorHandler.logout();
    }
}

// Limpiar cache cuando se cierra la página
window.addEventListener('beforeunload', function() {
    CacheManager.clear();
});

console.log('✅ Perfil de cliente optimizado cargado correctamente');
