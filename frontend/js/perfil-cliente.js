// ============ CONFIGURACIÓN Y VARIABLES GLOBALES ============
let editandoInfo = false;
let datosOriginales = {};
let dataCache = new Map();
let loadingStates = new Set();

// Configuración de cache
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// ============ UTILIDADES DE OPTIMIZACIÓN ============

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

// ============ GESTIÓN DE NAVEGACIÓN ============

function mostrarSeccion(seccionId) {
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remover clase active de todos los nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Mostrar la sección seleccionada
    const seccion = document.getElementById(seccionId);
    if (seccion) {
        seccion.classList.add('active');
    }
    
    // Activar el nav item correspondiente
    const navItem = document.querySelector(`[data-section="${seccionId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
    
    // Cargar datos específicos de la sección
    switch (seccionId) {
        case 'mis-creditos':
            cargarCreditos();
            break;
        case 'mis-citas':
            cargarMisCitas();
            break;
        case 'historial-pagos':
            cargarHistorialPagos();
            break;
    }
}

// ============ CARGA INICIAL DE DATOS ============

async function cargarPerfilUsuario() {
    const operation = 'cargar-perfil';
    
    try {
        LoadingManager.start(operation);
        console.log('🔄 Cargando perfil de usuario...');
        
        // Verificar cache
        const cached = CacheManager.get('usuario-perfil');
        if (cached) {
            llenarDatosUsuario(cached);
            console.log('✅ Perfil cargado desde cache');
        }
        
        // CORREGIDO: Usar endpoint correcto
        const usuario = await apiRequest('/usuarios/perfil');
        
        console.log('✅ Perfil cargado desde servidor:', usuario);
        
        CacheManager.set('usuario-perfil', usuario);
        llenarDatosUsuario(usuario);
        
        // Guardar datos originales para restaurar
        datosOriginales = { ...usuario };
        
    } catch (error) {
        console.error('❌ Error cargando perfil:', error);
        
        // Si hay error, intentar usar datos del auth
        const user = auth.getUser();
        if (user) {
            console.log('📋 Usando datos básicos del auth:', user);
            llenarDatosUsuario(user);
            datosOriginales = { ...user };
        } else {
            mostrarMensaje('Error cargando perfil. Intenta recargar la página.', 'error');
        }
    } finally {
        LoadingManager.end(operation);
    }
}

function llenarDatosUsuario(usuario) {
    // Llenar formulario con datos - CORREGIDO: más campos
    const campos = {
        'nombre': usuario.nombre || '',
        'email': usuario.email || '',
        'telefono': usuario.telefono || '',
        'documento': usuario.documento || '',
        'direccion': usuario.direccion || '',
        'fecha_nacimiento': usuario.fecha_nacimiento ? usuario.fecha_nacimiento.split('T')[0] : '',
        'genero': usuario.genero || '',
        'tipo_usuario': usuario.tipo || 'cliente'
    };
    
    Object.entries(campos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            if (elemento.type === 'select-one') {
                elemento.value = valor;
            } else {
                elemento.value = valor;
            }
        }
    });
    
    // Actualizar sidebar
    const nombreUsuario = document.getElementById('nombre-usuario');
    const emailUsuario = document.getElementById('email-usuario');
    
    if (nombreUsuario) nombreUsuario.textContent = usuario.nombre || 'Usuario';
    if (emailUsuario) emailUsuario.textContent = usuario.email || '';
    
    // AGREGAR: Actualizar avatar si existe
    const avatarImg = document.getElementById('avatar-usuario');
    if (avatarImg && usuario.avatar) {
        avatarImg.src = usuario.avatar;
        avatarImg.onerror = function() {
            this.src = 'recursos/avatar-default.png';
        };
    }
    
    // Configuración de notificaciones
    if (usuario.configuracion) {
        try {
            const notifConfig = typeof usuario.configuracion === 'string' 
                ? JSON.parse(usuario.configuracion) 
                : usuario.configuracion;
                
            const checkboxes = {
                'notif-email': notifConfig.notificaciones_email !== false,
                'notif-sms': notifConfig.notificaciones_sms || false,
                'notif-recordatorios': notifConfig.recordatorios_citas !== false
            };
            
            Object.entries(checkboxes).forEach(([id, checked]) => {
                const elemento = document.getElementById(id);
                if (elemento) elemento.checked = checked;
            });
        } catch (error) {
            console.warn('Error parseando configuración:', error);
        }
    }
}

// ============ GESTIÓN DE CRÉDITOS ============

async function cargarCreditos() {
    const operation = 'cargar-creditos';
    
    try {
        LoadingManager.start(operation);
        console.log('🔄 Cargando créditos...');
        
        // Verificar cache
        const cached = CacheManager.get('usuario-creditos');
        if (cached) {
            renderizarCreditos(cached);
            console.log('✅ Créditos cargados desde cache');
        }
        
        // Intentar cargar datos reales
        try {
            const creditos = await apiRequest('/creditos/mis-creditos');
            CacheManager.set('usuario-creditos', creditos);
            renderizarCreditos(creditos);
        } catch (error) {
            console.warn('⚠️ No se pudieron cargar créditos reales, usando datos de ejemplo');
            
            // Datos de ejemplo para MVP
            const creditosEjemplo = [
                {
                    id: 1,
                    servicio_nombre: 'Psicoterapia Individual',
                    codigo: 'PSICO_IND',
                    cantidad_inicial: 4,
                    cantidad_disponible: 2,
                    duracion: 60,
                    fecha_vencimiento: '2025-08-25'
                },
                {
                    id: 2,
                    servicio_nombre: 'Orientación Familiar',
                    codigo: 'ORIENT_FAM',
                    cantidad_inicial: 2,
                    cantidad_disponible: 1,
                    duracion: 90,
                    fecha_vencimiento: '2025-07-15'
                }
            ];
            
            renderizarCreditos(creditosEjemplo);
        }
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

function renderizarCreditos(creditos) {
    const container = document.getElementById('lista-creditos');
    if (!container) return;
    
    if (!creditos || creditos.length === 0) {
        container.innerHTML = '<p class="sin-creditos">No tienes créditos disponibles. <a href="comprar.html">Comprar créditos</a></p>';
        actualizarResumenCreditos(0, 0, 0);
        return;
    }
    
    // Calcular resumen
    const totalCreditos = creditos.reduce((sum, c) => sum + (c.cantidad_disponible || 0), 0);
    const creditosUsados = creditos.reduce((sum, c) => sum + ((c.cantidad_inicial || 0) - (c.cantidad_disponible || 0)), 0);
    const proximosVencer = creditos.filter(c => {
        if (!c.fecha_vencimiento) return false;
        const vencimiento = new Date(c.fecha_vencimiento);
        const hoy = new Date();
        const diasDiferencia = (vencimiento - hoy) / (1000 * 60 * 60 * 24);
        return diasDiferencia <= 30 && diasDiferencia > 0;
    }).reduce((sum, c) => sum + (c.cantidad_disponible || 0), 0);
    
    actualizarResumenCreditos(totalCreditos, creditosUsados, proximosVencer);
    
    // Renderizar lista
    const fragment = document.createDocumentFragment();
    
    creditos.forEach(credito => {
        const creditoElement = document.createElement('div');
        creditoElement.className = 'credito-item';
        creditoElement.innerHTML = `
            <div class="credito-info">
                <h4>${credito.servicio_nombre || credito.nombre || 'Servicio'}</h4>
                <p>Código: ${credito.servicio || credito.codigo || 'N/A'}</p>
                <p>Duración: ${credito.duracion || 60} minutos</p>
                ${credito.fecha_vencimiento ? `<p>Vence: ${formatearFecha(credito.fecha_vencimiento)}</p>` : ''}
            </div>
            <div class="credito-cantidad">
                <span class="cantidad-disponible">${credito.cantidad_disponible || 0}</span>
                <span class="cantidad-total">de ${credito.cantidad_inicial || 0}</span>
                <div class="progreso-credito">
                    <div class="progreso-barra" style="width: ${((credito.cantidad_disponible || 0) / (credito.cantidad_inicial || 1)) * 100}%"></div>
                </div>
            </div>
            <div class="credito-acciones">
                <button class="btn-usar-credito" onclick="usarCredito(${credito.id})" ${(credito.cantidad_disponible || 0) === 0 ? 'disabled' : ''}>
                    Usar Crédito
                </button>
            </div>
        `;
        fragment.appendChild(creditoElement);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

function actualizarResumenCreditos(total, usados, proximos) {
    const elementos = [
        { id: 'total-creditos', valor: total },
        { id: 'creditos-usados', valor: usados },
        { id: 'creditos-vencer', valor: proximos }
    ];
    
    elementos.forEach(({ id, valor }) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = valor;
    });
}

// ============ GESTIÓN DE CITAS ============

async function cargarMisCitas() {
    const operation = 'cargar-citas';
    
    try {
        LoadingManager.start(operation);
        console.log('🔄 Cargando mis citas...');
        
        // Verificar cache
        const cached = CacheManager.get('usuario-citas');
        if (cached) {
            renderizarCitas(cached);
            console.log('✅ Citas cargadas desde cache');
        }
        
        // Intentar cargar datos reales
        try {
            const citas = await apiRequest('/citas/mis-citas');
            CacheManager.set('usuario-citas', citas);
            renderizarCitas(citas);
        } catch (error) {
            console.warn('⚠️ No se pudieron cargar citas reales, usando datos de ejemplo');
            
            // Datos de ejemplo para MVP
            const citasEjemplo = [
                {
                    id: 1,
                    fecha: '2025-05-28',
                    hora: '10:00',
                    servicio_nombre: 'Psicoterapia Individual',
                    modalidad: 'presencial',
                    estado: 'confirmada',
                    comentarios_cliente: 'Primera sesión'
                },
                {
                    id: 2,
                    fecha: '2025-05-15',
                    hora: '15:30',
                    servicio_nombre: 'Orientación Familiar',
                    modalidad: 'virtual',
                    estado: 'completada',
                    link_virtual: 'https://meet.google.com/abc-def-ghi'
                }
            ];
            
            renderizarCitas(citasEjemplo);
        }
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

function renderizarCitas(citas) {
    const container = document.getElementById('lista-citas');
    if (!container) return;
    
    if (!citas || citas.length === 0) {
        container.innerHTML = '<p class="sin-citas">No tienes citas registradas. <a href="agendar-cita.html">Agendar nueva cita</a></p>';
        actualizarResumenCitas(0, 0, 0, 0);
        return;
    }
    
    // Aplicar filtro
    const filtroEstado = document.getElementById('filtro-estado-citas')?.value || 'todas';
    const citasFiltradas = filtroEstado === 'todas' ? citas : citas.filter(c => c.estado === filtroEstado);
    
    // Calcular resumen
    const total = citas.length;
    const proximas = citas.filter(c => {
        if (c.estado !== 'agendada' && c.estado !== 'confirmada') return false;
        const fechaCita = new Date(c.fecha);
        return fechaCita >= new Date();
    }).length;
    const completadas = citas.filter(c => c.estado === 'completada').length;
    const canceladas = citas.filter(c => c.estado === 'cancelada').length;
    
    actualizarResumenCitas(total, proximas, completadas, canceladas);
    
    // Renderizar lista
    const fragment = document.createDocumentFragment();
    
    citasFiltradas.forEach(cita => {
        const citaElement = document.createElement('div');
        citaElement.className = `cita-item ${cita.estado}`;
        citaElement.innerHTML = `
            <div class="cita-fecha">
                <div class="fecha">${formatearFecha(cita.fecha)}</div>
                <div class="hora">${cita.hora || '00:00'}</div>
            </div>
            <div class="cita-info">
                <h4>${cita.servicio_nombre || 'Servicio'}</h4>
                <p>Modalidad: ${cita.modalidad || 'Presencial'}</p>
                <p>Estado: <span class="estado ${cita.estado}">${cita.estado}</span></p>
                ${cita.comentarios_cliente ? `<p>Comentarios: ${cita.comentarios_cliente}</p>` : ''}
                ${cita.link_virtual ? `<p><a href="${cita.link_virtual}" target="_blank">Enlace virtual</a></p>` : ''}
            </div>
            <div class="cita-acciones">
                <button class="btn-ver-detalle" onclick="verDetalleCita(${cita.id})">Ver Detalles</button>
                ${(cita.estado === 'agendada' || cita.estado === 'confirmada') ? `
                    <button class="btn-cancelar-cita" onclick="cancelarCita(${cita.id})">Cancelar</button>
                ` : ''}
            </div>
        `;
        fragment.appendChild(citaElement);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

function actualizarResumenCitas(total, proximas, completadas, canceladas) {
    const elementos = [
        { id: 'total-citas', valor: total },
        { id: 'proximas-citas', valor: proximas },
        { id: 'citas-completadas', valor: completadas },
        { id: 'citas-canceladas', valor: canceladas }
    ];
    
    elementos.forEach(({ id, valor }) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = valor;
    });
}

// ============ GESTIÓN DE PAGOS ============

async function cargarHistorialPagos() {
    const operation = 'cargar-pagos';
    
    try {
        LoadingManager.start(operation);
        console.log('🔄 Cargando historial de pagos...');
        
        // Verificar cache
        const cached = CacheManager.get('usuario-pagos');
        if (cached) {
            renderizarHistorialPagos(cached);
            console.log('✅ Pagos cargados desde cache');
        }
        
        // Intentar cargar datos reales
        try {
            const response = await apiRequest('/pagos/mis-pagos');
            const pagos = response.pagos || response || [];
            
            CacheManager.set('usuario-pagos', pagos);
            renderizarHistorialPagos(pagos);
        } catch (error) {
            console.warn('⚠️ No se pudieron cargar pagos reales, usando datos de ejemplo');
            
            // Datos de ejemplo para MVP
            const pagosEjemplo = [
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
                    estado: 'pendiente'
                }
            ];
            
            renderizarHistorialPagos(pagosEjemplo);
        }
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

function renderizarHistorialPagos(pagos) {
    const container = document.getElementById('lista-pagos');
    if (!container) return;
    
    if (!pagos || pagos.length === 0) {
        container.innerHTML = '<p class="sin-pagos">No tienes pagos registrados.</p>';
        actualizarResumenPagos(0, 0, '-');
        return;
    }
    
    // Aplicar filtro
    const filtroEstado = document.getElementById('filtro-estado-pagos')?.value || 'todos';
    const pagosFiltrados = filtroEstado === 'todos' ? pagos : pagos.filter(p => p.estado === filtroEstado);
    
    // Calcular resumen
    const totalPagado = pagos.filter(p => p.estado === 'aprobado').reduce((sum, p) => sum + (p.monto || 0), 0);
    const pendientes = pagos.filter(p => p.estado === 'pendiente').length;
    const ultimoPago = pagos.length > 0 ? formatearFecha(pagos[0].fecha || pagos[0].created_at) : '-';
    
    actualizarResumenPagos(totalPagado, pendientes, ultimoPago);
    
    // Renderizar lista
    const fragment = document.createDocumentFragment();
    
    pagosFiltrados.forEach(pago => {
        const pagoElement = document.createElement('div');
        pagoElement.className = `pago-item ${pago.estado}`;
        pagoElement.innerHTML = `
            <div class="pago-fecha">
                <div class="fecha">${formatearFecha(pago.fecha || pago.created_at)}</div>
                <div class="metodo">${pago.metodo || pago.metodo_pago || 'QR'}</div>
            </div>
            <div class="pago-info">
                <h4>${pago.concepto}</h4>
                <p>Monto: ${formatearPrecio(pago.monto)}</p>
                <p>Estado: <span class="estado ${pago.estado}">${pago.estado}</span></p>
                ${pago.referencia ? `<p>Referencia: ${pago.referencia}</p>` : ''}
            </div>
            <div class="pago-acciones">
                <button class="btn-ver-detalle" onclick="verDetallePago(${pago.id})">Ver Detalles</button>
                ${pago.comprobante ? `
                    <button class="btn-ver-comprobante" onclick="verComprobante('${pago.comprobante}')">Ver Comprobante</button>
                ` : ''}
            </div>
        `;
        fragment.appendChild(pagoElement);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
}

function actualizarResumenPagos(totalPagado, pendientes, ultimoPago) {
    const elementos = [
        { id: 'total-pagado', valor: formatearPrecio(totalPagado) },
        { id: 'pagos-pendientes', valor: pendientes },
        { id: 'ultimo-pago', valor: ultimoPago }
    ];
    
    elementos.forEach(({ id, valor }) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = valor;
    });
}

// ============ GESTIÓN DE INFORMACIÓN PERSONAL ============

function toggleEditarInfo() {
    editandoInfo = !editandoInfo;
    
    console.log('🔧 Modo edición:', editandoInfo ? 'ACTIVADO' : 'DESACTIVADO');
    
    // CORREGIDO: incluir todos los campos editables
    const campos = ['nombre', 'telefono', 'documento', 'direccion', 'fecha_nacimiento', 'genero'];
    const btnEditar = document.getElementById('btn-editar-info');
    const formActions = document.getElementById('form-actions');
    
    campos.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento) {
            elemento.disabled = !editandoInfo;
            console.log(`📝 Campo ${campo}:`, editandoInfo ? 'HABILITADO' : 'DESHABILITADO');
        } else {
            console.warn(`⚠️ Campo ${campo} no encontrado`);
        }
    });
    
    if (btnEditar) {
        btnEditar.textContent = editandoInfo ? 'Cancelar Edición' : 'Editar';
        btnEditar.className = editandoInfo ? 'btn-cancelar' : 'btn-editar';
    }
    
    if (formActions) {
        formActions.style.display = editandoInfo ? 'flex' : 'none';
        console.log('🎛️ Botones de acción:', editandoInfo ? 'MOSTRADOS' : 'OCULTOS');
    }
    
    if (!editandoInfo) {
        restaurarDatosOriginales();
    }
}

// AGREGAR función para cancelar desde el botón "Editar"
function cancelarDesdeBotonEditar() {
    if (editandoInfo) {
        restaurarDatosOriginales();
        toggleEditarInfo();
    } else {
        toggleEditarInfo();
    }
}

function restaurarDatosOriginales() {
    const campos = ['nombre', 'telefono', 'documento', 'direccion', 'fecha_nacimiento', 'genero'];
    campos.forEach(campo => {
        const elemento = document.getElementById(campo);
        if (elemento && datosOriginales[campo] !== undefined) {
            if (campo === 'fecha_nacimiento' && datosOriginales[campo]) {
                elemento.value = datosOriginales[campo].split('T')[0];
            } else {
                elemento.value = datosOriginales[campo] || '';
            }
        }
    });
}

function cancelarEdicion() {
    restaurarDatosOriginales();
    toggleEditarInfo();
}

// Validación de formularios mejorada
function validarFormularioInfo(datos) {
    const errores = [];
    
    // Validar nombre
    if (!datos.nombre || datos.nombre.trim().length < 2) {
        errores.push('El nombre debe tener al menos 2 caracteres');
    }
    
    // Validar teléfono
    const telefonoRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!datos.telefono || !telefonoRegex.test(datos.telefono.replace(/\s/g, ''))) {
        errores.push('El teléfono debe tener un formato válido');
    }
    
    // Validar documento si se proporciona
    if (datos.documento && datos.documento.trim().length < 6) {
        errores.push('El documento debe tener al menos 6 caracteres');
    }
    
    // Validar fecha de nacimiento
    if (datos.fecha_nacimiento) {
        const fechaNac = new Date(datos.fecha_nacimiento);
        const hoy = new Date();
        const edad = hoy.getFullYear() - fechaNac.getFullYear();
        
        if (edad < 13 || edad > 120) {
            errores.push('La fecha de nacimiento no es válida');
        }
    }
    
    return errores;
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
            documento: formData.get('documento'),
            direccion: formData.get('direccion'),
            fecha_nacimiento: formData.get('fecha_nacimiento'),
            genero: formData.get('genero')
        };
        
        // AGREGAR: Validaciones mejoradas
        const errores = validarFormularioInfo(datosActualizados);
        if (errores.length > 0) {
            mostrarMensaje('Errores de validación:\n• ' + errores.join('\n• '), 'error');
            return;
        }
        
        console.log('📤 Enviando datos actualizados:', datosActualizados);
        
        const response = await apiRequest('/usuarios/perfil', {
            method: 'PUT',
            body: JSON.stringify(datosActualizados)
        });
        
        console.log('✅ Información actualizada:', response);
        
        mostrarMensaje('Información actualizada correctamente', 'success');
        
        // Actualizar datos originales y cache
        datosOriginales = { ...datosOriginales, ...datosActualizados };
        CacheManager.invalidate('usuario');
        
        // Actualizar sidebar con nuevos datos
        const nombreUsuario = document.getElementById('nombre-usuario');
        if (nombreUsuario) nombreUsuario.textContent = datosActualizados.nombre;
        
        toggleEditarInfo();
        
    } catch (error) {
        console.error('❌ Error actualizando información:', error);
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

// ============ GESTIÓN DE CONFIGURACIÓN ============

async function guardarNotificaciones(event) {
    event.preventDefault();
    
    const operation = 'guardar-notificaciones';
    
    try {
        LoadingManager.start(operation);
        
        const formData = new FormData(event.target);
        const configuracion = {
            notificaciones_email: formData.has('notificaciones_email'),
            notificaciones_sms: formData.has('notificaciones_sms'),
            recordatorios_citas: formData.has('recordatorios_citas')
        };
        
        console.log('⚙️ Guardando configuración:', configuracion);
        
        // CORREGIDO: Usar endpoint correcto
        const response = await apiRequest('/usuarios/perfil', {
            method: 'PUT',
            body: JSON.stringify({ 
                configuracion: JSON.stringify(configuracion) 
            })
        });
        
        console.log('✅ Configuración guardada:', response);
        
        mostrarMensaje('Preferencias de notificación guardadas', 'success');
        
        // Actualizar cache
        CacheManager.invalidate('usuario');
        
    } catch (error) {
        console.error('❌ Error guardando notificaciones:', error);
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
        const passwordActual = formData.get('password_actual');
        const passwordNueva = formData.get('password_nueva');
        const passwordConfirmar = formData.get('password_confirmar');
        
        console.log('🔐 Intentando cambiar contraseña...');
        
        // Validaciones
        if (!passwordActual.trim()) {
            mostrarMensaje('Debes ingresar tu contraseña actual', 'error');
            return;
        }
        
        if (!passwordNueva.trim()) {
            mostrarMensaje('Debes ingresar una nueva contraseña', 'error');
            return;
        }
        
        if (passwordNueva !== passwordConfirmar) {
            mostrarMensaje('Las contraseñas nuevas no coinciden', 'error');
            return;
        }
        
        if (passwordNueva.length < 6) {
            mostrarMensaje('La nueva contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        if (passwordActual === passwordNueva) {
            mostrarMensaje('La nueva contraseña debe ser diferente a la actual', 'error');
            return;
        }
        
        // CORREGIDO: Usar endpoint correcto
        const response = await apiRequest('/auth/cambiar-password', {
            method: 'PUT',
            body: JSON.stringify({
                password_actual: passwordActual,
                password_nueva: passwordNueva
            })
        });
        
        console.log('✅ Contraseña cambiada:', response);
        
        mostrarMensaje('Contraseña cambiada exitosamente', 'success');
        
        // Limpiar formulario
        event.target.reset();
        
    } catch (error) {
        console.error('❌ Error cambiando contraseña:', error);
        
        // Manejar errores específicos
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            mostrarMensaje('La contraseña actual es incorrecta', 'error');
        } else if (error.message.includes('400')) {
            mostrarMensaje('Datos de contraseña inválidos', 'error');
        } else {
            mostrarMensaje('Error al cambiar la contraseña: ' + error.message, 'error');
        }
    } finally {
        LoadingManager.end(operation);
    }
}

function confirmarEliminarCuenta() {
    if (confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) {
        if (confirm('Esta acción eliminará permanentemente todos tus datos. ¿Continuar?')) {
            eliminarCuenta();
        }
    }
}

async function eliminarCuenta() {
    const operation = 'eliminar-cuenta';
    
    try {
        LoadingManager.start(operation);
        
        await apiRequest('/usuarios/perfil', {
            method: 'DELETE'
        });
        
        mostrarMensaje('Cuenta eliminada exitosamente', 'success');
        
        // Cerrar sesión y redirigir
        setTimeout(() => {
            auth.logout();
        }, 2000);
        
    } catch (error) {
        ErrorHandler.handle(error, operation);
    } finally {
        LoadingManager.end(operation);
    }
}

// ============ FUNCIONES AUXILIARES ============

function usarCredito(creditoId) {
    mostrarMensaje('Redirigiendo a agendar cita...', 'info');
    window.location.href = `agendar-cita.html?credito=${creditoId}`;
}

function verDetalleCita(citaId) {
    mostrarMensaje('Función de ver detalle de cita en desarrollo', 'info');
}

function cancelarCita(citaId) {
    if (confirm('¿Estás seguro de que quieres cancelar esta cita?')) {
        mostrarMensaje('Función de cancelar cita en desarrollo', 'info');
    }
}

function verDetallePago(pagoId) {
    mostrarMensaje('Función de ver detalle de pago en desarrollo', 'info');
}

function verComprobante(comprobante) {
    if (comprobante) {
        const url = `${CONFIG.API_BASE_URL.replace('/api', '')}/uploads/${comprobante}`;
        window.open(url, '_blank');
    } else {
        mostrarMensaje('No hay comprobante disponible', 'warning');
    }
}

function cambiarAvatar() {
    mostrarMensaje('Función de cambio de avatar en desarrollo', 'info');
}

function agendarNuevaCita() {
    console.log('📅 Preparando para agendar cita...');
    
    // Verificar si el usuario tiene créditos
    const totalCreditos = document.getElementById('total-creditos');
    const creditosDisponibles = totalCreditos ? parseInt(totalCreditos.textContent) : 0;
    
    if (creditosDisponibles === 0) {
        // Mostrar modal personalizado en lugar de confirm
        mostrarModalSinCreditos();
        return;
    }
    
    // Mostrar mensaje de carga
    mostrarMensaje('Redirigiendo a agendar cita...', 'info', 2000);
    
    // Redirigir después de un breve delay
    setTimeout(() => {
        window.location.href = 'agendar-cita.html';
    }, 500);
}

// AGREGAR función para modal sin créditos
function mostrarModalSinCreditos() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        ">
            <div style="font-size: 48px; margin-bottom: 20px;">💳</div>
            <h3 style="color: #333; margin-bottom: 15px;">Sin Créditos Disponibles</h3>
            <p style="color: #666; margin-bottom: 25px;">
                Necesitas créditos para agendar una cita. 
                ¿Deseas comprar créditos ahora?
            </p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="this.closest('div').parentElement.remove()" style="
                    padding: 10px 20px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">Cancelar</button>
                <button onclick="window.location.href='comprar.html'" style="
                    padding: 10px 20px;
                    background: #4EC3B1;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                ">Comprar Créditos</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function cerrarSesion() {
    if (confirm('¿Estás seguro de que quieres cerrar la sesión?')) {
        console.log('🚪 Cerrando sesión...');
        
        try {
            // Limpiar cache local
            CacheManager.clear();
            
            // Usar función de auth si existe
            if (auth && auth.logout) {
                auth.logout();
            } else {
                // Fallback manual
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                sessionStorage.clear();
                
                mostrarMensaje('Sesión cerrada exitosamente', 'success');
                
                // Redirigir después de un breve delay
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 1000);
            }
        } catch (error) {
            console.error('Error cerrando sesión:', error);
            // Forzar cierre de sesión
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login.html';
        }
    }
}

// ============ FUNCIONES AUXILIARES ADICIONALES ============

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

    container.appendChild(mensajeElement);

    // Auto-remover después de la duración especificada
    if (duracion > 0) {
        setTimeout(() => {
            if (mensajeElement.parentNode) {
                mensajeElement.remove();
            }
        }, duracion);
    }
}

// Función para formatear fechas (si no está en config.js)
function formatearFecha(fecha) {
    if (!fecha) return 'No disponible';
    
    try {
        let date;
        if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = fecha.split('-');
            date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
            date = new Date(fecha);
        }
        
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        return 'Fecha inválida';
    }
}

// Función para formatear precios (si no está en config.js)
function formatearPrecio(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount);
}

// ============ CONFIGURACIÓN DE EVENTOS ============

function configurarEventos() {
    // Configurar navegación
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const seccion = this.getAttribute('data-section');
            if (seccion) {
                mostrarSeccion(seccion);
            }
        });
    });
    
    // Configurar filtros
    const filtroEstadoCitas = document.getElementById('filtro-estado-citas');
    if (filtroEstadoCitas) {
        filtroEstadoCitas.addEventListener('change', cargarMisCitas);
    }
    
    const filtroEstadoPagos = document.getElementById('filtro-estado-pagos');
    if (filtroEstadoPagos) {
        filtroEstadoPagos.addEventListener('change', cargarHistorialPagos);
    }
}

// ============ INICIALIZACIÓN ============

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando perfil de cliente...');
    
    // Verificar autenticación
    if (!auth || !auth.requireAuth()) {
        window.location.href = '/login.html';
        return;
    }
    
    // Verificar que es cliente
    const user = auth.getUser();
    if (!user || user.tipo !== 'cliente') {
        console.error('❌ Acceso denegado - Solo para clientes');
        window.location.href = '/login.html';
        return;
    }
    
    // Configurar eventos
    configurarEventos();
    
    // Cargar datos iniciales
    cargarPerfilUsuario();
    
    console.log('✅ Perfil de cliente inicializado correctamente');
});

console.log('✅ Perfil de cliente de CreSer cargado');
