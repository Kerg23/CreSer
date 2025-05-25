// MANTENER todas las variables y funciones existentes
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

let carritoMultiple = {};
let paqueteSeleccionado = null;

// NUEVA FUNCIÓN: Inicialización para FastAPI
document.addEventListener('DOMContentLoaded', function() {
    inicializarSistemaCompras();
    cargarInformacionQR();
    mostrarPaquetesEspeciales();
});

// NUEVA FUNCIÓN: Cargar información de QR
async function cargarInformacionQR() {
    try {
        const response = await apiRequest(CONFIG.ENDPOINTS.INFO_QR);
        mostrarInformacionQR(response);
    } catch (error) {
        console.error('Error cargando información QR:', error);
        // Mostrar información por defecto
        mostrarInformacionQRPorDefecto();
    }
}

// NUEVA FUNCIÓN: Mostrar información QR
function mostrarInformacionQR(info) {
    const container = document.getElementById('info-qr');
    if (!container) return;

    container.innerHTML = `
        <div class="qr-info">
            <h3>💳 Información de Pago</h3>
            <div class="banco-info">
                <p><strong>Banco:</strong> ${info.banco}</p>
                <p><strong>Titular:</strong> ${info.titular}</p>
                <p><strong>Tipo de cuenta:</strong> ${info.tipo_cuenta}</p>
                <p><strong>Número:</strong> ${info.numero_cuenta}</p>
            </div>
            <div class="instrucciones">
                <h4>📋 Instrucciones:</h4>
                <ol>
                    ${info.instrucciones.map(inst => `<li>${inst}</li>`).join('')}
                </ol>
            </div>
        </div>
    `;
}

// NUEVA FUNCIÓN: Información QR por defecto
function mostrarInformacionQRPorDefecto() {
    const container = document.getElementById('info-qr');
    if (!container) return;

    container.innerHTML = `
        <div class="qr-info">
            <h3>💳 Información de Pago</h3>
            <div class="banco-info">
                <p><strong>Banco:</strong> Bancolombia</p>
                <p><strong>Titular:</strong> Diana Milena Rodríguez</p>
                <p><strong>Tipo de cuenta:</strong> Ahorros</p>
                <p><strong>Número:</strong> 123-456-789</p>
            </div>
            <div class="instrucciones">
                <h4>📋 Instrucciones:</h4>
                <ol>
                    <li>Realiza la transferencia por el valor total</li>
                    <li>Toma una foto del comprobante</li>
                    <li>Sube el comprobante en este formulario</li>
                    <li>Espera la confirmación por email</li>
                </ol>
            </div>
        </div>
    `;
}

// NUEVA FUNCIÓN: Mostrar paquetes especiales
function mostrarPaquetesEspeciales() {
    const container = document.getElementById('paquetes-container');
    if (!container) return;

    const paquetes = [
        {
            id: 'evaluacion_completa',
            nombre: 'Evaluación Completa',
            precio: 350000,
            descripcion: 'Proceso completo de evaluación y diagnóstico',
            incluye: ['1 Valoración Individual', '4 Sesiones de Evaluación'],
            ahorro: 20000,
            popular: true
        },
        {
            id: 'psicoterapia_4',
            nombre: 'Psicoterapia 4 Sesiones',
            precio: 260000,
            descripcion: 'Paquete de 4 sesiones de psicoterapia individual',
            incluye: ['4 Sesiones de Psicoterapia Individual'],
            ahorro: 20000
        },
        {
            id: 'psicoterapia_8',
            nombre: 'Psicoterapia 8 Sesiones',
            precio: 500000,
            descripcion: 'Paquete de 8 sesiones de psicoterapia individual',
            incluye: ['8 Sesiones de Psicoterapia Individual'],
            ahorro: 60000
        }
    ];

    const paquetesHTML = paquetes.map(paquete => `
        <div class="paquete-card ${paquete.popular ? 'popular' : ''}">
            ${paquete.popular ? '<div class="badge-popular">Más Popular</div>' : ''}
            <h3>${paquete.nombre}</h3>
            <div class="precio">
                <span class="precio-actual">${formatearPrecio(paquete.precio)}</span>
                ${paquete.ahorro ? `<span class="ahorro">Ahorras ${formatearPrecio(paquete.ahorro)}</span>` : ''}
            </div>
            <p class="descripcion">${paquete.descripcion}</p>
            <ul class="incluye">
                ${paquete.incluye.map(item => `<li>✅ ${item}</li>`).join('')}
            </ul>
            <button onclick="seleccionarPaquete('${paquete.id}', '${paquete.nombre}', ${paquete.precio})" class="btn-primary">
                Seleccionar Paquete
            </button>
        </div>
    `).join('');

    container.innerHTML = `
        <h2>📦 Paquetes Especiales</h2>
        <div class="paquetes-grid">
            ${paquetesHTML}
        </div>
    `;
}

