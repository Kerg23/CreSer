// MANTENER todas las funciones existentes + NUEVAS funciones para FastAPI

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("agenda-form");
    const btn = document.getElementById("agendar-btn");

    // Verificar autenticación
    if (!authManager.requireAuth()) {
        return;
    }

    // MANTENER funciones existentes
    cargarCreditosUsuario();
    configurarEventos();
    
    // NUEVAS funciones para FastAPI
    cargarServiciosDisponibles();
    configurarValidacionHorarios();
});

// FUNCIÓN EXISTENTE ACTUALIZADA para FastAPI
async function cargarCreditosUsuario() {
    try {
        // ACTUALIZADO: Usar nuevo endpoint de FastAPI
        const response = await apiRequest(CONFIG.ENDPOINTS.MIS_CREDITOS);
        const creditos = response || []; // FastAPI devuelve array directo
        
        // Actualizar selector de servicios con créditos disponibles
        actualizarSelectorServicios(creditos);
        
        // NUEVO: Mostrar créditos disponibles en UI
        mostrarCreditosDisponibles(creditos);
        
    } catch (error) {
        console.error('Error cargando créditos:', error);
        mostrarMensaje('Error al cargar tus créditos disponibles', 'error');
        
        // NUEVO: Mostrar mensaje sin créditos
        mostrarMensajeSinCreditos();
    }
}

// FUNCIÓN EXISTENTE ACTUALIZADA
function actualizarSelectorServicios(creditos) {
    const selector = document.getElementById('servicio');
    
    // Limpiar opciones existentes
    selector.innerHTML = '<option value="">Selecciona un servicio</option>';
    
    // ACTUALIZADO: Manejar estructura de créditos de FastAPI
    const creditosDisponibles = creditos.filter(credito => credito.cantidad_disponible > 0);
    
    creditosDisponibles.forEach(credito => {
        const option = document.createElement('option');
        option.value = credito.servicio_id || credito.servicio; // Compatibilidad
        option.textContent = `${credito.servicio_nombre || credito.nombre} (${credito.cantidad_disponible} créditos disponibles)`;
        selector.appendChild(option);
    });

    if (creditosDisponibles.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'No tienes créditos disponibles - Compra créditos primero';
        option.disabled = true;
        selector.appendChild(option);
        
        // NUEVO: Deshabilitar formulario
        deshabilitarFormulario();
    }
}

// NUEVA FUNCIÓN: Cargar servicios disponibles
async function cargarServiciosDisponibles() {
    try {
        const response = await apiRequest(CONFIG.ENDPOINTS.SERVICIOS_DISPONIBLES);
        window.serviciosDisponibles = response || [];
    } catch (error) {
        console.error('Error cargando servicios:', error);
    }
}

// NUEVA FUNCIÓN: Mostrar créditos disponibles
function mostrarCreditosDisponibles(creditos) {
    const container = document.getElementById('creditos-disponibles');
    if (!container) return;

    if (creditos.length === 0) {
        container.innerHTML = `
            <div class="sin-creditos">
                <h3>No tienes créditos disponibles</h3>
                <p>Para agendar una cita necesitas tener créditos disponibles.</p>
                <a href="comprar.html" class="btn-primary">Comprar Créditos</a>
            </div>
        `;
        return;
    }

    const creditosHTML = creditos.map(credito => `
        <div class="credito-item">
            <h4>${credito.servicio_nombre}</h4>
            <p>Créditos disponibles: <strong>${credito.cantidad_disponible}</strong></p>
            <p>Precio unitario: ${formatearPrecio(credito.precio_unitario)}</p>
        </div>
    `).join('');

    container.innerHTML = `
        <h3>Tus Créditos Disponibles</h3>
        <div class="creditos-grid">
            ${creditosHTML}
        </div>
    `;
}

// NUEVA FUNCIÓN: Mostrar mensaje sin créditos
function mostrarMensajeSinCreditos() {
    const mensaje = document.getElementById('mensaje-sin-creditos');
    if (mensaje) {
        mensaje.style.display = 'block';
    }
}

// NUEVA FUNCIÓN: Deshabilitar formulario
function deshabilitarFormulario() {
    const form = document.getElementById('agenda-form');
    if (form) {
        const inputs = form.querySelectorAll('input, select, button');
        inputs.forEach(input => {
            if (!input.onclick || !input.onclick.toString().includes('comprar')) {
                input.disabled = true;
            }
        });
    }
}

