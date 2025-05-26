// ============ CONFIGURACIÓN Y VARIABLES GLOBALES ============
let serviciosDisponibles = [];
let creditosUsuario = [];
let usuarioActual = null;

// ============ INICIALIZACIÓN ============
document.addEventListener("DOMContentLoaded", async () => {
    console.log('🚀 Inicializando sistema de agendamiento...');
    
    // AGREGADO: Configurar header adaptativo
    configurarHeaderAdaptativo();
    
    // Verificar autenticación
    if (!auth || !auth.requireAuth()) {
        window.location.href = '/acceder.html';
        return;
    }

    // Verificar que es cliente
    const user = auth.getUser();
    if (!user || user.tipo !== 'cliente') {
        console.error('❌ Acceso denegado - Solo para clientes');
        window.location.href = '/acceder.html';
        return;
    }

    usuarioActual = user;
    
    // CORREGIDO: Cargar servicios PRIMERO, luego créditos
    try {
        console.log('🔄 Cargando servicios disponibles...');
        await cargarServiciosDisponibles();
        
        console.log('🔄 Cargando créditos del usuario...');
        await cargarCreditosUsuario();
        
        // Configurar eventos después de cargar datos
        configurarEventos();
        configurarValidacionHorarios();
        
        console.log('✅ Sistema de agendamiento inicializado');
        
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
        mostrarMensaje('Error inicializando el sistema. Por favor, recarga la página.', 'error');
    }
});

// ============ GESTIÓN DE HEADER ADAPTATIVO ============

function configurarHeaderAdaptativo() {
    const navContainer = document.getElementById('nav-auth-container');
    if (!navContainer) return;

    // Verificar si hay sesión activa
    const isLoggedIn = auth && auth.isAuthenticated();
    const user = isLoggedIn ? auth.getUser() : null;

    if (isLoggedIn && user) {
        // Usuario logueado - mostrar menú de perfil
        navContainer.innerHTML = `
            <div class="user-menu">
                <div class="user-info">
                    <img src="${user.avatar || 'recursos/avatar-default.png'}" 
                         alt="Avatar" 
                         class="user-avatar"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjNGVjM2IxIi8+Cjx0ZXh0IHg9IjIwIiB5PSIyOCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+VTwvdGV4dD4KPHN2Zz4='">
                    <span class="user-name">${user.nombre || 'Usuario'}</span>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="dropdown-menu">
                    <a href="perfil-cliente.html" class="dropdown-item">
                        <i class="fas fa-user"></i> Mi Perfil
                    </a>
                    <a href="agendar-cita.html" class="dropdown-item active">
                        <i class="fas fa-calendar-plus"></i> Agendar Cita
                    </a>
                    <div class="dropdown-divider"></div>
                    <a href="#" onclick="cerrarSesionHeader()" class="dropdown-item logout">
                        <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
                    </a>
                </div>
            </div>
        `;

        // Configurar dropdown
        configurarDropdownUsuario();
    } else {
        // Usuario no logueado - mostrar botón de acceder
        navContainer.innerHTML = `
            <div class="boton-acceder">
                <a href="acceder.html" class="btn-acceder">
                    <i class="fas fa-sign-in-alt"></i> Acceder
                </a>
            </div>
        `;
    }
}

function configurarDropdownUsuario() {
    const userMenu = document.querySelector('.user-menu');
    const userInfo = document.querySelector('.user-info');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    if (userInfo && dropdownMenu) {
        userInfo.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        // Cerrar dropdown al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!userMenu.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
    }
}

function cerrarSesionHeader() {
    if (confirm('¿Estás seguro de que quieres cerrar la sesión?')) {
        console.log('🚪 Cerrando sesión desde header...');
        
        try {
            if (auth && auth.logout) {
                auth.logout();
            } else {
                // Fallback manual
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                sessionStorage.clear();
                window.location.href = '/login.html';
            }
        } catch (error) {
            console.error('Error cerrando sesión:', error);
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login.html';
        }
    }
}

// ============ CARGA DE DATOS ============

