// ============ CONFIGURACIÓN Y VARIABLES GLOBALES ============
let serviciosDisponibles = [];
let usuarioActual = null;

// ============ INICIALIZACIÓN ============
document.addEventListener("DOMContentLoaded", async () => {
    // Evitar inicialización múltiple
    if (window.sistemaInicializado) return;
    window.sistemaInicializado = true;
    
    console.log('🚀 Inicializando sistema de agendamiento...');
    
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
    
    try {
        console.log('🔄 Cargando servicios disponibles...');
        await cargarServiciosDisponibles();
        
        // Configurar eventos después de cargar datos
        configurarEventos();
        configurarValidacionHorarios();
        
        console.log('✅ Sistema de agendamiento inicializado');
        
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
        mostrarMensaje('Error inicializando el sistema. Por favor, recarga la página.', 'error');
    }
});

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
        
        // Actualizar selector sin validar créditos
        actualizarSelectorServicios();
        
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
        
        // Actualizar selector sin validar créditos
        actualizarSelectorServicios();
    }
}

// ============ ACTUALIZACIÓN DE UI SIN VALIDACIÓN DE CRÉDITOS ============

function actualizarSelectorServicios() {
    const selector = document.getElementById('servicio');
    
    if (!selector) {
        console.error('❌ No se encontró el selector de servicios');
        return;
    }
    
    // Limpiar selector
    selector.innerHTML = '<option value="">Selecciona un servicio</option>';
    
    // Si no hay servicios cargados, mostrar error
    if (serviciosDisponibles.length === 0) {
        console.warn('⚠️ No hay servicios disponibles cargados');
        selector.innerHTML = '<option value="">Error: No se pudieron cargar los servicios</option>';
        return;
    }
    
    console.log('🔍 DEBUG serviciosDisponibles:', serviciosDisponibles);
    
    // Mostrar todos los servicios sin validar créditos
    serviciosDisponibles.forEach(servicio => {
        const option = document.createElement('option');
        option.value = servicio.id;
        option.textContent = `${servicio.nombre} - ${formatearPrecio(servicio.precio)}`;
        option.dataset.precio = servicio.precio;
        option.dataset.duracion = servicio.duracion_minutos || 60;
        selector.appendChild(option);
    });

    selector.disabled = false;
    
    console.log('✅ Selector de servicios actualizado (sin validación de créditos)');
}

// ============ CONFIGURACIÓN DE EVENTOS ============

function configurarEventos() {
    const form = document.getElementById("agenda-form");
    const servicioSelect = document.getElementById('servicio');
    const fechaInput = document.getElementById('fecha');
    const horaSelect = document.getElementById('hora');
    
    if (!form || !servicioSelect || !fechaInput || !horaSelect) {
        console.error('❌ No se encontraron elementos del formulario');
        return;
    }
    
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
    
    console.log('✅ Eventos configurados');
}

function configurarValidacionHorarios() {
    const fechaInput = document.getElementById('fecha');
    
    if (fechaInput) {
        try {
            // ✅ CORREGIDO: Establecer fecha mínima (mañana)
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            fechaInput.min = tomorrow.toISOString().split('T')[0];
            
            // ✅ CORREGIDO: Establecer fecha máxima (3 meses adelante)
            const maxDate = new Date();
            maxDate.setMonth(maxDate.getMonth() + 3);
            fechaInput.max = maxDate.toISOString().split('T')[0];
            
            console.log('✅ Validación de horarios configurada');
            
        } catch (error) {
            console.error('❌ Error configurando validación de horarios:', error);
        }
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
    
    if (!form || !btn) return false;
    
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
    const resumenCita = document.getElementById('resumen-cita');
    
    if (!servicio || !fecha || !hora || !resumenCita) return;
    
    if (servicio.value && fecha.value && hora.value && modalidad) {
        const selectedOption = servicio.options[servicio.selectedIndex];
        const precio = selectedOption.dataset.precio || 0;
        
        const resumenServicio = document.getElementById('resumen-servicio');
        const resumenFechaHora = document.getElementById('resumen-fecha-hora');
        const resumenModalidad = document.getElementById('resumen-modalidad');
        const resumenPrecio = document.getElementById('resumen-precio');
        
        if (resumenServicio) resumenServicio.textContent = selectedOption.text;
        if (resumenFechaHora) resumenFechaHora.textContent = 
            `${formatearFecha(fecha.value)} a las ${formatearHora(hora.value)}`;
        if (resumenModalidad) resumenModalidad.textContent = 
            modalidad.value.charAt(0).toUpperCase() + modalidad.value.slice(1);
        if (resumenPrecio) resumenPrecio.textContent = formatearPrecio(precio);
        
        resumenCita.style.display = 'block';
    } else {
        resumenCita.style.display = 'none';
    }
}

// ============ AGENDAMIENTO DE CITA SIN VALIDAR CRÉDITOS ============

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
        
        console.log('📤 Enviando datos de cita (sin validar créditos):', datos);
        
        const response = await apiRequest('/citas', {
            method: 'POST',
            body: JSON.stringify(datos)
        });
        
        console.log('✅ Cita agendada exitosamente:', response);
        
        // Mostrar confirmación
        mostrarConfirmacionCita(response);
        
        // Limpiar formulario
        form.reset();
        const resumenCita = document.getElementById('resumen-cita');
        if (resumenCita) resumenCita.style.display = 'none';
        
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
    
    const modalBodyContent = document.getElementById('modal-body-content');
    const modalConfirmacion = document.getElementById('modal-confirmacion');
    
    if (modalBodyContent) modalBodyContent.innerHTML = modalContent;
    if (modalConfirmacion) modalConfirmacion.style.display = 'flex';
}

function cerrarModal() {
    const modalConfirmacion = document.getElementById('modal-confirmacion');
    if (modalConfirmacion) modalConfirmacion.style.display = 'none';
}

// ============ FUNCIONES AUXILIARES ============

function formatearFecha(fecha) {
    try {
        const date = new Date(fecha + 'T00:00:00'); // Evitar problemas de zona horaria
        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Error formateando fecha:', error);
        return fecha;
    }
}

function formatearHora(hora) {
    try {
        const [hours, minutes] = hora.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    } catch (error) {
        console.error('Error formateando hora:', error);
        return hora;
    }
}

function formatearPrecio(amount) {
    try {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    } catch (error) {
        console.error('Error formateando precio:', error);
        return `$${amount}`;
    }
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
    console.log('🔍 auth.isAuthenticated():', auth?.isAuthenticated());
    console.log('🔍 CONFIG.API_BASE_URL:', CONFIG?.API_BASE_URL);
    
    // Verificar elementos DOM
    const elementos = {
        'servicio': document.getElementById('servicio'),
        'agenda-form': document.getElementById('agenda-form'),
        'fecha': document.getElementById('fecha'),
        'hora': document.getElementById('hora'),
        'agendar-btn': document.getElementById('agendar-btn')
    };
    
    Object.entries(elementos).forEach(([nombre, elemento]) => {
        console.log(`🔍 Elemento ${nombre}:`, elemento ? 'EXISTS' : 'NOT FOUND');
    });
    
    console.log('🔍 === FIN DEBUG ===');
}

// Función global para cerrar modal (para onclick en HTML)
window.cerrarModal = cerrarModal;

console.log('✅ Sistema de agendamiento de CreSer cargado (sin validación de créditos)');