// NUEVA FUNCIÓN: Configurar validación de horarios
function configurarValidacionHorarios() {
    const fechaInput = document.getElementById('fecha');
    const horaSelect = document.getElementById('hora');
    const servicioSelect = document.getElementById('servicio');

    if (fechaInput) {
        // Establecer fecha mínima (mañana)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        fechaInput.min = tomorrow.toISOString().split('T')[0];
        
        fechaInput.addEventListener('change', async () => {
            await cargarHorariosDisponibles();
        });
    }

    if (servicioSelect) {
        servicioSelect.addEventListener('change', async () => {
            await cargarHorariosDisponibles();
        });
    }
}

// NUEVA FUNCIÓN: Cargar horarios disponibles
async function cargarHorariosDisponibles() {
    const fechaInput = document.getElementById('fecha');
    const servicioSelect = document.getElementById('servicio');
    const horaSelect = document.getElementById('hora');
    
    if (!fechaInput.value || !servicioSelect.value || !horaSelect) return;

    try {
        const response = await apiRequest(
            `${CONFIG.ENDPOINTS.HORARIOS_DISPONIBLES}?fecha=${fechaInput.value}&servicio_id=${servicioSelect.value}`
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
            option.textContent = hora;
            horaSelect.appendChild(option);
        });
        
        horaSelect.disabled = false;
        
    } catch (error) {
        console.error('Error cargando horarios:', error);
        horaSelect.innerHTML = '<option value="">Error cargando horarios</option>';
    }
}

// FUNCIÓN EXISTENTE MANTENIDA
function configurarEventos() {
    const form = document.getElementById("agenda-form");
    const btn = document.getElementById("agendar-btn");
    
    // MANTENER validación existente
    form.addEventListener("input", () => {
        const isFilled =
            form.servicio.value &&
            form.nombre?.value.trim() &&
            form.correo?.value.trim() &&
            form.telefono?.value.trim() &&
            form.fecha.value &&
            form.hora.value &&
            form.querySelector('input[name="modalidad"]:checked');

        if (isFilled) {
            btn.disabled = false;
            btn.classList.add("enabled");
        } else {
            btn.disabled = true;
            btn.classList.remove("enabled");
        }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await agendarCita();
    });
}

// FUNCIÓN EXISTENTE ACTUALIZADA para FastAPI
async function agendarCita() {
    const form = document.getElementById("agenda-form");
    const btn = document.getElementById("agendar-btn");
    
    // ACTUALIZADO: Preparar datos para FastAPI
    const datos = {
        servicio_id: parseInt(form.servicio.value),
        fecha: form.fecha.value,
        hora: form.hora.value + ':00', // Agregar segundos
        modalidad: form.querySelector('input[name="modalidad"]:checked').value,
        comentarios_cliente: form.comentarios ? form.comentarios.value : null
    };

    try {
        btn.disabled = true;
        btn.textContent = 'Agendando...';
        
        // ACTUALIZADO: Usar endpoint correcto de FastAPI
        const response = await apiRequest(CONFIG.ENDPOINTS.AGENDAR_CITA, {
            method: 'POST',
            body: JSON.stringify(datos)
        });
        
        mostrarMensaje('¡Cita agendada con éxito! Te enviaremos un correo de confirmación.', 'success');
        
        // NUEVO: Mostrar resumen de la cita
        mostrarResumenCita(response);
        
        form.reset();
        btn.disabled = true;
        btn.classList.remove("enabled");
        
        // Recargar créditos
        await cargarCreditosUsuario();
        
    } catch (error) {
        console.error('Error agendando cita:', error);
        mostrarMensaje(error.message || 'Error al agendar la cita. Por favor, intenta nuevamente.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Agendar';
    }
}

// NUEVA FUNCIÓN: Mostrar resumen de cita
function mostrarResumenCita(cita) {
    const resumen = `
        <div class="resumen-cita">
            <h3>✅ Cita Agendada Exitosamente</h3>
            <div class="detalle-cita">
                <p><strong>Fecha:</strong> ${formatearFecha(cita.fecha)}</p>
                <p><strong>Hora:</strong> ${cita.hora}</p>
                <p><strong>Modalidad:</strong> ${cita.modalidad}</p>
                <p><strong>Estado:</strong> ${cita.estado}</p>
            </div>
            <div class="acciones-cita">
                <a href="perfil-cliente.html" class="btn-primary">Ver Mis Citas</a>
            </div>
        </div>
    `;
    
    // Mostrar en modal o contenedor
    mostrarMensaje(resumen, 'success');
}

console.log('✅ Sistema de calendario de CreSer cargado');
