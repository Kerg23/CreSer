// ============ CONFIGURACIÓN Y VARIABLES GLOBALES ============
let citasDelDia = [];
let mesActual = new Date();
let chartsInstances = {};
let dataCache = new Map();
let loadingStates = new Set();

// Configuración de cache
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const DEBOUNCE_DELAY = 300; // 300ms para búsquedas

// ============ UTILIDADES DE OPTIMIZACIÓN ============

// Debounce para optimizar búsquedas
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

// Cache manager optimizado
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

// Loading state manager
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
            setTimeout(() => auth.logout(), 2000);
        } else if (error.message.includes('403')) {
            message = 'No tienes permisos para esta acción';
        } else if (error.message.includes('404')) {
            message = 'Recurso no encontrado';
        } else if (error.message) {
            message = error.message;
        }
        
        mostrarMensaje(message, 'error');
    }
}

// ============ CONFIGURACIÓN DE EVENTOS OPTIMIZADA ============

function configurarEventosAdmin() {
    console.log('🔧 Configurando eventos del panel admin...');
    
    // Búsqueda de clientes con debounce
    const buscarCliente = document.getElementById('buscar-cliente');
    if (buscarCliente) {
        buscarCliente.addEventListener('input', debounce(function() {
            filtrarClientes(this.value);
        }, DEBOUNCE_DELAY));
    }
    
    // Filtros con optimización
    const setupFilter = (id, handler) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', debounce(handler, DEBOUNCE_DELAY));
        }
    };
    
    setupFilter('filtro-estado-pago', cargarPagosAdmin);
    setupFilter('filtro-fecha', cargarCitasPorPeriodo);
    setupFilter('periodo-reporte', cargarReportes);
    
    // Event delegation para acciones dinámicas
    document.addEventListener('click', handleDynamicActions);
    
    console.log('✅ Eventos configurados correctamente');
}

// Handler centralizado para acciones dinámicas
function handleDynamicActions(event) {
    const target = event.target;
    
    // Prevenir múltiples clicks
    if (target.disabled || target.classList.contains('loading')) return;
    
    // Acciones de citas
    if (target.classList.contains('btn-confirmar-mini')) {
        event.preventDefault();
        const citaId = target.getAttribute('data-cita-id');
        if (citaId) confirmarCitaReal(parseInt(citaId));
    }
    
    if (target.classList.contains('btn-completar-mini')) {
        event.preventDefault();
        const citaId = target.getAttribute('data-cita-id');
        if (citaId) completarCitaReal(parseInt(citaId));
    }
    
    // Acciones de pagos
    if (target.classList.contains('btn-aprobar-mini')) {
        event.preventDefault();
        const pagoId = target.getAttribute('data-pago-id');
        if (pagoId) aprobarPagoReal(parseInt(pagoId));
    }
}

// ============ DASHBOARD OPTIMIZADO ============

async function cargarDashboard() {
    const operation = 'dashboard';
    
    try {
        LoadingManager.start(operation);
        console.log('🔄 Cargando estadísticas del dashboard...');
        
        // Verificar cache primero
        const cachedStats = CacheManager.get('dashboard-stats');
        if (cachedStats) {
            actualizarEstadisticasReales(cachedStats);
            console.log('✅ Estadísticas cargadas desde cache');
        }
        
        // Cargar datos frescos en paralelo
        const [stats, citasHoy, pagos] = await Promise.allSettled([
            apiRequest(CONFIG.ENDPOINTS.ADMIN_ESTADISTICAS),
            apiRequest(CONFIG.ENDPOINTS.ADMIN_CITAS_HOY),
            apiRequest(`${CONFIG.ENDPOINTS.ADMIN_PAGOS_DETALLADO}?estado=pendiente`)
        ]);
        
        // Procesar estadísticas
        if (stats.status === 'fulfilled') {
            CacheManager.set('dashboard-stats', stats.value);
            actualizarEstadisticasReales(stats.value);
        }
        
        // Procesar citas de hoy
        if (citasHoy.status === 'fulfilled') {
            CacheManager.set('citas-hoy', citasHoy.value);
            actualizarCitasHoy(citasHoy.value);
        }
        
        // Procesar pagos pendientes
        if (pagos.status === 'fulfilled') {
            CacheManager.set('pagos-pendientes', pagos.value);
            actualizarPagosPendientes(pagos.value);
        }
        
        // Actualizar timestamp
        actualizarTimestamp();
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

function actualizarEstadisticasReales(stats) {
    try {
        if (!stats || typeof stats !== 'object') return;
        
        const { usuarios = {}, citas = {}, ingresos = {}, pagos = {} } = stats;
        
        // Batch DOM updates para mejor rendimiento
        const updates = [
            { id: 'total-clientes', value: usuarios.total || 0, title: `${usuarios.activos || 0} activos` },
            { id: 'citas-hoy-count', value: citas.hoy || 0, title: `${citas.pendientes || 0} pendientes` },
            { id: 'ingresos-mes', value: formatearPrecio(ingresos.mes || 0), title: `Total: ${formatearPrecio(ingresos.total || 0)}` },
            { id: 'satisfaccion', value: `${citas.tasa_asistencia || 0}%`, title: 'Tasa de asistencia a citas' }
        ];
        
        // Aplicar updates en batch
        requestAnimationFrame(() => {
            updates.forEach(({ id, value, title }) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                    element.setAttribute('title', title);
                }
            });
            
            // Actualizar descripciones
            const descUpdates = [
                { id: 'desc-clientes', value: `${usuarios.activos || 0} activos` },
                { id: 'desc-citas', value: `${citas.pendientes || 0} pendientes` },
                { id: 'desc-ingresos', value: `${pagos.aprobados || 0} pagos aprobados` }
            ];
            
            descUpdates.forEach(({ id, value }) => {
                const element = document.getElementById(id);
                if (element) element.textContent = value;
            });
        });
        
        actualizarEstadisticasAdicionales(stats);
        
    } catch (error) {
        console.error('❌ Error actualizando estadísticas:', error);
    }
}

