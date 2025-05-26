// ============ CONFIGURACIÓN Y VARIABLES GLOBALES ============
const precios = {
    'valoracion-individual': 100000,
    'evaluacion-sesion': 80000,
    'psicoterapia-individual': 70000,
    'pareja-valoracion': 120000,
    'pareja-regular': 100000,
    'talleres-grupales': 45000,
    'orientacion-familiar': 110000
};

const nombres = {
    'valoracion-individual': 'Valoración Psicológica Individual',
    'evaluacion-sesion': 'Evaluación y Diagnóstico',
    'psicoterapia-individual': 'Psicoterapia Individual',
    'pareja-valoracion': 'Psicoterapia de Pareja - Valoración',
    'pareja-regular': 'Psicoterapia de Pareja - Regular',
    'talleres-grupales': 'Talleres Grupales en Salud Mental',
    'orientacion-familiar': 'Orientación Familiar'
};

const servicioIdMap = {
    'valoracion-individual': 3,
    'evaluacion-sesion': 2,
    'psicoterapia-individual': 1,
    'pareja-valoracion': 4,
    'pareja-regular': 4,
    'talleres-grupales': 6,
    'orientacion-familiar': 2
};

let carritoMultiple = {};
let paqueteSeleccionado = null;
let tipoSeleccion = null;

// ============ INICIALIZACIÓN ============
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando sistema de compras reales...');
    inicializarSistemaCompras();
});

function inicializarSistemaCompras() {
    configurarEventosFormulario();
    preLlenarDatosUsuario();
    configurarSelectorIndividual();
    console.log('✅ Sistema de compras reales inicializado');
}

// ============ CONFIGURACIÓN DE EVENTOS ============
function configurarEventosFormulario() {
    const formPago = document.getElementById('form-pago-simbolico');
    if (formPago) {
        formPago.addEventListener('submit', procesarPagoReal);
    }
}

// ============ PROCESAMIENTO DE PAGO REAL ============
async function procesarPagoReal(event) {
    event.preventDefault();
    
    console.log('💳 Procesando pago real...');
    
    if (!paqueteSeleccionado) {
        mostrarMensaje('No hay ningún paquete seleccionado', 'error');
        return;
    }
    
    const formData = new FormData(event.target);
    const submitButton = event.target.querySelector('button[type="submit"]');
    
    // Validar formulario
    if (!validarFormulario(formData)) {
        return;
    }
    
    // Deshabilitar botón y mostrar loading
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando Pago...';
    
    try {
        // Paso 1: Crear/verificar usuario
        const usuario = await crearOVerificarUsuario(formData);
        console.log('✅ Usuario verificado/creado:', usuario);
        
        // Paso 2: Crear pago
        const pago = await crearPago(formData, usuario.id);
        console.log('✅ Pago creado:', pago);
        
        // Paso 3: Crear créditos
        const creditos = await crearCreditos(usuario.id, pago.id);
        console.log('✅ Créditos creados:', creditos);
        
        // Mostrar confirmación
        mostrarConfirmacionReal(pago, creditos, usuario);
        
    } catch (error) {
        console.error('❌ Error procesando pago:', error);
        mostrarMensaje(`Error: ${error.message}`, 'error');
    } finally {
        // Restaurar botón
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-credit-card"></i> Procesar Pago';
    }
}

// ============ GESTIÓN DE USUARIOS ============
async function crearOVerificarUsuario(formData) {
    const email = formData.get('email');
    
    try {
        // Intentar obtener usuario existente por email
        console.log('🔍 Verificando si el usuario existe...');
        
        // Buscar usuario por email (endpoint que necesitamos crear)
        const usuarioExistente = await buscarUsuarioPorEmail(email);
        
        if (usuarioExistente) {
            console.log('✅ Usuario existente encontrado');
            return usuarioExistente;
        }
        
    } catch (error) {
        console.log('ℹ️ Usuario no existe, creando nuevo...');
    }
    
    // Crear nuevo usuario
    const nuevoUsuario = await crearNuevoUsuario(formData);
    return nuevoUsuario;
}

async function buscarUsuarioPorEmail(email) {
    try {
        // Este endpoint necesita ser creado en el backend
        const response = await apiRequest(`/usuarios/buscar-por-email?email=${encodeURIComponent(email)}`);
        return response;
    } catch (error) {
        if (error.message.includes('404')) {
            return null; // Usuario no encontrado
        }
        throw error;
    }
}

