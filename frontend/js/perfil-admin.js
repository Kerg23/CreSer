// Variables globales para admin
let citasDelDia = [];
let mesActual = new Date();

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    if (!authManager.requireAuth() || !authManager.requireAdmin()) {
        return;
    }
    
    cargarDashboard();
    configurarEventosAdmin();
    cargarCalendario();
    mostrarFechaActual();
});

async function cargarDashboard() {
    try {
        const response = await apiRequest(`${CONFIG.ENDPOINTS.USUARIOS}/dashboard`);
        const stats = response.stats;
        
        // Actualizar estadísticas
        document.querySelector('[data-stat="clientes"] .stat-number').textContent = stats.totalClientes || 0;
        document.querySelector('[data-stat="citas-hoy"] .stat-number').textContent = stats.citasHoy || 0;
        document.querySelector('[data-stat="ingresos"] .stat-number').textContent = formatearPrecio(stats.ingresosMes || 0);
        document.querySelector('[data-stat="satisfaccion"] .stat-number').textContent = `${stats.satisfaccion || 4.8}/5`;
        
        // Cargar citas de hoy
        await cargarCitasHoy();
        
        // Cargar pagos pendientes
        await cargarPagosPendientes();
        
    } catch (error) {
        console.error('Error cargando dashboard:', error);
        mostrarMensaje('Error al cargar el dashboard', 'error');
    }
}

async function cargarCitasHoy() {
    try {
        const hoy = new Date().toISOString().split('T')[0];
        const response = await apiRequest(`${CONFIG.ENDPOINTS.CITAS}?fecha=${hoy}`);
        const citas = response.citas || [];
        
        const container = document.querySelector('.citas-hoy-lista');
        container.innerHTML = '';
        
        if (citas.length === 0) {
            container.innerHTML = '<p>No hay citas programadas para hoy</p>';
            return;
        }
        
        citas.forEach(cita => {
            const citaElement = document.createElement('div');
            citaElement.className = 'cita-mini';
            citaElement.innerHTML = `
                <span class="hora">${cita.hora}</span>
                <span class="cliente">${cita.usuario_nombre}</span>
                <span class="servicio">${cita.servicio}</span>
                <span class="estado ${cita.estado}">${cita.estado}</span>
            `;
            container.appendChild(citaElement);
        });
        
    } catch (error) {
        console.error('Error cargando citas de hoy:', error);
    }
}

async function cargarPagosPendientes() {
    try {
        const response = await apiRequest(`${CONFIG.ENDPOINTS.PAGOS}?estado=pendiente`);
        const pagos = response.pagos || [];
        
        const container = document.querySelector('.pagos-pendientes');
        container.innerHTML = '';
        
        if (pagos.length === 0) {
            container.innerHTML = '<p>No hay pagos pendientes</p>';
            return;
        }
        
        pagos.slice(0, 5).forEach(pago => {
            const pagoElement = document.createElement('div');
            pagoElement.className = 'pago-pendiente';
            pagoElement.innerHTML = `
                <span class="cliente">${pago.usuario_nombre}</span>
                <span class="monto">${formatearPrecio(pago.monto)}</span>
                <button class="btn-verificar" onclick="verificarPago(${pago.id})">Verificar</button>
            `;
            container.appendChild(pagoElement);
        });
        
    } catch (error) {
        console.error('Error cargando pagos pendientes:', error);
    }
}