async function cargarServiciosDisponibles() {
    try {
        console.log('🔄 Cargando servicios disponibles...');
        
        // Intentar cargar desde API
        const response = await apiRequest('/servicios');
        
        if (response && Array.isArray(response) && response.length > 0) {
            serviciosDisponibles = response;
            console.log('✅ Servicios cargados desde API:', serviciosDisponibles.length);
        } else {
            throw new Error('Respuesta vacía o inválida');
        }
        
    } catch (error) {
        console.error('❌ Error cargando servicios desde API:', error);
        
        // Fallback: usar servicios estáticos
        serviciosDisponibles = [
            {
                id: 1,
                codigo: 'PSICO_IND',
                nombre: 'Psicoterapia Individual',
                precio: 70000,
                duracion_minutos: 60,
                categoria: 'psicoterapia'
            },
            {
                id: 2,
                codigo: 'ORIENT_FAM',
                nombre: 'Orientación Familiar',
                precio: 110000,
                duracion_minutos: 90,
                categoria: 'orientacion'
            },
            {
                id: 3,
                codigo: 'VALOR_PSICO',
                nombre: 'Valoración Psicológica',
                precio: 100000,
                duracion_minutos: 120,
                categoria: 'evaluacion'
            },
            {
                id: 4,
                codigo: 'PSICO_PAREJA',
                nombre: 'Psicoterapia de Pareja',
                precio: 100000,
                duracion_minutos: 90,
                categoria: 'psicoterapia'
            }
        ];
        
        console.log('✅ Usando servicios fallback:', serviciosDisponibles.length);
        mostrarMensaje('Usando servicios predeterminados', 'warning');
    }
}

async function cargarCreditosUsuario() {
    try {
        console.log('🔄 Cargando créditos del usuario...');
        
        const response = await apiRequest('/usuarios/creditos');
        creditosUsuario = response || [];
        
        console.log('✅ Créditos cargados:', creditosUsuario);
        
        // Actualizar UI
        mostrarCreditosDisponibles(creditosUsuario);
        actualizarSelectorServicios(creditosUsuario);
        
    } catch (error) {
        console.error('❌ Error cargando créditos:', error);
        creditosUsuario = [];
        mostrarMensajeSinCreditos();
        deshabilitarFormulario();
    }
}

// ============ ACTUALIZACIÓN DE UI ============