async function crearNuevoUsuario(formData) {
    const userData = {
        nombre: formData.get('nombre'),
        email: formData.get('email'),
        telefono: formData.get('telefono'),
        documento: formData.get('documento'),
        password: generarPasswordTemporal(),
        tipo: 'cliente',
        estado: 'activo'
    };
    
    console.log('📤 Creando nuevo usuario:', userData);
    
    const response = await apiRequest('/usuarios/', {
        method: 'POST',
        body: JSON.stringify(userData)
    });
    
    return response;
}

function generarPasswordTemporal() {
    // Generar password temporal de 8 caracteres
    return Math.random().toString(36).slice(-8);
}

// ============ GESTIÓN DE PAGOS ============
async function crearPago(formData, usuarioId) {
    const pagoData = {
        usuario_id: usuarioId,
        nombre_pagador: formData.get('nombre'),
        email_pagador: formData.get('email'),
        telefono_pagador: formData.get('telefono'),
        documento_pagador: formData.get('documento'),
        monto: paqueteSeleccionado.precio,
        concepto: generarConcepto(),
        metodo_pago: 'qr', // Por defecto QR
        tipo_compra: paqueteSeleccionado.tipo === 'paquete' ? 'paquete' : 'servicio_individual'
    };
    
    console.log('📤 Creando pago:', pagoData);
    
    const response = await apiRequest('/pagos/', {
        method: 'POST',
        body: JSON.stringify(pagoData)
    });
    
    return response;
}

// ============ GESTIÓN DE CRÉDITOS ============
async function crearCreditos(usuarioId, pagoId) {
    const creditosACrear = calcularCreditosACrear();
    const creditosCreados = [];
    
    console.log('💳 Creando créditos para usuario:', usuarioId);
    
    for (const credito of creditosACrear) {
        try {
            const creditoData = {
                usuario_id: usuarioId,
                servicio_id: credito.servicio_id,
                cantidad_inicial: credito.cantidad,
                cantidad_disponible: credito.cantidad,
                precio_unitario: credito.precio_unitario,
                pago_id: pagoId,
                estado: 'activo'
            };
            
            console.log('📤 Creando crédito:', creditoData);
            
            const creditoCreado = await apiRequest('/creditos/', {
                method: 'POST',
                body: JSON.stringify(creditoData)
            });
            
            creditosCreados.push(creditoCreado);
            
        } catch (error) {
            console.error('❌ Error creando crédito:', error);
            // Continuar con los otros créditos
        }
    }
    
    return creditosCreados;
}

function calcularCreditosACrear() {
    let creditos = [];
    
    if (paqueteSeleccionado.tipo === 'individual') {
        creditos.push({
            servicio_id: servicioIdMap[paqueteSeleccionado.servicio],
            cantidad: 1,
            precio_unitario: paqueteSeleccionado.precio,
            nombre: paqueteSeleccionado.nombre
        });
    } else if (paqueteSeleccionado.tipo === 'multiple') {
        paqueteSeleccionado.servicios.forEach(servicio => {
            creditos.push({
                servicio_id: servicioIdMap[servicio.servicio],
                cantidad: servicio.cantidad,
                precio_unitario: servicio.precio,
                nombre: servicio.nombre
            });
        });
    } else if (paqueteSeleccionado.tipo === 'paquete') {
        // Para paquetes especiales, crear créditos según el tipo
        if (paqueteSeleccionado.id === 'psicoterapia-4') {
            creditos.push({
                servicio_id: servicioIdMap['psicoterapia-individual'],
                cantidad: 4,
                precio_unitario: paqueteSeleccionado.precio / 4,
                nombre: 'Psicoterapia Individual'
            });
        } else if (paqueteSeleccionado.id === 'psicoterapia-8') {
            creditos.push({
                servicio_id: servicioIdMap['psicoterapia-individual'],
                cantidad: 8,
                precio_unitario: paqueteSeleccionado.precio / 8,
                nombre: 'Psicoterapia Individual'
            });
        } else if (paqueteSeleccionado.id === 'evaluacion-completa') {
            creditos.push({
                servicio_id: servicioIdMap['evaluacion-sesion'],
                cantidad: 5,
                precio_unitario: paqueteSeleccionado.precio / 5,
                nombre: 'Evaluación y Diagnóstico'
            });
        }
    }
    
    return creditos;
}