async function cargarClientes() {
    try {
        const response = await apiRequest(CONFIG.ENDPOINTS.USUARIOS);
        const usuarios = response.usuarios || [];
        
        const tbody = document.querySelector('.clientes-tabla tbody');
        tbody.innerHTML = '';
        
        usuarios.forEach(usuario => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${usuario.id.toString().padStart(3, '0')}</td>
                <td>${usuario.nombre}</td>
                <td>${usuario.email}</td>
                <td>${usuario.telefono}</td>
                <td>${usuario.creditos_total || 0} créditos</td>
                <td><span class="estado ${usuario.estado}">${usuario.estado}</span></td>
                <td>
                    <button class="btn-editar" onclick="editarCliente(${usuario.id})">Editar</button>
                    <button class="btn-ver" onclick="verCliente(${usuario.id})">Ver</button>
                    <button class="btn-suspender" onclick="suspenderCliente(${usuario.id})">
                        ${usuario.estado === 'activo' ? 'Suspender' : 'Activar'}
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error cargando clientes:', error);
        mostrarMensaje('Error al cargar los clientes', 'error');
    }
}

async function cargarCitasAdmin() {
    try {
        const response = await apiRequest(CONFIG.ENDPOINTS.CITAS);
        const citas = response.citas || [];
        
        mostrarCitasEnCalendario(citas);
        
    } catch (error) {
        console.error('Error cargando citas:', error);
        mostrarMensaje('Error al cargar las citas', 'error');
    }
}

async function cargarPagosAdmin() {
    try {
        const filtroEstado = document.getElementById('filtro-estado-pago')?.value || 'todos';
        const endpoint = filtroEstado === 'todos' 
            ? CONFIG.ENDPOINTS.PAGOS 
            : `${CONFIG.ENDPOINTS.PAGOS}?estado=${filtroEstado}`;
            
        const response = await apiRequest(endpoint);
        const pagos = response.pagos || [];
        
        const tbody = document.querySelector('.pagos-admin-tabla tbody');
        tbody.innerHTML = '';
        
        pagos.forEach(pago => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#P${pago.id.toString().padStart(3, '0')}</td>
                <td>${pago.usuario_nombre}</td>
                <td>${pago.concepto}</td>
                <td>${pago.metodo_pago.toUpperCase()}</td>
                <td>${formatearPrecio(pago.monto)}</td>
                <td>${formatearFecha(pago.createdAt)}</td>
                <td><span class="estado ${pago.estado}">${pago.estado}</span></td>
                <td>
                    ${pago.estado === 'pendiente' ? `
                        <button class="btn-aprobar" onclick="aprobarPago(${pago.id})">Aprobar</button>
                        <button class="btn-rechazar" onclick="rechazarPago(${pago.id})">Rechazar</button>
                    ` : ''}
                    <button class="btn-ver-comprobante" onclick="verComprobante(${pago.id})">Ver Comprobante</button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error cargando pagos:', error);
        mostrarMensaje('Error al cargar los pagos', 'error');
    }
}

function configurarEventosAdmin() {
    // Búsqueda de clientes
    const buscarCliente = document.getElementById('buscar-cliente');
    if (buscarCliente) {
        buscarCliente.addEventListener('input', function() {
            filtrarClientes(this.value);
        });
    }
    
    // Filtro de pagos
    const filtroPagos = document.getElementById('filtro-estado-pago');
    if (filtroPagos) {
        filtroPagos.addEventListener('change', cargarPagosAdmin);
    }
    
    // Navegación del perfil admin
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (href && href.includes('mostrarSeccion')) {
                const seccion = href.match(/'([^']+)'/)[1];
                mostrarSeccionAdmin(seccion);
            }
        });
    });
}

function mostrarSeccionAdmin(seccionId) {
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
        case 'gestionar-clientes':
            cargarClientes();
            break;
        case 'gestionar-citas':
            cargarCitasAdmin();
            break;
        case 'gestionar-pagos':
            cargarPagosAdmin();
            break;
        case 'reportes':
            cargarReportes();
            break;
    }
}

async function aprobarPago(pagoId) {
    if (!confirm('¿Aprobar este pago?')) return;
    
    try {
        await apiRequest(`${CONFIG.ENDPOINTS.PAGOS}/${pagoId}/aprobar`, {
            method: 'PUT'
        });
        
        mostrarMensaje('Pago aprobado exitosamente', 'success');
        await cargarPagosAdmin();
        await cargarDashboard(); // Actualizar dashboard
        
    } catch (error) {
        console.error('Error aprobando pago:', error);
        mostrarMensaje('Error al aprobar el pago', 'error');
    }
}

async function rechazarPago(pagoId) {
    const motivo = prompt('Motivo del rechazo:');
    if (!motivo) return;
    
    try {
        await apiRequest(`${CONFIG.ENDPOINTS.PAGOS}/${pagoId}/rechazar`, {
            method: 'PUT',
            body: JSON.stringify({ motivo })
        });
        
        mostrarMensaje('Pago rechazado', 'success');
        await cargarPagosAdmin();
        
    } catch (error) {
        console.error('Error rechazando pago:', error);
        mostrarMensaje('Error al rechazar el pago', 'error');
    }
}