function mostrarCreditosDisponibles(creditos) {
    const container = document.getElementById('creditos-disponibles');
    if (!container) return;

    if (creditos.length === 0) {
        container.innerHTML = `
            <div class="sin-creditos-info">
                <i class="fas fa-info-circle"></i>
                <span>No tienes créditos disponibles. <a href="comprar.html">Comprar créditos</a></span>
            </div>
        `;
        return;
    }

    const totalCreditos = creditos.reduce((sum, c) => sum + (c.cantidad_disponible || 0), 0);
    
    const creditosHTML = creditos.map(credito => `
        <div class="credito-disponible">
            <span class="servicio-nombre">${credito.servicio_nombre}</span>
            <span class="cantidad">${credito.cantidad_disponible} disponibles</span>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="creditos-header">
            <i class="fas fa-credit-card"></i>
            <span>Tienes ${totalCreditos} créditos disponibles</span>
        </div>
        <div class="creditos-detalle">
            ${creditosHTML}
        </div>
    `;
}

function actualizarSelectorServicios(creditos) {
    const selector = document.getElementById('servicio');
    
    // CORREGIDO: Primero cargar TODOS los servicios disponibles
    selector.innerHTML = '<option value="">Selecciona un servicio</option>';
    
    // Si no hay servicios cargados, cargarlos primero
    if (serviciosDisponibles.length === 0) {
        console.warn('⚠️ No hay servicios disponibles cargados');
        selector.innerHTML = '<option value="">Error: No se pudieron cargar los servicios</option>';
        return;
    }
    
    console.log('🔍 DEBUG serviciosDisponibles:', serviciosDisponibles);
    console.log('🔍 DEBUG creditos:', creditos);
    
    // Si no hay créditos, mostrar todos los servicios pero deshabilitados
    if (!creditos || creditos.length === 0) {
        serviciosDisponibles.forEach(servicio => {
            const option = document.createElement('option');
            option.value = servicio.id;
            option.textContent = `${servicio.nombre} (Sin créditos disponibles)`;
            option.disabled = true;
            selector.appendChild(option);
        });
        selector.disabled = true;
        return;
    }

    // CORREGIDO: Crear mapa de servicios con créditos
    const serviciosConCreditos = new Map();
    
    creditos.forEach(credito => {
        if (credito.cantidad_disponible > 0) {
            serviciosConCreditos.set(credito.servicio_id, credito);
        }
    });
    
    console.log('🔍 DEBUG serviciosConCreditos:', serviciosConCreditos);
    
    // Agrupar servicios por categoría
    const serviciosPorCategoria = {};
    
    serviciosDisponibles.forEach(servicio => {
        const categoria = servicio.categoria || 'Otros';
        
        if (!serviciosPorCategoria[categoria]) {
            serviciosPorCategoria[categoria] = [];
        }
        
        // Verificar si tiene créditos disponibles
        const creditoInfo = serviciosConCreditos.get(servicio.id);
        
        serviciosPorCategoria[categoria].push({
            ...servicio,
            tieneCreditos: !!creditoInfo,
            creditosDisponibles: creditoInfo?.cantidad_disponible || 0,
            precio_unitario: creditoInfo?.precio_unitario || servicio.precio
        });
    });

    // Crear opciones agrupadas
    Object.entries(serviciosPorCategoria).forEach(([categoria, servicios]) => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = categoria.toUpperCase();
        
        servicios.forEach(servicio => {
            const option = document.createElement('option');
            option.value = servicio.id;
            
            if (servicio.tieneCreditos) {
                option.textContent = `${servicio.nombre} (${servicio.creditosDisponibles} créditos disponibles)`;
                option.dataset.precio = servicio.precio_unitario || servicio.precio;
                option.dataset.duracion = servicio.duracion_minutos || 60;
            } else {
                option.textContent = `${servicio.nombre} (Sin créditos)`;
                option.disabled = true;
            }
            
            optgroup.appendChild(option);
        });
        
        selector.appendChild(optgroup);
    });

    selector.disabled = false;
    
    console.log('✅ Selector de servicios actualizado');
}

function mostrarMensajeSinCreditos() {
    const mensaje = document.getElementById('mensaje-sin-creditos');
    if (mensaje) {
        mensaje.style.display = 'block';
    }
}

function deshabilitarFormulario() {
    const form = document.getElementById('agenda-form');
    if (form) {
        const inputs = form.querySelectorAll('input, select, button');
        inputs.forEach(input => {
            input.disabled = true;
        });
    }
}

// ============ CONFIGURACIÓN DE EVENTOS ============

function configurarEventos() {
    const form = document.getElementById("agenda-form");
    const servicioSelect = document.getElementById('servicio');
    const fechaInput = document.getElementById('fecha');
    const horaSelect = document.getElementById('hora');
    
    // Validación en tiempo real
    form.addEventListener("input", validarFormulario);
    form.addEventListener("change", validarFormulario);
    
    // Eventos específicos
    servicioSelect.addEventListener('change', () => {
        actualizarResumen();
        cargarHorariosDisponibles();
    });
    
    fechaInput.addEventListener('change', () => {
        actualizarResumen();
        cargarHorariosDisponibles();
    });
    
    horaSelect.addEventListener('change', actualizarResumen);
    
    // Modalidad
    document.querySelectorAll('input[name="modalidad"]').forEach(radio => {
        radio.addEventListener('change', actualizarResumen);
    });

    // Submit
    form.addEventListener("submit", agendarCita);
}