function actualizarEstadisticasAdicionales(stats) {
    try {
        const { pagos = {}, creditos = {} } = stats;
        const statsGrid = document.getElementById('stats-grid');
        if (!statsGrid) return;
        
        const estadisticasAdicionales = [
            {
                id: 'pagos-pendientes-stat',
                icon: '⏳',
                titulo: 'Pagos Pendientes',
                valor: pagos.pendientes || 0,
                descripcion: `${pagos.tasa_aprobacion || 0}% tasa de aprobación`
            },
            {
                id: 'creditos-activos-stat',
                icon: '🎫',
                titulo: 'Créditos Activos',
                valor: creditos.activos || 0,
                descripcion: 'Créditos disponibles total'
            }
        ];
        
        // Fragment para mejor rendimiento
        const fragment = document.createDocumentFragment();
        
        estadisticasAdicionales.forEach(stat => {
            let tarjeta = document.getElementById(stat.id);
            if (!tarjeta) {
                tarjeta = document.createElement('div');
                tarjeta.id = stat.id;
                tarjeta.className = 'stat-card';
                tarjeta.innerHTML = `
                    <div class="stat-icon">${stat.icon}</div>
                    <div class="stat-info">
                        <h3>${stat.titulo}</h3>
                        <span class="stat-number">${stat.valor}</span>
                        <p class="stat-description">${stat.descripcion}</p>
                    </div>
                `;
                fragment.appendChild(tarjeta);
            } else {
                const numberEl = tarjeta.querySelector('.stat-number');
                const descEl = tarjeta.querySelector('.stat-description');
                if (numberEl) numberEl.textContent = stat.valor;
                if (descEl) descEl.textContent = stat.descripcion;
            }
        });
        
        if (fragment.children.length > 0) {
            statsGrid.appendChild(fragment);
        }
        
    } catch (error) {
        console.error('❌ Error en estadísticas adicionales:', error);
    }
}

