// Variables globales
let editandoInfo = false;
let datosOriginales = {};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    if (!authManager.requireAuth()) {
        return;
    }
    
    cargarDatosUsuario();
    configurarEventos();
    cargarCreditos();
    cargarCitas();
    cargarHistorialPagos();
    configurarNotificaciones();
});

async function cargarDatosUsuario() {
    try {
        const response = await apiRequest(CONFIG.ENDPOINTS.PERFIL);
        const usuario = response.usuario;
        
        // Llenar formulario con datos
        document.getElementById('nombre').value = usuario.nombre || '';
        document.getElementById('email').value = usuario.email || '';
        document.getElementById('telefono').value = usuario.telefono || '';
        document.getElementById('documento').value = usuario.documento || '';
        document.getElementById('fecha-nacimiento').value = usuario.fechaNacimiento ? usuario.fechaNacimiento.split('T')[0] : '';
        document.getElementById('genero').value = usuario.genero || '';
        document.getElementById('direccion').value = usuario.direccion || '';
        
        // Actualizar sidebar
        document.getElementById('nombre-usuario').textContent = usuario.nombre;
        document.getElementById('email-usuario').textContent = usuario.email;
        
        // Configuración de notificaciones
        if (usuario.configuracion) {
            document.getElementById('notif-email').checked = usuario.configuracion.notificaciones_email;
            document.getElementById('notif-sms').checked = usuario.configuracion.notificaciones_sms;
            document.getElementById('notif-recordatorios').checked = usuario.configuracion.recordatorios_citas;
        }
        
        // Guardar datos originales
        datosOriginales = { ...usuario };
        
    } catch (error) {
        console.error('Error cargando datos del usuario:', error);
        mostrarMensaje('Error al cargar tus datos', 'error');
    }
}

async function cargarCreditos() {
    try {
        const response = await apiRequest(`${CONFIG.ENDPOINTS.USUARIOS}/creditos`);
        const creditos = response.creditos || [];
        
        const container = document.querySelector('.creditos-grid');
        container.innerHTML = '';
        
        if (creditos.length === 0) {
            container.innerHTML = '<p>No tienes créditos disponibles. <a href="comprar.html">Compra créditos aquí</a></p>';
            return;
        }
        
        creditos.forEach(credito => {
            const creditoCard = document.createElement('div');
            creditoCard.className = credito.cantidad > 0 ? 'credito-card' : 'credito-card sin-creditos';
            
            creditoCard.innerHTML = `
                <div class="credito-header">
                    <h3>${credito.nombre}</h3>
                    <span class="creditos-disponibles">${credito.cantidad} créditos</span>
                </div>
                <p>Válido para sesiones de ${credito.duracion || '60'} minutos</p>
                ${credito.cantidad > 0 
                    ? `<button class="btn-usar-credito" onclick="agendarCita('${credito.servicio}')">Agendar Cita</button>`
                    : `<a href="comprar.html" class="btn-comprar">Comprar Créditos</a>`
                }
            `;
            
            container.appendChild(creditoCard);
        });
        
    } catch (error) {
        console.error('Error cargando créditos:', error);
        mostrarMensaje('Error al cargar tus créditos', 'error');
    }
}

async function cargarCitas() {
    try {
        const response = await apiRequest(CONFIG.ENDPOINTS.CITAS);
        const citas = response.citas || [];
        
        mostrarCitasPorEstado(citas);
        
    } catch (error) {
        console.error('Error cargando citas:', error);
        mostrarMensaje('Error al cargar tus citas', 'error');
    }
}

function mostrarCitasPorEstado(citas) {
    const ahora = new Date();
    
    const citasProximas = citas.filter(cita => new Date(cita.fecha) >= ahora && cita.estado !== 'cancelada');
    const citasPasadas = citas.filter(cita => new Date(cita.fecha) < ahora || cita.estado === 'completada');
    const citasCanceladas = citas.filter(cita => cita.estado === 'cancelada');
    
    // Mostrar citas próximas por defecto
    mostrarCitas(citasProximas, 'proximas');
}