function verComprobante(pagoId) {
    window.open(`${CONFIG.API_BASE_URL}/pagos/${pagoId}/comprobante`, '_blank');
}

async function verificarPago(pagoId) {
    try {
        const response = await apiRequest(`${CONFIG.ENDPOINTS.PAGOS}/${pagoId}`);
        const pago = response.pago;
        
        // Mostrar modal o ventana con detalles del pago
        const modal = document.createElement('div');
        modal.className = 'modal-verificar-pago';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Verificar Pago #P${pago.id.toString().padStart(3, '0')}</h3>
                <p><strong>Cliente:</strong> ${pago.usuario_nombre}</p>
                <p><strong>Monto:</strong> ${formatearPrecio(pago.monto)}</p>
                <p><strong>Concepto:</strong> ${pago.concepto}</p>
                <p><strong>Método:</strong> ${pago.metodo_pago}</p>
                <div class="modal-actions">
                    <button onclick="aprobarPago(${pago.id}); this.closest('.modal-verificar-pago').remove()">Aprobar</button>
                    <button onclick="rechazarPago(${pago.id}); this.closest('.modal-verificar-pago').remove()">Rechazar</button>
                    <button onclick="this.closest('.modal-verificar-pago').remove()">Cerrar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error verificando pago:', error);
        mostrarMensaje('Error al cargar los detalles del pago', 'error');
    }
}

async function suspenderCliente(clienteId) {
    if (!confirm('¿Cambiar el estado de este cliente?')) return;
    
    try {
        await apiRequest(`${CONFIG.ENDPOINTS.USUARIOS}/${clienteId}/toggle-estado`, {
            method: 'PUT'
        });
        
        mostrarMensaje('Estado del cliente actualizado', 'success');
        await cargarClientes();
        
    } catch (error) {
        console.error('Error cambiando estado del cliente:', error);
        mostrarMensaje('Error al cambiar el estado del cliente', 'error');
    }
}

function editarCliente(clienteId) {
    mostrarMensaje('Funcionalidad de edición en desarrollo', 'info');
}

function verCliente(clienteId) {
    window.open(`perfil-cliente.html?id=${clienteId}`, '_blank');
}

function nuevoCliente() {
    mostrarMensaje('Funcionalidad de nuevo cliente en desarrollo', 'info');
}

function nuevaCitaAdmin() {
    mostrarMensaje('Funcionalidad de nueva cita admin en desarrollo', 'info');
}

function cargarCalendario() {
    // Implementación básica del calendario
    const calendarioGrid = document.getElementById('calendario-grid');
    if (!calendarioGrid) return;
    
    const año = mesActual.getFullYear();
    const mes = mesActual.getMonth();
    
    // Actualizar título del mes
    const mesNombre = mesActual.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    document.getElementById('mes-actual').textContent = mesNombre;
    
    // Generar días del calendario
    calendarioGrid.innerHTML = '';
    
    // Días de la semana
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    diasSemana.forEach(dia => {
        const diaElement = document.createElement('div');
        diaElement.className = 'calendario-dia-semana';
        diaElement.textContent = dia;
        calendarioGrid.appendChild(diaElement);
    });
    
    // Días del mes
    const primerDia = new Date(año, mes, 1).getDay();
    const ultimoDia = new Date(año, mes + 1, 0).getDate();
    
    // Días vacíos al inicio
    for (let i = 0; i < primerDia; i++) {
        const diaVacio = document.createElement('div');
        diaVacio.className = 'calendario-dia vacio';
        calendarioGrid.appendChild(diaVacio);
    }
    
    // Días del mes
    for (let dia = 1; dia <= ultimoDia; dia++) {
        const diaElement = document.createElement('div');
        diaElement.className = 'calendario-dia';
        diaElement.textContent = dia;
        diaElement.onclick = () => seleccionarDia(año, mes, dia);
        
        // Marcar día actual
        const hoy = new Date();
        if (año === hoy.getFullYear() && mes === hoy.getMonth() && dia === hoy.getDate()) {
            diaElement.classList.add('hoy');
        }
        
        calendarioGrid.appendChild(diaElement);
    }
}