function configurarValidacionHorarios() {
    const fechaInput = document.getElementById('fecha');
    
    if (fechaInput) {
        // Establecer fecha mínima (mañana)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        fechaInput.min = tomorrow.toISOString().split('T')[0];
        
        // Establecer fecha máxima (3 meses adelante)
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 3);
        fechaInput.max = maxDate.toISOString().split('T')[0];
    }
}

// ============ CARGA DE HORARIOS DINÁMICOS ============

async function cargarHorariosDisponibles() {
    const fechaInput = document.getElementById('fecha');
    const servicioSelect = document.getElementById('servicio');
    const horaSelect = document.getElementById('hora');
    
    if (!fechaInput.value || !servicioSelect.value || !horaSelect) return;

    try {
        horaSelect.innerHTML = '<option value="">Cargando horarios...</option>';
        horaSelect.disabled = true;
        
        console.log('🔄 Cargando horarios disponibles...');
        
        const response = await apiRequest(
            `/citas/horarios-disponibles?fecha=${fechaInput.value}&servicio_id=${servicioSelect.value}`
        );
        
        const horarios = response.horarios_disponibles || [];
        
        horaSelect.innerHTML = '<option value="">Selecciona una hora</option>';
        
        if (horarios.length === 0) {
            horaSelect.innerHTML = '<option value="">No hay horarios disponibles</option>';
            mostrarMensaje('No hay horarios disponibles para la fecha seleccionada', 'warning');
            return;
        }

        horarios.forEach(hora => {
            const option = document.createElement('option');
            option.value = hora;
            option.textContent = formatearHora(hora);
            horaSelect.appendChild(option);
        });
        
        horaSelect.disabled = false;
        console.log('✅ Horarios cargados:', horarios);
        
    } catch (error) {
        console.error('❌ Error cargando horarios:', error);
        horaSelect.innerHTML = '<option value="">Error cargando horarios</option>';
        
        // Fallback a horarios estáticos
        const horariosEstaticos = [
            '08:00', '09:00', '10:00', '11:00', 
            '14:00', '15:00', '16:00', '17:00'
        ];
        
        horaSelect.innerHTML = '<option value="">Selecciona una hora</option>';
        horariosEstaticos.forEach(hora => {
            const option = document.createElement('option');
            option.value = hora;
            option.textContent = formatearHora(hora);
            horaSelect.appendChild(option);
        });
        
        horaSelect.disabled = false;
    }
}

// ============ VALIDACIÓN Y RESUMEN ============

function validarFormulario() {
    const form = document.getElementById("agenda-form");
    const btn = document.getElementById("agendar-btn");
    
    const servicio = form.servicio.value;
    const fecha = form.fecha.value;
    const hora = form.hora.value;
    const modalidad = form.querySelector('input[name="modalidad"]:checked');

    const isValid = servicio && fecha && hora && modalidad;

    btn.disabled = !isValid;
    btn.classList.toggle("enabled", isValid);
    
    return isValid;
}

function actualizarResumen() {
    const servicio = document.getElementById('servicio');
    const fecha = document.getElementById('fecha');
    const hora = document.getElementById('hora');
    const modalidad = document.querySelector('input[name="modalidad"]:checked');
    
    if (servicio.value && fecha.value && hora.value && modalidad) {
        const selectedOption = servicio.options[servicio.selectedIndex];
        const precio = selectedOption.dataset.precio || 0;
        
        document.getElementById('resumen-servicio').textContent = selectedOption.text;
        document.getElementById('resumen-fecha-hora').textContent = 
            `${formatearFecha(fecha.value)} a las ${formatearHora(hora.value)}`;
        document.getElementById('resumen-modalidad').textContent = 
            modalidad.value.charAt(0).toUpperCase() + modalidad.value.slice(1);
        document.getElementById('resumen-precio').textContent = formatearPrecio(precio);
        
        document.getElementById('resumen-cita').style.display = 'block';
    } else {
        document.getElementById('resumen-cita').style.display = 'none';
    }
}

// ============ AGENDAMIENTO DE CITA ============