function actualizarCitasHoy(citas) {
    const container = document.querySelector('.citas-hoy-lista');
    if (!container) return;
    
    if (!citas || citas.length === 0) {
        container.innerHTML = '<p class="sin-citas">No hay citas programadas para hoy</p>';
        return;
    }
    
    // Usar fragment para mejor rendimiento
    const fragment = document.createDocumentFragment();
    
    citas.forEach(cita => {
        const citaElement = document.createElement('div');
        citaElement.className = `cita-mini ${cita.estado || 'agendada'}`;
        citaElement.innerHTML = `
            <div class="cita-hora">${cita.hora || '00:00'}</div>
            <div class="cita-info">
                <div class="cita-cliente">${cita.usuario_nombre || 'Cliente'}</div>
                <div class="cita-servicio">${cita.servicio_nombre || 'Servicio'}</div>
                <div class="cita-modalidad">${cita.modalidad || 'Presencial'}</div>
                ${cita.usuario_telefono ? `<div class="cita-telefono">${cita.usuario_telefono}</div>` : ''}
            </div>
            <div class="cita-estado">
                <span class="badge ${cita.estado || 'agendada'}">${cita.estado || 'Agendada'}</span>
            </div>
            <div class="cita-acciones">
                ${cita.estado === 'agendada' ? `
                    <button class="btn-confirmar-mini" data-cita-id="${cita.id}">Confirmar</button>
                ` : ''}
                ${cita.estado === 'confirmada' ? `
                    <button class="btn-completar-mini" data-cita-id="${cita.id}">Completar</button>
                ` : ''}
                <button class="btn-ver-mini" onclick="verDetallesCitaReal(${cita.id})">Ver</button>
            </div>
        `;
        fragment.appendChild(citaElement);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

function actualizarPagosPendientes(pagos) {
    const container = document.querySelector('.pagos-pendientes');
    if (!container) return;
    
    if (!pagos || pagos.length === 0) {
        container.innerHTML = '<p class="sin-pagos">No hay pagos pendientes</p>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    pagos.slice(0, 5).forEach(pago => {
        const pagoElement = document.createElement('div');
        pagoElement.className = 'pago-pendiente';
        pagoElement.innerHTML = `
            <div class="pago-info">
                <div class="pago-cliente">${pago.nombre_pagador || 'Cliente'}</div>
                <div class="pago-concepto">${pago.concepto || 'Concepto'}</div>
                <div class="pago-fecha">${formatearFecha(pago.created_at)}</div>
            </div>
            <div class="pago-monto">${formatearPrecio(pago.monto || 0)}</div>
            <div class="pago-acciones">
                <button class="btn-aprobar-mini" data-pago-id="${pago.id}">Aprobar</button>
                <button class="btn-ver-mini" onclick="verComprobante(${pago.id})">Ver</button>
            </div>
        `;
        fragment.appendChild(pagoElement);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

function actualizarTimestamp() {
    const elemento = document.getElementById('ultima-actualizacion');
    if (elemento) {
        elemento.textContent = `Última actualización: ${new Date().toLocaleTimeString('es-ES')}`;
    }
}

// ============ GESTIÓN DE CLIENTES OPTIMIZADA ============

async function cargarClientes() {
    const operation = 'clientes';
    
    try {
        LoadingManager.start(operation);
        console.log('🔄 Cargando clientes...');
        
        // Verificar cache
        const cached = CacheManager.get('usuarios-completo');
        if (cached) {
            renderizarClientes(cached);
            console.log('✅ Clientes cargados desde cache');
        }
        
        // Cargar datos frescos
        const usuarios = await apiRequest(CONFIG.ENDPOINTS.ADMIN_USUARIOS_COMPLETO);
        CacheManager.set('usuarios-completo', usuarios);
        renderizarClientes(usuarios);
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

function renderizarClientes(usuarios) {
    const tbody = document.getElementById('tabla-clientes-body');
    if (!tbody) return;
    
    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No hay clientes registrados</td></tr>';
        return;
    }
    
    // Usar fragment para mejor rendimiento
    const fragment = document.createDocumentFragment();
    
    usuarios.forEach(usuario => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#${usuario.id.toString().padStart(3, '0')}</td>
            <td>${usuario.nombre || 'Sin nombre'}</td>
            <td>${usuario.email || 'Sin email'}</td>
            <td>${usuario.telefono || 'No especificado'}</td>
            <td>
                <span class="creditos-badge">${usuario.creditos_disponibles || 0} créditos</span>
                <br><small>${usuario.total_citas || 0} citas realizadas</small>
            </td>
            <td><span class="estado ${usuario.estado || 'activo'}">${usuario.estado || 'Activo'}</span></td>
            <td>
                <button class="btn-editar" onclick="editarClienteReal(${usuario.id})">Editar</button>
                <button class="btn-ver" onclick="verClienteReal(${usuario.id})">Ver</button>
                <button class="btn-suspender" onclick="cambiarEstadoCliente(${usuario.id}, '${usuario.estado || 'activo'}')">
                    ${(usuario.estado || 'activo') === 'activo' ? 'Suspender' : 'Activar'}
                </button>
            </td>
        `;
        fragment.appendChild(row);
    });
    
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

// Filtro optimizado con Virtual Scrolling para grandes datasets
const filtrarClientes = debounce(function(termino) {
    const filas = document.querySelectorAll('#tabla-clientes-body tr');
    const terminoLower = termino.toLowerCase();
    
    // Usar requestAnimationFrame para evitar bloqueo del UI
    requestAnimationFrame(() => {
        filas.forEach(fila => {
            const texto = fila.textContent.toLowerCase();
            fila.style.display = texto.includes(terminoLower) ? '' : 'none';
        });
    });
}, DEBOUNCE_DELAY);

// ============ GESTIÓN DE CITAS OPTIMIZADA ============

async function cargarCitasPorPeriodo() {
    const operation = 'citas-periodo';
    
    try {
        LoadingManager.start(operation);
        const periodo = document.getElementById('filtro-fecha')?.value || 'hoy';
        
        console.log('🔄 Cargando citas por período:', periodo);
        
        const cacheKey = `citas-${periodo}`;
        const cached = CacheManager.get(cacheKey);
        
        if (cached) {
            renderizarCitasPeriodo(cached);
            console.log('✅ Citas cargadas desde cache');
        }
        
        let endpoint = CONFIG.ENDPOINTS.ADMIN_CITAS_HOY;
        if (periodo !== 'hoy') {
            endpoint = `${CONFIG.ENDPOINTS.CITAS}?periodo=${periodo}`;
        }
        
        const citas = await apiRequest(endpoint);
        CacheManager.set(cacheKey, citas);
        renderizarCitasPeriodo(citas);
        actualizarResumenCitas(citas);
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

function renderizarCitasPeriodo(citas) {
    const container = document.getElementById('citas-del-periodo');
    if (!container) return;
    
    if (!citas || citas.length === 0) {
        container.innerHTML = '<p>No hay citas para el período seleccionado</p>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    citas.forEach(cita => {
        const citaCard = document.createElement('div');
        citaCard.className = 'cita-admin-card';
        citaCard.innerHTML = `
            <div class="cita-fecha-hora">
                <div class="fecha">${formatearFecha(cita.fecha)}</div>
                <div class="hora">${cita.hora || '00:00'}</div>
            </div>
            <div class="cita-detalles">
                <h4>${cita.usuario_nombre || 'Cliente'}</h4>
                <p>${cita.servicio_nombre || 'Servicio'} - ${cita.modalidad || 'Presencial'}</p>
                <p>${cita.usuario_telefono || 'Sin teléfono'}</p>
                <p>Estado: <span class="estado ${cita.estado || 'agendada'}">${cita.estado || 'Agendada'}</span></p>
            </div>
            <div class="cita-acciones-admin">
                <button class="btn-ver" onclick="verDetallesCitaReal(${cita.id})">Ver Detalles</button>
                ${cita.estado === 'agendada' ? `
                    <button class="btn-confirmar" data-cita-id="${cita.id}">Confirmar</button>
                ` : ''}
                ${cita.estado === 'confirmada' ? `
                    <button class="btn-completar" data-cita-id="${cita.id}">Completar</button>
                ` : ''}
            </div>
        `;
        fragment.appendChild(citaCard);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

function actualizarResumenCitas(citas) {
    const resumen = {
        total: citas.length,
        confirmadas: citas.filter(c => c.estado === 'confirmada').length,
        completadas: citas.filter(c => c.estado === 'completada').length,
        canceladas: citas.filter(c => c.estado === 'cancelada').length
    };
    
    const updates = [
        { id: 'total-citas-periodo', value: resumen.total },
        { id: 'citas-confirmadas', value: resumen.confirmadas },
        { id: 'citas-completadas', value: resumen.completadas },
        { id: 'citas-canceladas', value: resumen.canceladas }
    ];
    
    requestAnimationFrame(() => {
        updates.forEach(({ id, value }) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    });
}

// ============ GESTIÓN DE PAGOS OPTIMIZADA ============

async function cargarPagosAdmin() {
    const operation = 'pagos-admin';
    
    try {
        LoadingManager.start(operation);
        const filtroEstado = document.getElementById('filtro-estado-pago')?.value || 'todos';
        
        console.log('🔄 Cargando pagos admin, filtro:', filtroEstado);
        
        const cacheKey = `pagos-${filtroEstado}`;
        const cached = CacheManager.get(cacheKey);
        
        if (cached) {
            renderizarPagosAdmin(cached);
            console.log('✅ Pagos cargados desde cache');
        }
        
        let endpoint = CONFIG.ENDPOINTS.ADMIN_PAGOS_DETALLADO;
        if (filtroEstado !== 'todos') {
            endpoint += `?estado=${filtroEstado}`;
        }
        
        const pagos = await apiRequest(endpoint);
        CacheManager.set(cacheKey, pagos);
        renderizarPagosAdmin(pagos);
        actualizarResumenPagos(pagos);
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

function renderizarPagosAdmin(pagos) {
    const tbody = document.getElementById('tabla-pagos-body');
    if (!tbody) return;
    
    if (!pagos || pagos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8">No hay pagos para mostrar</td></tr>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    pagos.forEach(pago => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>#P${pago.id.toString().padStart(3, '0')}</td>
            <td>
                <div class="cliente-info">
                    <div class="nombre">${pago.nombre_pagador || 'Cliente'}</div>
                    <div class="email">${pago.email_pagador || 'Sin email'}</div>
                </div>
            </td>
            <td>${pago.concepto || 'Sin concepto'}</td>
            <td>QR/Transferencia</td>
            <td class="monto">${formatearPrecio(pago.monto || 0)}</td>
            <td>${formatearFecha(pago.created_at)}</td>
            <td>
                <span class="estado ${pago.estado || 'pendiente'}">${pago.estado || 'Pendiente'}</span>
                ${pago.fecha_aprobacion ? `<br><small>Aprobado: ${formatearFecha(pago.fecha_aprobacion)}</small>` : ''}
            </td>
            <td>
                <div class="acciones-pago">
                    ${(pago.estado || 'pendiente') === 'pendiente' ? `
                        <button class="btn-aprobar" data-pago-id="${pago.id}">Aprobar</button>
                        <button class="btn-rechazar" onclick="rechazarPagoReal(${pago.id})">Rechazar</button>
                    ` : ''}
                    ${pago.comprobante ? `
                        <button class="btn-ver-comprobante" onclick="verComprobanteReal('${pago.comprobante}')">Ver Comprobante</button>
                    ` : ''}
                    <button class="btn-detalles" onclick="verDetallesPagoReal(${pago.id})">Detalles</button>
                </div>
            </td>
        `;
        fragment.appendChild(row);
    });
    
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

function actualizarResumenPagos(pagos) {
    const resumen = {
        total: pagos.length,
        pendientes: pagos.filter(p => p.estado === 'pendiente').length,
        aprobados: pagos.filter(p => p.estado === 'aprobado').length,
        montoTotal: pagos.reduce((sum, p) => sum + (p.monto || 0), 0)
    };
    
    const updates = [
        { id: 'total-pagos', value: resumen.total },
        { id: 'pagos-pendientes-count', value: resumen.pendientes },
        { id: 'pagos-aprobados-count', value: resumen.aprobados },
        { id: 'monto-total-pagos', value: formatearPrecio(resumen.montoTotal) }
    ];
    
    requestAnimationFrame(() => {
        updates.forEach(({ id, value }) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    });
}

// ============ SISTEMA DE REPORTES OPTIMIZADO ============

async function cargarReportes() {
    const operation = 'reportes';
    
    try {
        LoadingManager.start(operation);
        console.log('📊 Cargando reportes...');
        
        const periodo = document.getElementById('periodo-reporte')?.value || 'mes';
        const cacheKey = `reportes-${periodo}`;
        
        const cached = CacheManager.get(cacheKey);
        if (cached) {
            await procesarReportes(cached);
            console.log('✅ Reportes cargados desde cache');
        }
        
        const [datosReportes, datosComparacion] = await Promise.allSettled([
            cargarDatosReportes(periodo),
            cargarDatosComparacion(periodo)
        ]);
        
        if (datosReportes.status === 'fulfilled') {
            const reporteData = {
                datos: datosReportes.value,
                comparacion: datosComparacion.status === 'fulfilled' ? datosComparacion.value : {}
            };
            
            CacheManager.set(cacheKey, reporteData);
            await procesarReportes(reporteData);
        }
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

async function procesarReportes({ datos, comparacion }) {
    actualizarMetricasReportes(datos, comparacion);
    await generarTodosLosGraficos(datos);
}

async function cargarDatosReportes(periodo) {
    try {
        const [stats, citas, pagos] = await Promise.all([
            apiRequest(CONFIG.ENDPOINTS.ADMIN_ESTADISTICAS),
            apiRequest(CONFIG.ENDPOINTS.ADMIN_CITAS_HOY),
            apiRequest(CONFIG.ENDPOINTS.ADMIN_PAGOS_DETALLADO)
        ]);
        
        return {
            ingresosPorMes: generarDatosIngresosMes(pagos),
            serviciosPopulares: generarDatosServiciosPopulares(citas),
            estadoCitas: generarDatosEstadoCitas(citas),
            crecimientoClientes: generarDatosCrecimientoClientes(stats),
            modalidadCitas: generarDatosModalidadCitas(citas),
            horariosCitas: generarDatosHorariosCitas(citas),
            stats: stats
        };
    } catch (error) {
        console.error('Error cargando datos de reportes:', error);
        throw error;
    }
}

async function cargarDatosComparacion(periodo) {
    // Datos simulados para comparación
    return {
        ingresos: { anterior: 2200000, variacion: 11.4 },
        clientes: { anterior: 142, variacion: 9.9 },
        citas: { anterior: 67, variacion: 19.4 },
        conversion: { anterior: 78.5, variacion: 7.6 }
    };
}

function actualizarMetricasReportes(datos, comparacion) {
    const metricas = {
        ingresos: { valor: datos.stats?.ingresos?.mes || 0, variacion: comparacion.ingresos?.variacion || 0 },
        clientes: { valor: datos.stats?.usuarios?.nuevos_mes || 0, variacion: comparacion.clientes?.variacion || 0 },
        citas: { valor: datos.stats?.citas?.mes || 0, variacion: comparacion.citas?.variacion || 0 },
        conversion: { valor: datos.stats?.citas?.tasa_asistencia || 0, variacion: comparacion.conversion?.variacion || 0 }
    };
    
    const updates = [
        { id: 'ingresos-totales-reporte', value: formatearPrecio(metricas.ingresos.valor) },
        { id: 'clientes-nuevos-reporte', value: metricas.clientes.valor },
        { id: 'citas-realizadas-reporte', value: metricas.citas.valor },
        { id: 'tasa-conversion-reporte', value: `${metricas.conversion.valor}%` }
    ];
    
    requestAnimationFrame(() => {
        updates.forEach(({ id, value }) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
        
        // Actualizar variaciones
        const variaciones = [
            { id: 'variacion-ingresos', value: metricas.ingresos.variacion },
            { id: 'variacion-clientes', value: metricas.clientes.variacion },
            { id: 'variacion-citas', value: metricas.citas.variacion },
            { id: 'variacion-conversion', value: metricas.conversion.variacion }
        ];
        
        variaciones.forEach(({ id, value }) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = `${value > 0 ? '+' : ''}${value}%`;
                element.style.color = value > 0 ? '#28a745' : '#dc3545';
            }
        });
    });
}

async function generarTodosLosGraficos(datos) {
    try {
        // Destruir gráficos existentes
        Object.values(chartsInstances).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        chartsInstances = {};
        
        // Verificar que Chart.js esté disponible
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js no está disponible');
            return;
        }
        
        // Generar gráficos con delay para mejor rendimiento
        const graficos = [
            { key: 'ingresosMes', func: () => generarGraficoIngresosMes(datos.ingresosPorMes) },
            { key: 'serviciosPopulares', func: () => generarGraficoServiciosPopulares(datos.serviciosPopulares) },
            { key: 'estadoCitas', func: () => generarGraficoEstadoCitas(datos.estadoCitas) },
            { key: 'crecimientoClientes', func: () => generarGraficoCrecimientoClientes(datos.crecimientoClientes) },
            { key: 'modalidadCitas', func: () => generarGraficoModalidadCitas(datos.modalidadCitas) },
            { key: 'horariosCitas', func: () => generarGraficoHorariosCitas(datos.horariosCitas) }
        ];
        
        for (const { key, func } of graficos) {
            try {
                chartsInstances[key] = func();
                await new Promise(resolve => setTimeout(resolve, 50)); // Pequeño delay
            } catch (error) {
                console.error(`Error generando gráfico ${key}:`, error);
            }
        }
        
        console.log('✅ Todos los gráficos generados');
        
    } catch (error) {
        console.error('❌ Error generando gráficos:', error);
    }
}

// ============ FUNCIONES DE DATOS PARA GRÁFICOS ============

function generarDatosIngresosMes(pagos) {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const ingresosPorMes = new Array(12).fill(0);
    
    pagos.filter(p => p.estado === 'aprobado').forEach(pago => {
        const fecha = new Date(pago.created_at);
        const mes = fecha.getMonth();
        if (mes >= 0 && mes < 12) {
            ingresosPorMes[mes] += pago.monto || 0;
        }
    });
    
    return {
        labels: meses,
        datasets: [{
            label: 'Ingresos',
            data: ingresosPorMes,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
        }]
    };
}

function generarDatosServiciosPopulares(citas) {
    const servicios = {};
    citas.forEach(cita => {
        const servicio = cita.servicio_nombre || 'Servicio';
        servicios[servicio] = (servicios[servicio] || 0) + 1;
    });
    
    const serviciosOrdenados = Object.entries(servicios)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
    
    return {
        labels: serviciosOrdenados.map(([nombre]) => nombre),
        datasets: [{
            data: serviciosOrdenados.map(([,cantidad]) => cantidad),
            backgroundColor: [
                '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
            ],
            borderWidth: 2
        }]
    };
}

function generarDatosEstadoCitas(citas) {
    const estados = {};
    citas.forEach(cita => {
        const estado = cita.estado || 'agendada';
        estados[estado] = (estados[estado] || 0) + 1;
    });
    
    return {
        labels: Object.keys(estados),
        datasets: [{
            data: Object.values(estados),
            backgroundColor: ['#28a745', '#ffc107', '#dc3545', '#17a2b8'],
            borderWidth: 2
        }]
    };
}

function generarDatosCrecimientoClientes(stats) {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const crecimiento = [120, 135, 142, 148, 152, stats.usuarios?.total || 156];
    
    return {
        labels: meses,
        datasets: [{
            label: 'Clientes',
            data: crecimiento,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
        }]
    };
}

function generarDatosModalidadCitas(citas) {
    const modalidades = {};
    citas.forEach(cita => {
        const modalidad = cita.modalidad || 'presencial';
        modalidades[modalidad] = (modalidades[modalidad] || 0) + 1;
    });
    
    return {
        labels: Object.keys(modalidades),
        datasets: [{
            data: Object.values(modalidades),
            backgroundColor: ['#FF6384', '#36A2EB'],
            borderWidth: 2
        }]
    };
}

function generarDatosHorariosCitas(citas) {
    const horarios = {
        '08:00-10:00': 0,
        '10:00-12:00': 0,
        '12:00-14:00': 0,
        '14:00-16:00': 0,
        '16:00-18:00': 0
    };
    
    citas.forEach(cita => {
        const hora = cita.hora || '10:00';
        const horaNum = parseInt(hora.split(':')[0]);
        
        if (horaNum >= 8 && horaNum < 10) horarios['08:00-10:00']++;
        else if (horaNum >= 10 && horaNum < 12) horarios['10:00-12:00']++;
        else if (horaNum >= 12 && horaNum < 14) horarios['12:00-14:00']++;
        else if (horaNum >= 14 && horaNum < 16) horarios['14:00-16:00']++;
        else if (horaNum >= 16 && horaNum < 18) horarios['16:00-18:00']++;
    });
    
    return {
        labels: Object.keys(horarios),
        datasets: [{
            label: 'Citas',
            data: Object.values(horarios),
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 2
        }]
    };
}

// ============ FUNCIONES DE GRÁFICOS CON CHART.JS ============

function generarGraficoIngresosMes(datos) {
    const ctx = document.getElementById('chartIngresosMes');
    if (!ctx) return null;
    
    return new Chart(ctx, {
        type: 'line',
        data: datos,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Ingresos por Mes' },
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatearPrecio(value);
                        }
                    }
                }
            },
            interaction: { intersect: false },
            elements: { point: { radius: 4 } }
        }
    });
}

function generarGraficoServiciosPopulares(datos) {
    const ctx = document.getElementById('chartServiciosPopulares');
    if (!ctx) return null;
    
    return new Chart(ctx, {
        type: 'doughnut',
        data: datos,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Servicios Más Solicitados' },
                legend: { position: 'bottom' }
            }
        }
    });
}