// NUEVA FUNCIÓN: Seleccionar paquete
function seleccionarPaquete(id, nombre, precio) {
    paqueteSeleccionado = {
        id: id,
        nombre: nombre,
        precio: precio,
        tipo: 'paquete'
    };
    
    // Limpiar carrito múltiple
    carritoMultiple = {};
    
    actualizarResumenCompra();
    mostrarMensaje(`Paquete "${nombre}" seleccionado`, 'success');
}

// MANTENER función existente con mejoras
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
    
    // Limpiar paquete seleccionado si hay servicios individuales
    if (Object.keys(carritoMultiple).length > 0) {
        paqueteSeleccionado = null;
    }
    
    actualizarPrecioMultiple();
    actualizarResumenCompra();
}

// MANTENER función existente
function actualizarPrecioMultiple() {
    let total = 0;
    let totalCreditos = 0;
    
    Object.keys(carritoMultiple).forEach(servicio => {
        const cantidad = carritoMultiple[servicio];
        const precio = precios[servicio];
        total += cantidad * precio;
        totalCreditos += cantidad;
    });
    
    document.getElementById('precio-multiple').textContent = `${formatearPrecio(total)}`;
    document.getElementById('creditos-total').textContent = `${totalCreditos} créditos`;
    
    const btnMultiple = document.getElementById('btn-multiple');
    if (btnMultiple) {
        btnMultiple.disabled = totalCreditos === 0;
    }
}

// NUEVA FUNCIÓN: Actualizar resumen de compra
function actualizarResumenCompra() {
    const resumenContainer = document.getElementById('resumen-compra');
    if (!resumenContainer) return;

    let resumenHTML = '';
    let total = 0;

    if (paqueteSeleccionado) {
        resumenHTML = `
            <h3>Resumen de Compra</h3>
            <div class="item-resumen">
                <span>${paqueteSeleccionado.nombre}</span>
                <span>${formatearPrecio(paqueteSeleccionado.precio)}</span>
            </div>
        `;
        total = paqueteSeleccionado.precio;
    } else if (Object.keys(carritoMultiple).length > 0) {
        resumenHTML = '<h3>Resumen de Compra</h3>';
        Object.keys(carritoMultiple).forEach(servicio => {
            const cantidad = carritoMultiple[servicio];
            const precio = precios[servicio];
            const subtotal = cantidad * precio;
            total += subtotal;
            
            resumenHTML += `
                <div class="item-resumen">
                    <span>${nombres[servicio]} (${cantidad})</span>
                    <span>${formatearPrecio(subtotal)}</span>
                </div>
            `;
        });
    }

    if (total > 0) {
        resumenHTML += `
            <div class="total-resumen">
                <strong>Total: ${formatearPrecio(total)}</strong>
            </div>
        `;
    }

    resumenContainer.innerHTML = resumenHTML;
}

// NUEVA FUNCIÓN: Inicializar sistema de compras
function inicializarSistemaCompras() {
    // Configurar formulario de pago
    const formPago = document.getElementById('form-pago');
    if (formPago) {
        formPago.addEventListener('submit', procesarPago);
    }
    
    // Pre-llenar datos del usuario si está logueado
    if (authManager.isAuthenticated()) {
        const user = authManager.getUser();
        const nombreInput = document.getElementById('nombre');
        const emailInput = document.getElementById('email');
        const telefonoInput = document.getElementById('telefono');
        const documentoInput = document.getElementById('documento');
        
        if (nombreInput) nombreInput.value = user.nombre || '';
        if (emailInput) emailInput.value = user.email || '';
        if (telefonoInput) telefonoInput.value = user.telefono || '';
        if (documentoInput) documentoInput.value = user.documento || '';
    }
}