async function agendarCita(event) {
    event.preventDefault();
    
    const form = document.getElementById("agenda-form");
    const btn = document.getElementById("agendar-btn");
    
    if (!validarFormulario()) {
        mostrarMensaje('Por favor completa todos los campos requeridos', 'error');
        return;
    }
    
    // Preparar datos para FastAPI
    const datos = {
        servicio_id: parseInt(form.servicio.value),
        fecha: form.fecha.value,
        hora: form.hora.value + ':00', // Agregar segundos
        modalidad: form.querySelector('input[name="modalidad"]:checked').value,
        comentarios_cliente: form.comentarios.value || null
    };

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Agendando...';
        
        console.log('📤 Enviando datos de cita:', datos);
        
        const response = await apiRequest('/citas', {
            method: 'POST',
            body: JSON.stringify(datos)
        });
        
        console.log('✅ Cita agendada exitosamente:', response);
        
        // Mostrar confirmación
        mostrarConfirmacionCita(response);
        
        // Limpiar formulario
        form.reset();
        document.getElementById('resumen-cita').style.display = 'none';
        
        // Recargar créditos
        await cargarCreditosUsuario();
        
    } catch (error) {
        console.error('❌ Error agendando cita:', error);
        mostrarMensaje(error.message || 'Error al agendar la cita. Por favor, intenta nuevamente.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-calendar-plus"></i> Agendar Cita';
    }
}

// ============ CONFIRMACIÓN Y MODAL ============

function mostrarConfirmacionCita(cita) {
    const modalContent = `
        <div class="confirmacion-cita">
            <div class="icono-exito">
                <i class="fas fa-check-circle"></i>
            </div>
            <h4>Tu cita ha sido agendada</h4>
            <div class="detalle-cita">
                <p><strong>Fecha:</strong> ${formatearFecha(cita.fecha)}</p>
                <p><strong>Hora:</strong> ${formatearHora(cita.hora)}</p>
                <p><strong>Modalidad:</strong> ${cita.modalidad}</p>
                <p><strong>Estado:</strong> ${cita.estado}</p>
                <p><strong>ID de Cita:</strong> #${cita.id}</p>
            </div>
            <div class="siguiente-pasos">
                <h5>Próximos pasos:</h5>
                <ul>
                    <li>Recibirás un email de confirmación</li>
                    <li>Te contactaremos 24 horas antes</li>
                    <li>Puedes ver tu cita en "Mi Perfil"</li>
                </ul>
            </div>
        </div>
    `;
    
    document.getElementById('modal-body-content').innerHTML = modalContent;
    document.getElementById('modal-confirmacion').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modal-confirmacion').style.display = 'none';
}

// ============ FUNCIONES AUXILIARES ============

function formatearFecha(fecha) {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatearHora(hora) {
    const [hours, minutes] = hora.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

function formatearPrecio(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount);
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

// ============ FUNCIÓN DE DEBUG ============

function debugSistemaAgendamiento() {
    console.log('🔍 === DEBUG SISTEMA AGENDAMIENTO ===');
    console.log('🔍 usuarioActual:', usuarioActual);
    console.log('🔍 serviciosDisponibles:', serviciosDisponibles);
    console.log('🔍 creditosUsuario:', creditosUsuario);
    console.log('🔍 auth.isAuthenticated():', auth?.isAuthenticated());
    console.log('🔍 CONFIG.API_BASE_URL:', CONFIG?.API_BASE_URL);
    
    // Verificar elementos DOM
    const elementos = {
        'servicio': document.getElementById('servicio'),
        'creditos-disponibles': document.getElementById('creditos-disponibles'),
        'agenda-form': document.getElementById('agenda-form')
    };
    
    Object.entries(elementos).forEach(([nombre, elemento]) => {
        console.log(`🔍 Elemento ${nombre}:`, elemento ? 'EXISTS' : 'NOT FOUND');
    });
    
    console.log('🔍 === FIN DEBUG ===');
}

// Descomenta para debug:
// setTimeout(() => debugSistemaAgendamiento(), 3000);

console.log('✅ Sistema de agendamiento de CreSer cargado');