function mostrarCitas(citas, tipo) {
    const container = document.querySelector('.citas-lista');
    container.innerHTML = '';
    
    if (citas.length === 0) {
        container.innerHTML = '<p>No tienes citas en esta categoría.</p>';
        return;
    }
    
    citas.forEach(cita => {
        const citaCard = document.createElement('div');
        citaCard.className = `cita-card ${tipo}`;
        
        const fecha = new Date(cita.fecha);
        const dia = fecha.getDate();
        const mes = fecha.toLocaleDateString('es-ES', { month: 'short' });
        
        citaCard.innerHTML = `
            <div class="cita-fecha">
                <span class="dia">${dia}</span>
                <span class="mes">${mes}</span>
            </div>
            <div class="cita-info">
                <h4>${cita.servicio_nombre || cita.servicio}</h4>
                <p><strong>Fecha:</strong> ${formatearFecha(cita.fecha)}</p>
                <p><strong>Hora:</strong> ${cita.hora}</p>
                <p><strong>Modalidad:</strong> ${cita.modalidad}</p>
                <p><strong>Psicóloga:</strong> Diana Milena Rodríguez</p>
                <p><strong>Estado:</strong> <span class="estado ${cita.estado}">${cita.estado}</span></p>
            </div>
            <div class="cita-acciones">
                ${tipo === 'proximas' ? `
                    <button class="btn-reprogramar" onclick="reprogramarCita(${cita.id})">Reprogramar</button>
                    <button class="btn-cancelar-cita" onclick="cancelarCita(${cita.id})">Cancelar</button>
                ` : tipo === 'pasadas' ? `
                    <button class="btn-descargar" onclick="descargarComprobante(${cita.id})">Descargar Comprobante</button>
                ` : ''}
            </div>
        `;
        
        container.appendChild(citaCard);
    });
}

function filtrarCitas(tipo) {
    // Actualizar tabs activos
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Recargar citas para mostrar el tipo seleccionado
    cargarCitas().then(() => {
        // Aquí podrías filtrar específicamente por tipo si es necesario
    });
}

async function cancelarCita(citaId) {
    if (!confirm('¿Estás seguro de que quieres cancelar esta cita?')) return;
    
    try {
        await apiRequest(`${CONFIG.ENDPOINTS.CANCELAR_CITA}/${citaId}`, {
            method: 'PUT',
            body: JSON.stringify({ estado: 'cancelada' })
        });
        
        mostrarMensaje('Cita cancelada exitosamente', 'success');
        await cargarCitas();
        await cargarCreditos(); // Recargar créditos ya que se devuelve el crédito
        
    } catch (error) {
        console.error('Error cancelando cita:', error);
        mostrarMensaje('Error al cancelar la cita', 'error');
    }
}

async function cargarHistorialPagos() {
    try {
        const response = await apiRequest(CONFIG.ENDPOINTS.PAGOS);
        const pagos = response.pagos || [];
        
        const tbody = document.querySelector('.pagos-tabla tbody');
        tbody.innerHTML = '';
        
        pagos.forEach(pago => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatearFecha(pago.createdAt)}</td>
                <td>${pago.concepto}</td>
                <td>${pago.metodo_pago.toUpperCase()}</td>
                <td>${formatearPrecio(pago.monto)}</td>
                <td><span class="estado ${pago.estado}">${pago.estado}</span></td>
                <td><button class="btn-ver-detalle" onclick="verDetallePago(${pago.id})">Ver Detalle</button></td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error cargando historial de pagos:', error);
        mostrarMensaje('Error al cargar el historial de pagos', 'error');
    }
}

function configurarEventos() {
    // Formulario de información personal
    const formInfo = document.getElementById('form-info-personal');
    if (formInfo) {
        formInfo.addEventListener('submit', guardarInformacion);
    }
    
    // Formulario de cambio de contraseña
    const formPassword = document.getElementById('form-cambiar-password');
    if (formPassword) {
        formPassword.addEventListener('submit', cambiarPassword);
    }
    
    // Navegación del perfil
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (href && href.includes('mostrarSeccion')) {
                const seccion = href.match(/'([^']+)'/)[1];
                mostrarSeccion(seccion);
            }
        });
    });
    
    // Avatar
    const inputAvatar = document.getElementById('input-avatar');
    if (inputAvatar) {
        inputAvatar.addEventListener('change', cambiarAvatar);
    }
}

function habilitarEdicion() {
    editandoInfo = true;
    
    // Habilitar campos
    document.querySelectorAll('#form-info-personal input, #form-info-personal select').forEach(field => {
        if (field.id !== 'email' && field.id !== 'documento') { // Email y documento no se pueden cambiar
            field.removeAttribute('readonly');
            field.removeAttribute('disabled');
        }
    });
    
    // Mostrar botones de acción
    document.getElementById('form-actions').style.display = 'flex';
    
    // Cambiar texto del botón
    document.querySelector('.btn-editar').textContent = 'Editando...';
    document.querySelector('.btn-editar').disabled = true;
}