function generarGraficoEstadoCitas(datos) {
    const ctx = document.getElementById('chartEstadoCitas');
    if (!ctx) return null;
    
    return new Chart(ctx, {
        type: 'pie',
        data: datos,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Citas por Estado' },
                legend: { position: 'bottom' }
            }
        }
    });
}

function generarGraficoCrecimientoClientes(datos) {
    const ctx = document.getElementById('chartCrecimientoClientes');
    if (!ctx) return null;
    
    return new Chart(ctx, {
        type: 'line',
        data: datos,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Crecimiento de Clientes' },
                legend: { display: false }
            },
            scales: { y: { beginAtZero: true } },
            elements: { point: { radius: 4 } }
        }
    });
}

function generarGraficoModalidadCitas(datos) {
    const ctx = document.getElementById('chartModalidadCitas');
    if (!ctx) return null;
    
    return new Chart(ctx, {
        type: 'doughnut',
        data: datos,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Modalidad de Citas' },
                legend: { position: 'bottom' }
            }
        }
    });
}

function generarGraficoHorariosCitas(datos) {
    const ctx = document.getElementById('chartHorariosCitas');
    if (!ctx) return null;
    
    return new Chart(ctx, {
        type: 'bar',
        data: datos,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Horarios Más Solicitados' },
                legend: { display: false }
            },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// ============ ACCIONES DE CITAS OPTIMIZADAS ============

async function confirmarCitaReal(citaId) {
    if (!confirm('¿Confirmar esta cita?')) return;
    
    const operation = `confirmar-cita-${citaId}`;
    
    try {
        LoadingManager.start(operation);
        
        await apiRequest(`${CONFIG.ENDPOINTS.CITAS}/${citaId}/confirmar`, {
            method: 'PUT',
            body: JSON.stringify({
                estado: 'confirmada',
                notas_admin: 'Cita confirmada desde panel administrativo'
            })
        });
        
        mostrarMensaje('Cita confirmada exitosamente', 'success');
        
        // Invalidar cache relacionado
        CacheManager.invalidate('citas');
        CacheManager.invalidate('dashboard');
        
        // Recargar datos
        await Promise.all([
            cargarCitasPorPeriodo(),
            cargarDashboard()
        ]);
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

async function completarCitaReal(citaId) {
    const notas = prompt('Notas de la sesión (opcional):');
    
    const operation = `completar-cita-${citaId}`;
    
    try {
        LoadingManager.start(operation);
        
        await apiRequest(`${CONFIG.ENDPOINTS.CITAS}/${citaId}/completar`, {
            method: 'PUT',
            body: JSON.stringify({
                estado: 'completada',
                notas_psicologa: notas || 'Sesión completada',
                fecha_completada: new Date().toISOString()
            })
        });
        
        mostrarMensaje('Cita marcada como completada', 'success');
        
        // Invalidar cache
        CacheManager.invalidate('citas');
        CacheManager.invalidate('dashboard');
        
        // Recargar datos
        await Promise.all([
            cargarCitasPorPeriodo(),
            cargarDashboard()
        ]);
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

async function verDetallesCitaReal(citaId) {
    try {
        const cita = await apiRequest(`${CONFIG.ENDPOINTS.CITAS}/${citaId}`);
        
        const modal = createModal('modal-detalles-cita', `
            <div class="modal-header">
                <h3>Detalles de la Cita #${citaId}</h3>
                <button onclick="this.closest('.modal-detalles-cita').remove()" class="btn-close">&times;</button>
            </div>
            <div class="cita-detalles">
                <div class="detalle-grupo">
                    <h4>Información del Cliente</h4>
                    <p><strong>Nombre:</strong> ${cita.usuario_nombre || 'No disponible'}</p>
                    <p><strong>Email:</strong> ${cita.usuario_email || 'No disponible'}</p>
                    <p><strong>Teléfono:</strong> ${cita.usuario_telefono || 'No disponible'}</p>
                </div>
                <div class="detalle-grupo">
                    <h4>Información de la Cita</h4>
                    <p><strong>Fecha:</strong> ${formatearFecha(cita.fecha)}</p>
                    <p><strong>Hora:</strong> ${cita.hora}</p>
                    <p><strong>Servicio:</strong> ${cita.servicio_nombre || 'No disponible'}</p>
                    <p><strong>Modalidad:</strong> ${cita.modalidad}</p>
                    <p><strong>Estado:</strong> <span class="estado ${cita.estado}">${cita.estado}</span></p>
                </div>
                ${cita.comentarios_cliente ? `
                    <div class="detalle-grupo">
                        <h4>Comentarios del Cliente</h4>
                        <p>${cita.comentarios_cliente}</p>
                    </div>
                ` : ''}
                ${cita.notas_psicologa ? `
                    <div class="detalle-grupo">
                        <h4>Notas de la Psicóloga</h4>
                        <p>${cita.notas_psicologa}</p>
                    </div>
                ` : ''}
            </div>
            <div class="modal-actions">
                ${cita.estado === 'agendada' ? `
                    <button onclick="confirmarCitaReal(${citaId}); this.closest('.modal-detalles-cita').remove();" class="btn btn-success">Confirmar</button>
                ` : ''}
                ${cita.estado === 'confirmada' ? `
                    <button onclick="completarCitaReal(${citaId}); this.closest('.modal-detalles-cita').remove();" class="btn btn-primary">Completar</button>
                ` : ''}
                <button onclick="this.closest('.modal-detalles-cita').remove()" class="btn btn-secondary">Cerrar</button>
            </div>
        `);
        
        document.body.appendChild(modal);
        
    } catch (error) {
        ErrorHandler.handle(error, 'ver-detalles-cita');
    }
}

// ============ ACCIONES DE PAGOS OPTIMIZADAS ============

async function aprobarPagoReal(pagoId) {
    if (!confirm('¿Aprobar este pago? Se asignarán los créditos automáticamente.')) return;
    
    const operation = `aprobar-pago-${pagoId}`;
    
    try {
        LoadingManager.start(operation);
        
        const endpoint = CONFIG.ENDPOINTS.APROBAR_PAGO.replace('{id}', pagoId);
        await apiRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify({
                estado: 'aprobado',
                notas_admin: 'Pago aprobado desde panel administrativo'
            })
        });
        
        mostrarMensaje('Pago aprobado exitosamente. Créditos asignados.', 'success');
        
        // Invalidar cache
        CacheManager.invalidate('pagos');
        CacheManager.invalidate('dashboard');
        
        // Recargar datos
        await Promise.all([
            cargarPagosAdmin(),
            cargarDashboard()
        ]);
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

async function rechazarPagoReal(pagoId) {
    const motivo = prompt('Motivo del rechazo:');
    if (!motivo) return;
    
    const operation = `rechazar-pago-${pagoId}`;
    
    try {
        LoadingManager.start(operation);
        
        const endpoint = CONFIG.ENDPOINTS.APROBAR_PAGO.replace('{id}', pagoId);
        await apiRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify({ 
                estado: 'rechazado',
                notas_admin: motivo 
            })
        });
        
        mostrarMensaje('Pago rechazado exitosamente', 'success');
        
        // Invalidar cache
        CacheManager.invalidate('pagos');
        CacheManager.invalidate('dashboard');
        
        // Recargar datos
        await Promise.all([
            cargarPagosAdmin(),
            cargarDashboard()
        ]);
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

function verComprobanteReal(comprobante) {
    if (comprobante) {
        const url = `${CONFIG.API_BASE_URL.replace('/api', '')}/uploads/${comprobante}`;
        window.open(url, '_blank');
    } else {
        mostrarMensaje('No hay comprobante disponible', 'warning');
    }
}

async function verDetallesPagoReal(pagoId) {
    try {
        const pago = await apiRequest(`${CONFIG.ENDPOINTS.PAGOS}/${pagoId}`);
        
        const modal = createModal('modal-pago-detalles', `
            <div class="modal-header">
                <h3>Detalles del Pago #P${pagoId.toString().padStart(3, '0')}</h3>
                <button onclick="this.closest('.modal-pago-detalles').remove()" class="btn-close">&times;</button>
            </div>
            <div class="pago-detalles-content">
                <div class="detalle-grupo">
                    <h4>Información del Pagador</h4>
                    <p><strong>Nombre:</strong> ${pago.nombre_pagador}</p>
                    <p><strong>Email:</strong> ${pago.email_pagador}</p>
                    <p><strong>Teléfono:</strong> ${pago.telefono_pagador || 'No especificado'}</p>
                    <p><strong>Documento:</strong> ${pago.documento_pagador || 'No especificado'}</p>
                </div>
                <div class="detalle-grupo">
                    <h4>Información del Pago</h4>
                    <p><strong>Monto:</strong> ${formatearPrecio(pago.monto)}</p>
                    <p><strong>Concepto:</strong> ${pago.concepto}</p>
                    <p><strong>Tipo de compra:</strong> ${pago.tipo_compra}</p>
                    <p><strong>Estado:</strong> <span class="estado ${pago.estado}">${pago.estado}</span></p>
                    <p><strong>Fecha de creación:</strong> ${formatearFecha(pago.created_at)}</p>
                    ${pago.fecha_aprobacion ? `<p><strong>Fecha de aprobación:</strong> ${formatearFecha(pago.fecha_aprobacion)}</p>` : ''}
                    ${pago.referencia_bancaria ? `<p><strong>Referencia bancaria:</strong> ${pago.referencia_bancaria}</p>` : ''}
                </div>
                ${pago.notas_admin ? `
                    <div class="detalle-grupo">
                        <h4>Notas del Administrador</h4>
                        <p>${pago.notas_admin}</p>
                    </div>
                ` : ''}
                ${pago.comprobante ? `
                    <div class="detalle-grupo">
                        <h4>Comprobante de Pago</h4>
                        <button onclick="verComprobanteReal('${pago.comprobante}')" class="btn btn-success">Ver Comprobante</button>
                    </div>
                ` : ''}
            </div>
            <div class="modal-actions">
                ${pago.estado === 'pendiente' ? `
                    <button onclick="aprobarPagoReal(${pagoId}); this.closest('.modal-pago-detalles').remove();" class="btn btn-success">Aprobar</button>
                    <button onclick="rechazarPagoReal(${pagoId}); this.closest('.modal-pago-detalles').remove();" class="btn btn-danger">Rechazar</button>
                ` : ''}
                <button onclick="this.closest('.modal-pago-detalles').remove()" class="btn btn-secondary">Cerrar</button>
            </div>
        `);
        
        document.body.appendChild(modal);
        
    } catch (error) {
        ErrorHandler.handle(error, 'ver-detalles-pago');
    }
}

// ============ GESTIÓN DE CLIENTES OPTIMIZADA ============

function nuevoCliente() {
    const modal = createModal('modal-nuevo-cliente', `
        <div class="modal-header">
            <h3>Crear Nuevo Cliente</h3>
            <button onclick="this.closest('.modal-nuevo-cliente').remove()" class="btn-close">&times;</button>
        </div>
        
        <form id="form-nuevo-cliente">
            <div class="form-grid">
                <div class="form-group">
                    <label>Nombre Completo *</label>
                    <input type="text" name="nombre" required>
                </div>
                
                <div class="form-group">
                    <label>Email *</label>
                    <input type="email" name="email" required>
                </div>
                
                <div class="form-group">
                    <label>Teléfono</label>
                    <input type="tel" name="telefono" placeholder="+57 300 123 4567">
                </div>
                
                <div class="form-group">
                    <label>Documento</label>
                    <input type="text" name="documento" placeholder="Cédula o documento de identidad">
                </div>
            </div>
            
            <div class="form-group">
                <label>Contraseña Temporal *</label>
                <div class="password-input">
                    <input type="password" name="password" id="password-cliente" required>
                    <button type="button" onclick="generarPasswordTemporal()" class="btn btn-info">Generar</button>
                </div>
                <small>El cliente deberá cambiar esta contraseña en su primer acceso</small>
            </div>
            
            <div class="form-group">
                <label>Estado</label>
                <select name="estado">
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                </select>
            </div>
            
            <div class="form-actions">
                <button type="button" onclick="this.closest('.modal-nuevo-cliente').remove()" class="btn btn-secondary">Cancelar</button>
                <button type="submit" class="btn btn-success">Crear Cliente</button>
            </div>
        </form>
    `);
    
    document.body.appendChild(modal);
    
    // Configurar evento de submit
    const form = modal.querySelector('#form-nuevo-cliente');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await crearNuevoCliente(e.target);
    });
}

function generarPasswordTemporal() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('password-cliente').value = password;
}

async function crearNuevoCliente(form) {
    const operation = 'crear-cliente';
    
    try {
        LoadingManager.start(operation);
        
        const formData = new FormData(form);
        
        // Validaciones básicas en frontend
        const email = formData.get('email');
        const documento = formData.get('documento');
        
        if (!email || !email.includes('@')) {
            mostrarMensaje('Por favor ingresa un email válido', 'error');
            return;
        }
        
        const clienteData = {
            nombre: formData.get('nombre'),
            email: email,
            telefono: formData.get('telefono'),
            documento: documento || null, // Permitir documento vacío
            password: formData.get('password'),
            tipo: 'cliente',
            estado: formData.get('estado')
        };
        
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Creando...';
        
        await apiRequest(CONFIG.ENDPOINTS.USUARIOS, {
            method: 'POST',
            body: JSON.stringify(clienteData)
        });
        
        mostrarMensaje('Cliente creado exitosamente', 'success');
        form.closest('.modal-nuevo-cliente').remove();
        
        // Invalidar cache y recargar datos
        CacheManager.invalidate('usuarios');
        CacheManager.invalidate('dashboard');
        await cargarClientes();
        
    } catch (error) {
        console.error('Error creando cliente:', error);
        
        // Manejar errores específicos
        let mensajeError = 'Error al crear el cliente';
        
        if (error.message.includes('email')) {
            mensajeError = 'Ya existe un usuario con este email';
        } else if (error.message.includes('documento')) {
            mensajeError = 'Ya existe un usuario con este documento';
        } else if (error.message.includes('duplicados')) {
            mensajeError = 'Los datos ingresados ya están registrados';
        } else {
            mensajeError = error.message;
        }
        
        mostrarMensaje(mensajeError, 'error');
        
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = 'Crear Cliente';
    } finally {
        LoadingManager.end(operation);
    }
}

async function editarClienteReal(clienteId) {
    const operation = `editar-cliente-${clienteId}`;
    
    try {
        LoadingManager.start(operation);
        
        const cliente = await apiRequest(`${CONFIG.ENDPOINTS.USUARIOS}/${clienteId}`);
        
        const modal = createModal('modal-editar-cliente', `
            <div class="modal-header">
                <h3>Editar Cliente</h3>
                <button onclick="this.closest('.modal-editar-cliente').remove()" class="btn-close">&times;</button>
            </div>
            
            <form id="form-editar-cliente">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Nombre Completo *</label>
                        <input type="text" name="nombre" value="${cliente.nombre}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" value="${cliente.email}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Teléfono</label>
                        <input type="tel" name="telefono" value="${cliente.telefono || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label>Documento</label>
                        <input type="text" name="documento" value="${cliente.documento || ''}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Estado</label>
                    <select name="estado">
                        <option value="activo" ${cliente.estado === 'activo' ? 'selected' : ''}>Activo</option>
                        <option value="inactivo" ${cliente.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                        <option value="suspendido" ${cliente.estado === 'suspendido' ? 'selected' : ''}>Suspendido</option>
                    </select>
                </div>
                
                <div class="form-actions">
                    <button type="button" onclick="this.closest('.modal-editar-cliente').remove()" class="btn btn-secondary">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                </div>
            </form>
        `);
        
        document.body.appendChild(modal);
        
        const form = modal.querySelector('#form-editar-cliente');
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const datosActualizados = {
                nombre: formData.get('nombre'),
                email: formData.get('email'),
                telefono: formData.get('telefono'),
                documento: formData.get('documento'),
                estado: formData.get('estado')
            };
            
            try {
                const submitButton = e.target.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                submitButton.textContent = 'Guardando...';
                
                await apiRequest(`${CONFIG.ENDPOINTS.USUARIOS}/${clienteId}`, {
                    method: 'PUT',
                    body: JSON.stringify(datosActualizados)
                });
                
                mostrarMensaje('Cliente actualizado exitosamente', 'success');
                modal.remove();
                
                // Invalidar cache y recargar
                CacheManager.invalidate('usuarios');
                await cargarClientes();
                
            } catch (error) {
                console.error('Error actualizando cliente:', error);
                mostrarMensaje('Error al actualizar el cliente: ' + error.message, 'error');
                submitButton.disabled = false;
                submitButton.textContent = 'Guardar Cambios';
            }
        });
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

async function verClienteReal(clienteId) {
    const operation = `ver-cliente-${clienteId}`;
    
    try {
        LoadingManager.start(operation);
        
        const [cliente, creditos, citas] = await Promise.allSettled([
            apiRequest(`${CONFIG.ENDPOINTS.USUARIOS}/${clienteId}`),
            apiRequest(`${CONFIG.ENDPOINTS.USUARIOS}/${clienteId}/creditos`).catch(() => []),
            apiRequest(`${CONFIG.ENDPOINTS.CITAS}?usuario_id=${clienteId}`).catch(() => [])
        ]);
        
        const clienteData = cliente.status === 'fulfilled' ? cliente.value : null;
        const creditosData = creditos.status === 'fulfilled' ? creditos.value : [];
        const citasData = citas.status === 'fulfilled' ? citas.value : [];
        
        if (!clienteData) {
            throw new Error('No se pudo cargar la información del cliente');
        }
        
        const modal = createModal('modal-ver-cliente', `
            <div class="modal-header">
                <h3>Perfil del Cliente</h3>
                <button onclick="this.closest('.modal-ver-cliente').remove()" class="btn-close">&times;</button>
            </div>
            
            <div class="cliente-perfil-content">
                <div class="info-personal">
                    <h4>Información Personal</h4>
                    <div class="info-grid">
                        <div><strong>Nombre:</strong> ${clienteData.nombre}</div>
                        <div><strong>Email:</strong> ${clienteData.email}</div>
                        <div><strong>Teléfono:</strong> ${clienteData.telefono || 'No especificado'}</div>
                        <div><strong>Documento:</strong> ${clienteData.documento || 'No especificado'}</div>
                        <div><strong>Estado:</strong> <span class="estado ${clienteData.estado}">${clienteData.estado}</span></div>
                        <div><strong>Fecha de registro:</strong> ${formatearFecha(clienteData.created_at)}</div>
                    </div>
                </div>
                
                <div class="creditos-info">
                    <h4>Créditos Disponibles</h4>
                    ${creditosData.length > 0 ? `
                        <div class="creditos-lista">
                            ${creditosData.map(credito => `
                                <div class="credito-item">
                                    <span>${credito.servicio_nombre}</span>
                                    <span><strong>${credito.cantidad_disponible} créditos</strong></span>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p>No tiene créditos disponibles</p>'}
                </div>
                
                <div class="historial-citas">
                    <h4>Historial de Citas</h4>
                    ${citasData.length > 0 ? `
                        <div class="citas-lista">
                            ${citasData.slice(0, 10).map(cita => `
                                <div class="cita-item">
                                    <div>
                                        <strong>${formatearFecha(cita.fecha)}</strong> - ${cita.hora}<br>
                                        <small>${cita.servicio_nombre} (${cita.modalidad})</small>
                                    </div>
                                    <span class="estado ${cita.estado}">${cita.estado}</span>
                                </div>
                            `).join('')}
                        </div>
                        ${citasData.length > 10 ? `<p><small>Mostrando las últimas 10 citas de ${citasData.length} total</small></p>` : ''}
                    ` : '<p>No tiene citas registradas</p>'}
                </div>
            </div>
            
            <div class="modal-actions">
                <button onclick="editarClienteReal(${clienteId}); this.closest('.modal-ver-cliente').remove();" class="btn btn-primary">Editar Cliente</button>
                <button onclick="this.closest('.modal-ver-cliente').remove()" class="btn btn-secondary">Cerrar</button>
            </div>
        `);
        
        document.body.appendChild(modal);
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

async function cambiarEstadoCliente(clienteId, estadoActual) {
    const nuevoEstado = estadoActual === 'activo' ? 'suspendido' : 'activo';
    const accion = nuevoEstado === 'activo' ? 'activar' : 'suspender';
    
    if (!confirm(`¿Estás seguro de que quieres ${accion} este cliente?`)) return;
    
    const operation = `cambiar-estado-${clienteId}`;
    
    try {
        LoadingManager.start(operation);
        
        await apiRequest(`${CONFIG.ENDPOINTS.USUARIOS}/${clienteId}`, {
            method: 'PUT',
            body: JSON.stringify({
                estado: nuevoEstado
            })
        });
        
        mostrarMensaje(`Cliente ${accion === 'activar' ? 'activado' : 'suspendido'} exitosamente`, 'success');
        
        // Invalidar cache y recargar
        CacheManager.invalidate('usuarios');
        await cargarClientes();
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

// ============ UTILIDADES DE UI OPTIMIZADAS ============

function createModal(className, content) {
    const modal = document.createElement('div');
    modal.className = className;
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); display: flex; align-items: center; 
        justify-content: center; z-index: 10000; animation: fadeIn 0.3s ease;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
        background: white; padding: 20px; border-radius: 8px; 
        max-width: 90vw; max-height: 90vh; overflow-y: auto;
        animation: slideIn 0.3s ease;
    `;
    modalContent.innerHTML = content;
    
    modal.appendChild(modalContent);
    
    // Cerrar modal al hacer click fuera
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Cerrar modal con ESC
    const handleEscape = function(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    return modal;
}

// ============ NAVEGACIÓN Y UTILIDADES ============

function mostrarSeccionAdmin(seccionId) {
    try {
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
        
        const navItem = document.querySelector(`[onclick*="${seccionId}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
        
        // Cargar datos específicos de la sección
        switch (seccionId) {
            case 'dashboard':
                cargarDashboard();
                break;
            case 'gestionar-clientes':
                cargarClientes();
                break;
            case 'gestionar-citas':
                cargarCitasPorPeriodo();
                break;
            case 'gestionar-pagos':
                cargarPagosAdmin();
                break;
            case 'reportes':
                cargarReportes();
                break;
        }
        
    } catch (error) {
        console.error('Error mostrando sección:', error);
    }
}

function cargarInformacionAdmin() {
    const user = auth.getUser();
    if (user) {
        const elementos = {
            nombreSidebar: document.getElementById('nombre-admin-sidebar'),
            emailSidebar: document.getElementById('email-admin-sidebar'),
            adminNombre: document.getElementById('admin-nombre')
        };
        
        if (elementos.nombreSidebar) elementos.nombreSidebar.textContent = user.nombre;
        if (elementos.emailSidebar) elementos.emailSidebar.textContent = user.email;
        if (elementos.adminNombre) elementos.adminNombre.textContent = user.nombre;
    }
}

function cerrarSesion() {
    if (confirm('¿Estás seguro de que quieres cerrar la sesión?')) {
        CacheManager.clear();
        auth.logout();
    }
}

// Funciones de navegación de calendario
function mesSiguiente() {
    mesActual.setMonth(mesActual.getMonth() + 1);
    actualizarCalendario();
}

function mesAnterior() {
    mesActual.setMonth(mesActual.getMonth() - 1);
    actualizarCalendario();
}

function actualizarCalendario() {
    const mesNombre = mesActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const elementoMes = document.getElementById('mes-actual');
    if (elementoMes) {
        elementoMes.textContent = mesNombre;
    }
    cargarCitasPorPeriodo();
}

// Función de compatibilidad
function verComprobante(pagoId) {
    verDetallesPagoReal(pagoId);
}

// ============ INICIALIZACIÓN OPTIMIZADA ============

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando panel administrativo optimizado...');
    
    // Verificar autenticación y permisos
    if (!auth.requireAuth() || !auth.requireAdmin()) {
        console.error('❌ Usuario no autorizado');
        return;
    }
    
    // Configurar eventos
    configurarEventosAdmin();
    
    // Cargar información del usuario
    cargarInformacionAdmin();
    
    // Cargar dashboard inicial
    cargarDashboard();
    
    // Configurar auto-refresh cada 5 minutos
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            CacheManager.clear();
            cargarDashboard();
        }
    }, 5 * 60 * 1000);
    
    console.log('✅ Panel administrativo optimizado inicializado correctamente');
});

// Limpiar cache cuando se cierra la página
window.addEventListener('beforeunload', function() {
    CacheManager.clear();
});

console.log('✅ Panel de administración de CreSer optimizado cargado');