// NUEVA FUNCIÓN: Procesar pago
async function procesarPago(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const comprobante = formData.get('comprobante');
    
    // Validaciones
    if (!comprobante || comprobante.size === 0) {
        mostrarMensaje('Por favor, sube el comprobante de pago', 'error');
        return;
    }
    
    if (!paqueteSeleccionado && Object.keys(carritoMultiple).length === 0) {
        mostrarMensaje('Selecciona al menos un servicio o paquete', 'error');
        return;
    }
    
    // Validar archivo
    try {
        validarArchivo(comprobante);
    } catch (error) {
        mostrarMensaje(error.message, 'error');
        return;
    }
    
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Procesando pago...';
    
    try {
        // Calcular total y preparar datos
        let total = 0;
        let concepto = '';
        let tipoCompra = 'servicio_individual';
        let paqueteSeleccionadoId = null;
        
        if (paqueteSeleccionado) {
            total = paqueteSeleccionado.precio;
            concepto = paqueteSeleccionado.nombre;
            tipoCompra = 'paquete';
            paqueteSeleccionadoId = paqueteSeleccionado.id;
        } else {
            Object.keys(carritoMultiple).forEach(servicio => {
                const cantidad = carritoMultiple[servicio];
                const precio = precios[servicio];
                total += cantidad * precio;
                concepto += `${nombres[servicio]} (${cantidad}), `;
            });
            concepto = concepto.slice(0, -2); // Remover última coma
        }
        
        const pagoData = {
            nombre: formData.get('nombre'),
            email: formData.get('email'),
            telefono: formData.get('telefono'),
            documento: formData.get('documento'),
            monto: total,
            concepto: concepto,
            tipo_compra: tipoCompra,
            paquete_seleccionado: paqueteSeleccionadoId,
            referencia_bancaria: formData.get('referencia') || null
        };
        
        // Enviar al backend
        const response = await uploadFile(CONFIG.ENDPOINTS.PROCESAR_PAGO, comprobante, pagoData);
        
        mostrarMensaje('¡Pago enviado exitosamente! Será revisado y aprobado en las próximas horas.', 'success');
        
        // Limpiar formulario y carrito
        event.target.reset();
        carritoMultiple = {};
        paqueteSeleccionado = null;
        actualizarPrecioMultiple();
        actualizarResumenCompra();
        
        // Mostrar resumen del pago
        mostrarResumenPago(response);
        
    } catch (error) {
        console.error('Error procesando pago:', error);
        mostrarMensaje(error.message || 'Error al procesar el pago', 'error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Procesar Pago';
    }
}

// NUEVA FUNCIÓN: Mostrar resumen del pago
function mostrarResumenPago(pago) {
    const resumen = `
        <div class="resumen-pago">
            <h3>✅ Pago Enviado Exitosamente</h3>
            <div class="detalle-pago">
                <p><strong>ID de Pago:</strong> #${pago.id}</p>
                <p><strong>Monto:</strong> ${formatearPrecio(pago.monto)}</p>
                <p><strong>Concepto:</strong> ${pago.concepto}</p>
                <p><strong>Estado:</strong> Pendiente de aprobación</p>
            </div>
            <div class="siguiente-pasos">
                <h4>📋 Próximos pasos:</h4>
                <ol>
                    <li>Tu pago será revisado por nuestro equipo</li>
                    <li>Recibirás una confirmación por email</li>
                    <li>Los créditos se asignarán automáticamente</li>
                    <li>Podrás agendar tus citas</li>
                </ol>
            </div>
        </div>
    `;
    
    // Mostrar en modal o reemplazar contenido
    mostrarMensaje(resumen, 'success');
}

// MANTENER todas las funciones existentes del código original
// (Las funciones del manejo de selección de servicio individual, etc.)

// Manejar selección de servicio individual (MANTENER)
const servicioIndividualSelect = document.getElementById('servicio-individual');
if (servicioIndividualSelect) {
    servicioIndividualSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const precio = selectedOption.getAttribute('data-precio');
        const btnIndividual = document.getElementById('btn-individual');
        
        if (precio) {
            document.getElementById('precio-individual').textContent = `${formatearPrecio(parseInt(precio))}`;
            btnIndividual.disabled = false;
        } else {
            document.getElementById('precio-individual').textContent = 'Selecciona un servicio';
            btnIndividual.disabled = true;
        }
    });
}

console.log('✅ Sistema de compras de CreSer cargado');