// ============ CONFIRMACIÓN REAL ============
function mostrarConfirmacionReal(pago, creditos, usuario) {
    // Ocultar sección de pago
    const seccionPago = document.getElementById('seccion-pago');
    if (seccionPago) seccionPago.style.display = 'none';
    
    // Mostrar sección de confirmación
    const confirmacion = document.getElementById('confirmacion');
    if (confirmacion) {
        confirmacion.style.display = 'block';
        
        // Actualizar contenido de confirmación
        const successIcon = confirmacion.querySelector('.success-icon');
        const titulo = confirmacion.querySelector('h2');
        const descripcion = confirmacion.querySelector('p');
        
        if (successIcon) successIcon.textContent = '✅';
        if (titulo) titulo.textContent = '¡Compra Exitosa!';
        if (descripcion) descripcion.textContent = 'Tus créditos han sido añadidos a tu cuenta';
        
        // Llenar lista de créditos reales
        const listaCreditosFinales = document.getElementById('lista-creditos-finales');
        if (listaCreditosFinales && creditos) {
            let creditosHTML = '';
            creditos.forEach(credito => {
                creditosHTML += `
                    <div class="credito-final">
                        <span class="credito-nombre">${credito.servicio_nombre || 'Servicio'}</span>
                        <span class="credito-cantidad">${credito.cantidad_disponible} crédito${credito.cantidad_disponible > 1 ? 's' : ''}</span>
                    </div>
                `;
            });
            listaCreditosFinales.innerHTML = creditosHTML;
        }
        
        // Actualizar información de cuenta
        const infoCuenta = confirmacion.querySelector('.info-cuenta');
        if (infoCuenta) {
            infoCuenta.innerHTML = `
                <h3>Información de tu Cuenta:</h3>
                <p>📧 <strong>Email:</strong> ${usuario.email}</p>
                <p>🔑 <strong>ID de Pago:</strong> #${pago.id}</p>
                <p>💰 <strong>Monto Pagado:</strong> ${formatearPrecio(pago.monto)}</p>
                <p>📅 Tus créditos están listos para usar</p>
                <p>🎯 Puedes agendar tus citas cuando lo necesites</p>
            `;
        }
        
        confirmacion.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Limpiar selecciones
    limpiarSelecciones();
    
    // Mostrar mensaje de éxito
    mostrarMensaje('¡Pago procesado exitosamente! Créditos añadidos a tu cuenta.', 'success');
}

// ============ RESTO DE FUNCIONES (mantener las existentes) ============

function configurarSelectorIndividual() {
    const servicioIndividualSelect = document.getElementById('servicio-individual');
    if (servicioIndividualSelect) {
        servicioIndividualSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const precio = selectedOption.getAttribute('data-precio');
            const btnIndividual = document.getElementById('btn-individual');
            
            if (precio) {
                document.getElementById('precio-individual').textContent = formatearPrecio(parseInt(precio));
                btnIndividual.disabled = false;
            } else {
                document.getElementById('precio-individual').textContent = 'Selecciona un servicio';
                btnIndividual.disabled = true;
            }
        });
    }
}

function preLlenarDatosUsuario() {
    try {
        if (typeof auth !== 'undefined' && auth && auth.isAuthenticated()) {
            const user = auth.getUser();
            const nombreInput = document.getElementById('nombre-completo');
            const emailInput = document.getElementById('email');
            const telefonoInput = document.getElementById('telefono');
            const documentoInput = document.getElementById('documento');
            
            if (nombreInput && user.nombre) nombreInput.value = user.nombre;
            if (emailInput && user.email) emailInput.value = user.email;
            if (telefonoInput && user.telefono) telefonoInput.value = user.telefono;
            if (documentoInput && user.documento) documentoInput.value = user.documento;
            
            console.log('✅ Datos de usuario pre-llenados');
        }
    } catch (error) {
        console.warn('⚠️ No se pudieron pre-llenar los datos del usuario:', error);
    }
}

function seleccionarPaquete(tipo) {
    console.log('📦 Seleccionando paquete:', tipo);
    
    limpiarSelecciones();
    tipoSeleccion = tipo;
    
    switch (tipo) {
        case 'individual':
            seleccionarIndividual();
            break;
        case 'multiple':
            seleccionarMultiple();
            break;
        case 'evaluacion-completa':
        case 'psicoterapia-4':
        case 'psicoterapia-8':
            seleccionarPaqueteEspecial(tipo);
            break;
    }
    
    actualizarResumenCompra();
    mostrarSeccionPago();
}