function mesAnterior() {
    mesActual.setMonth(mesActual.getMonth() - 1);
    cargarCalendario();
}

function mesSiguiente() {
    mesActual.setMonth(mesActual.getMonth() + 1);
    cargarCalendario();
}

async function seleccionarDia(año, mes, dia) {
    const fecha = new Date(año, mes, dia).toISOString().split('T')[0];
    
    try {
        const response = await apiRequest(`${CONFIG.ENDPOINTS.CITAS}?fecha=${fecha}`);
        const citas = response.citas || [];
        
        mostrarCitasDelDia(citas, fecha);
        
        // Marcar día seleccionado
        document.querySelectorAll('.calendario-dia').forEach(d => d.classList.remove('seleccionado'));
        event.target.classList.add('seleccionado');
        
    } catch (error) {
        console.error('Error cargando citas del día:', error);
        mostrarMensaje('Error al cargar las citas del día', 'error');
    }
}

function mostrarCitasDelDia(citas, fecha) {
    const container = document.getElementById('citas-del-dia');
    container.innerHTML = `<h3>Citas del ${formatearFecha(fecha)}</h3>`;
    
    if (citas.length === 0) {
        container.innerHTML += '<p>No hay citas programadas para este día</p>';
        return;
    }
    
    citas.forEach(cita => {
        const citaCard = document.createElement('div');
        citaCard.className = 'cita-admin-card';
        citaCard.innerHTML = `
            <div class="cita-hora">${cita.hora}</div>
            <div class="cita-detalles">
                <h4>${cita.usuario_nombre}</h4>
                <p>${cita.servicio} - ${cita.modalidad}</p>
                <p>${cita.telefono}</p>
                <p>Estado: <span class="estado ${cita.estado}">${cita.estado}</span></p>
            </div>
            <div class="cita-acciones-admin">
                <button class="btn-confirmar" onclick="confirmarCita(${cita.id})">Confirmar</button>
                <button class="btn-reprogramar" onclick="reprogramarCitaAdmin(${cita.id})">Reprogramar</button>
                <button class="btn-cancelar" onclick="cancelarCitaAdmin(${cita.id})">Cancelar</button>
            </div>
        `;
        container.appendChild(citaCard);
    });
}

async function confirmarCita(citaId) {
    try {
        await apiRequest(`${CONFIG.ENDPOINTS.CITAS}/${citaId}/confirmar`, {
            method: 'PUT'
        });
        
        mostrarMensaje('Cita confirmada exitosamente', 'success');
        // Recargar la vista actual
        
    } catch (error) {
        console.error('Error confirmando cita:', error);
        mostrarMensaje('Error al confirmar la cita', 'error');
    }
}

function reprogramarCitaAdmin(citaId) {
    mostrarMensaje('Funcionalidad de reprogramación en desarrollo', 'info');
}

async function cancelarCitaAdmin(citaId) {
    const motivo = prompt('Motivo de la cancelación:');
    if (!motivo) return;
    
    try {
        await apiRequest(`${CONFIG.ENDPOINTS.CITAS}/${citaId}/cancelar`, {
            method: 'PUT',
            body: JSON.stringify({ motivo })
        });
        
        mostrarMensaje('Cita cancelada exitosamente', 'success');
        
    } catch (error) {
        console.error('Error cancelando cita:', error);
        mostrarMensaje('Error al cancelar la cita', 'error');
    }
}

function cargarReportes() {
    mostrarMensaje('Funcionalidad de reportes en desarrollo', 'info');
}

function exportarReporte() {
    mostrarMensaje('Funcionalidad de exportar reportes en desarrollo', 'info');
}

function mostrarFechaActual() {
    const fechaElement = document.getElementById('fecha-hoy');
    if (fechaElement) {
        const hoy = new Date();
        fechaElement.textContent = formatearFecha(hoy);
    }
}

function filtrarClientes(termino) {
    const filas = document.querySelectorAll('.clientes-tabla tbody tr');
    
    filas.forEach(fila => {
        const texto = fila.textContent.toLowerCase();
        if (texto.includes(termino.toLowerCase())) {
            fila.style.display = '';
        } else {
            fila.style.display = 'none';
        }
    });
}
