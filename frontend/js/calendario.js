document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("agenda-form");
    const btn = document.getElementById("agendar-btn");
    
    // Verificar autenticación
    if (!authManager.requireAuth()) {
        return;
    }
    
    cargarCreditosUsuario();
    configurarEventos();
});

async function cargarCreditosUsuario() {
    try {
        const response = await apiRequest(`${CONFIG.ENDPOINTS.USUARIOS}/creditos`);
        const creditos = response.creditos || [];
        
        // Actualizar selector de servicios con créditos disponibles
        actualizarSelectorServicios(creditos);
        
    } catch (error) {
        console.error('Error cargando créditos:', error);
        mostrarMensaje('Error al cargar tus créditos disponibles', 'error');
    }
}

function actualizarSelectorServicios(creditos) {
    const selector = document.getElementById('servicio');
    
    // Limpiar opciones existentes
    selector.innerHTML = '<option value="">Escoge tu servicio</option>';
    
    creditos.forEach(credito => {
        if (credito.cantidad > 0) {
            const option = document.createElement('option');
            option.value = credito.servicio;
            option.textContent = `${credito.nombre} (${credito.cantidad} créditos disponibles)`;
            selector.appendChild(option);
        }
    });
    
    if (creditos.length === 0 || creditos.every(c => c.cantidad === 0)) {
        const option = document.createElement('option');
        option.textContent = 'No tienes créditos disponibles - Compra créditos primero';
        option.disabled = true;
        selector.appendChild(option);
    }
}

function configurarEventos() {
    const form = document.getElementById("agenda-form");
    const btn = document.getElementById("agendar-btn");
    
    form.addEventListener("input", () => {
        const isFilled =
            form.servicio.value &&
            form.nombre.value.trim() &&
            form.correo.value.trim() &&
            form.telefono.value.trim() &&
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

async function agendarCita() {
    const form = document.getElementById("agenda-form");
    const btn = document.getElementById("agendar-btn");
    
    const datos = {
        servicio: form.servicio.value,
        nombre: form.nombre.value,
        email: form.correo.value,
        telefono: form.telefono.value,
        fecha: form.fecha.value,
        hora: form.hora.value,
        modalidad: form.querySelector('input[name="modalidad"]:checked').value,
        comentarios: form.comentarios ? form.comentarios.value : ''
    };
    
    try {
        btn.disabled = true;
        btn.textContent = 'Agendando...';
        
        const response = await apiRequest(CONFIG.ENDPOINTS.AGENDAR_CITA, {
            method: 'POST',
            body: JSON.stringify(datos)
        });
        
        mostrarMensaje('¡Cita agendada con éxito! Te enviaremos un correo de confirmación.', 'success');
        
        form.reset();
        btn.disabled = true;
        btn.classList.remove("enabled");
        
        // Recargar créditos
        await cargarCreditosUsuario();
        
    } catch (error) {
        console.error('Error agendando cita:', error);
        mostrarMensaje('Error al agendar la cita. Por favor, intenta nuevamente.', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Agendar';
    }
}