function seleccionarIndividual() {
    const servicioSelect = document.getElementById('servicio-individual');
    const selectedOption = servicioSelect.options[servicioSelect.selectedIndex];
    
    if (!selectedOption.value) {
        mostrarMensaje('Por favor selecciona un servicio', 'warning');
        return;
    }
    
    const precio = parseInt(selectedOption.getAttribute('data-precio'));
    const servicio = selectedOption.value;
    
    paqueteSeleccionado = {
        tipo: 'individual',
        servicio: servicio,
        nombre: nombres[servicio],
        precio: precio,
        cantidad: 1
    };
    
    mostrarMensaje(`Servicio "${nombres[servicio]}" seleccionado`, 'success');
}

function seleccionarMultiple() {
    if (Object.keys(carritoMultiple).length === 0) {
        mostrarMensaje('Por favor selecciona al menos un servicio', 'warning');
        return;
    }
    
    let total = 0;
    let servicios = [];
    
    Object.keys(carritoMultiple).forEach(servicio => {
        const cantidad = carritoMultiple[servicio];
        const precio = precios[servicio];
        total += cantidad * precio;
        servicios.push({
            servicio: servicio,
            nombre: nombres[servicio],
            cantidad: cantidad,
            precio: precio
        });
    });
    
    paqueteSeleccionado = {
        tipo: 'multiple',
        servicios: servicios,
        precio: total,
        nombre: 'Paquete Múltiple Personalizado'
    };
    
    mostrarMensaje('Paquete múltiple seleccionado', 'success');
}

function seleccionarPaqueteEspecial(tipoPaquete) {
    const paquetesEspeciales = {
        'evaluacion-completa': {
            nombre: 'Paquete Evaluación Completa',
            precio: 370000,
            servicios: [{ servicio: 'evaluacion-sesion', cantidad: 5 }]
        },
        'psicoterapia-4': {
            nombre: 'Paquete Psicoterapia 4 Sesiones',
            precio: 260000,
            servicios: [{ servicio: 'psicoterapia-individual', cantidad: 4 }]
        },
        'psicoterapia-8': {
            nombre: 'Paquete Psicoterapia 8 Sesiones',
            precio: 500000,
            servicios: [{ servicio: 'psicoterapia-individual', cantidad: 8 }]
        }
    };
    
    const paquete = paquetesEspeciales[tipoPaquete];
    
    paqueteSeleccionado = {
        tipo: 'paquete',
        id: tipoPaquete,
        nombre: paquete.nombre,
        precio: paquete.precio,
        servicios: paquete.servicios
    };
    
    mostrarMensaje(`${paquete.nombre} seleccionado`, 'success');
}

function cambiarCantidad(servicio, cambio) {
    const cantidadElement = document.getElementById(`qty-${servicio}`);
    let cantidad = parseInt(cantidadElement.textContent) + cambio;
    
    if (cantidad < 0) cantidad = 0;
    if (cantidad > 20) cantidad = 20;
    
    cantidadElement.textContent = cantidad;
    
    if (cantidad > 0) {
        carritoMultiple[servicio] = cantidad;
    } else {
        delete carritoMultiple[servicio];
    }
    
    actualizarPrecioMultiple();
}

function actualizarPrecioMultiple() {
    let total = 0;
    let totalCreditos = 0;
    
    Object.keys(carritoMultiple).forEach(servicio => {
        const cantidad = carritoMultiple[servicio];
        const precio = precios[servicio];
        total += cantidad * precio;
        totalCreditos += cantidad;
    });
    
    document.getElementById('precio-multiple').textContent = formatearPrecio(total);
    document.getElementById('creditos-total').textContent = `${totalCreditos} créditos`;
    
    const btnMultiple = document.getElementById('btn-multiple');
    if (btnMultiple) {
        btnMultiple.disabled = totalCreditos === 0;
    }
}