async function guardarInformacion(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const datos = {
        nombre: formData.get('nombre'),
        telefono: formData.get('telefono'),
        fechaNacimiento: formData.get('fecha-nacimiento'),
        genero: formData.get('genero'),
        direccion: formData.get('direccion')
    };
    
    try {
        await apiRequest(CONFIG.ENDPOINTS.PERFIL, {
            method: 'PUT',
            body: JSON.stringify(datos)
        });
        
        mostrarMensaje('Información actualizada exitosamente', 'success');
        cancelarEdicion();
        await cargarDatosUsuario();
        
    } catch (error) {
        console.error('Error actualizando información:', error);
        mostrarMensaje('Error al actualizar la información', 'error');
    }
}

function cancelarEdicion() {
    editandoInfo = false;
    
    // Deshabilitar campos
    document.querySelectorAll('#form-info-personal input, #form-info-personal select').forEach(field => {
        field.setAttribute('readonly', true);
        if (field.tagName === 'SELECT') {
            field.setAttribute('disabled', true);
        }
    });
    
    // Ocultar botones de acción
    document.getElementById('form-actions').style.display = 'none';
    
    // Restaurar botón editar
    document.querySelector('.btn-editar').textContent = 'Editar';
    document.querySelector('.btn-editar').disabled = false;
    
    // Restaurar datos originales
    cargarDatosUsuario();
}

async function cambiarPassword(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
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
    
    try {
        await apiRequest(`${CONFIG.ENDPOINTS.USUARIOS}/cambiar-password`, {
            method: 'PUT',
            body: JSON.stringify({
                passwordActual,
                passwordNueva
            })
        });
        
        mostrarMensaje('Contraseña cambiada exitosamente', 'success');
        e.target.reset();
        
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        mostrarMensaje('Error al cambiar la contraseña. Verifica tu contraseña actual.', 'error');
    }
}

function configurarNotificaciones() {
    const checkboxes = ['notif-email', 'notif-sms', 'notif-recordatorios'];
    
    checkboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', async function() {
                try {
                    const configuracion = {
                        notificaciones_email: document.getElementById('notif-email').checked,
                        notificaciones_sms: document.getElementById('notif-sms').checked,
                        recordatorios_citas: document.getElementById('notif-recordatorios').checked
                    };
                    
                    await apiRequest(`${CONFIG.ENDPOINTS.USUARIOS}/configuracion`, {
                        method: 'PUT',
                        body: JSON.stringify({ configuracion })
                    });
                    
                    mostrarMensaje('Configuración actualizada', 'success');
                    
                } catch (error) {
                    console.error('Error actualizando configuración:', error);
                    mostrarMensaje('Error al actualizar la configuración', 'error');
                    // Revertir el cambio
                    this.checked = !this.checked;
                }
            });
        }
    });
}

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
    
    // Encontrar y activar el nav-item correspondiente
    const navItem = document.querySelector(`[onclick*="${seccionId}"]`);
    if (navItem) {
        navItem.classList.add('active');
    }
}

function agendarCita(servicio) {
    window.location.href = `agendar-cita.html?servicio=${servicio}`;
}

function reprogramarCita(citaId) {
    mostrarMensaje('Funcionalidad de reprogramación en desarrollo', 'info');
}

function descargarComprobante(citaId) {
    window.open(`${CONFIG.API_BASE_URL}/citas/${citaId}/comprobante`, '_blank');
}

function verDetallePago(pagoId) {
    mostrarMensaje('Funcionalidad de detalle de pago en desarrollo', 'info');
}

async function cambiarAvatar() {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        validarArchivo(file);
        
        const formData = new FormData();
        formData.append('avatar', file);
        
        const response = await uploadFile(`${CONFIG.ENDPOINTS.USUARIOS}/avatar`, formData);
        
        // Actualizar imagen del avatar
        document.getElementById('avatar-usuario').src = response.avatarUrl;
        
        mostrarMensaje('Avatar actualizado exitosamente', 'success');
        
    } catch (error) {
        console.error('Error actualizando avatar:', error);
        mostrarMensaje('Error al actualizar el avatar', 'error');
    }
}

async function confirmarEliminacion() {
    if (!confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) {
        return;
    }
    
    if (!confirm('Se eliminarán todos tus datos permanentemente. ¿Continuar?')) {
        return;
    }
    
    try {
        await apiRequest(`${CONFIG.ENDPOINTS.USUARIOS}/eliminar`, {
            method: 'DELETE'
        });
        
        mostrarMensaje('Cuenta eliminada exitosamente', 'success');
        
        // Cerrar sesión y redirigir
        setTimeout(() => {
            authManager.logout();
        }, 2000);
        
    } catch (error) {
        console.error('Error eliminando cuenta:', error);
        mostrarMensaje('Error al eliminar la cuenta', 'error');
    }
}