function actualizarResumenCompra() {
    const resumenServicios = document.getElementById('resumen-servicios');
    const subtotalFinal = document.getElementById('subtotal-final');
    const totalPagar = document.getElementById('total-pagar');
    
    if (!paqueteSeleccionado) return;
    
    let resumenHTML = '';
    let total = paqueteSeleccionado.precio;
    
    if (paqueteSeleccionado.tipo === 'individual') {
        resumenHTML = `
            <div class="item-resumen">
                <span>${paqueteSeleccionado.nombre}</span>
                <span>${formatearPrecio(paqueteSeleccionado.precio)}</span>
            </div>
        `;
    } else if (paqueteSeleccionado.tipo === 'multiple') {
        paqueteSeleccionado.servicios.forEach(servicio => {
            const subtotal = servicio.cantidad * servicio.precio;
            resumenHTML += `
                <div class="item-resumen">
                    <span>${servicio.nombre} (${servicio.cantidad})</span>
                    <span>${formatearPrecio(subtotal)}</span>
                </div>
            `;
        });
    } else if (paqueteSeleccionado.tipo === 'paquete') {
        resumenHTML = `
            <div class="item-resumen">
                <span>${paqueteSeleccionado.nombre}</span>
                <span>${formatearPrecio(paqueteSeleccionado.precio)}</span>
            </div>
        `;
    }
    
    if (resumenServicios) resumenServicios.innerHTML = resumenHTML;
    if (subtotalFinal) subtotalFinal.textContent = formatearPrecio(total);
    if (totalPagar) totalPagar.textContent = formatearPrecio(total);
}

function mostrarSeccionPago() {
    const seccionPago = document.getElementById('seccion-pago');
    if (seccionPago) {
        seccionPago.style.display = 'block';
        seccionPago.scrollIntoView({ behavior: 'smooth' });
    }
}

function limpiarSelecciones() {
    carritoMultiple = {};
    paqueteSeleccionado = null;
    tipoSeleccion = null;
    
    Object.keys(precios).forEach(servicio => {
        const qtyElement = document.getElementById(`qty-${servicio}`);
        if (qtyElement) qtyElement.textContent = '0';
    });
    
    actualizarPrecioMultiple();
}

function cancelarCompra() {
    if (confirm('¿Estás seguro de que quieres cancelar la compra?')) {
        limpiarSelecciones();
        
        const seccionPago = document.getElementById('seccion-pago');
        if (seccionPago) seccionPago.style.display = 'none';
        
        mostrarMensaje('Compra cancelada', 'info');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function validarFormulario(formData) {
    const nombre = formData.get('nombre');
    const email = formData.get('email');
    const telefono = formData.get('telefono');
    const documento = formData.get('documento');
    
    if (!nombre || nombre.trim().length < 2) {
        mostrarMensaje('El nombre debe tener al menos 2 caracteres', 'error');
        return false;
    }
    
    if (!email || !validarEmail(email)) {
        mostrarMensaje('Por favor ingresa un email válido', 'error');
        return false;
    }
    
    if (!telefono || telefono.trim().length < 10) {
        mostrarMensaje('El teléfono debe tener al menos 10 dígitos', 'error');
        return false;
    }
    
    if (!documento || documento.trim().length < 6) {
        mostrarMensaje('El documento debe tener al menos 6 caracteres', 'error');
        return false;
    }
    
    if (!document.getElementById('acepto-terminos').checked) {
        mostrarMensaje('Debes aceptar los términos y condiciones', 'error');
        return false;
    }
    
    return true;
}

function validarEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function nuevaCompra() {
    const confirmacion = document.getElementById('confirmacion');
    if (confirmacion) confirmacion.style.display = 'none';
    
    const form = document.getElementById('form-pago-simbolico');
    if (form) form.reset();
    
    preLlenarDatosUsuario();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mostrarMensaje('¡Listo para una nueva compra!', 'info');
}

function generarConcepto() {
    if (paqueteSeleccionado.tipo === 'individual') {
        return `${paqueteSeleccionado.nombre} - Compra Individual`;
    } else if (paqueteSeleccionado.tipo === 'multiple') {
        return `Paquete Múltiple - ${paqueteSeleccionado.servicios.length} servicios`;
    } else if (paqueteSeleccionado.tipo === 'paquete') {
        return paqueteSeleccionado.nombre;
    }
    return 'Compra de Créditos CreSer';
}

function formatearPrecio(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount);
}

function mostrarMensaje(mensaje, tipo = 'info', duracion = 5000) {
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

    if (duracion > 0) {
        setTimeout(() => {
            if (mensajeElement.parentNode) {
                mensajeElement.remove();
            }
        }, duracion);
    }
}

console.log('✅ Sistema de compras reales de CreSer cargado');
