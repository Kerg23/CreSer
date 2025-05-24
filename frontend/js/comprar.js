        const precios = {
            'valoracion-individual': 100000,
            'evaluacion-sesion': 80000,
            'psicoterapia-individual': 70000,
            'pareja-valoracion': 120000,
            'pareja-regular': 100000,
            'talleres-grupales': 45000,
            'orientacion-familiar': 110000
        };

        // Nombres de los servicios
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

        // Manejar selección de servicio individual
        document.getElementById('servicio-individual').addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const precio = selectedOption.getAttribute('data-precio');
            const btnIndividual = document.getElementById('btn-individual');
            
            if (precio) {
                document.getElementById('precio-individual').textContent = `$${parseInt(precio).toLocaleString()}`;
                btnIndividual.disabled = false;
            } else {
                document.getElementById('precio-individual').textContent = 'Selecciona un servicio';
                btnIndividual.disabled = true;
            }
        });

        // Manejar cantidades en paquete múltiple
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
            
            document.getElementById('precio-multiple').textContent = `$${total.toLocaleString()}`;
            document.getElementById('creditos-total').textContent = `${totalCreditos} créditos`;
            
            const btnMultiple = document.getElementById('btn-multiple');
            btnMultiple.disabled = totalCreditos === 0;
        }

        function seleccionarPaquete(tipo) {
            paqueteSeleccionado = tipo;
            
            let resumenHTML = '';
            let total = 0;
            
            if (tipo === 'individual') {
                const select = document.getElementById('servicio-individual');
                const selectedOption = select.options[select.selectedIndex];
                const precio = parseInt(selectedOption.getAttribute('data-precio'));
                
                resumenHTML = `
                    <div class="item-resumen">
                        <span>${selectedOption.text.split(' - ')[0]}</span>
                        <span>1 × $${precio.toLocaleString()}</span>
                    </div>
                `;
                total = precio;
                
            } else if (tipo === 'multiple') {
                Object.keys(carritoMultiple).forEach(servicio => {
                    const cantidad = carritoMultiple[servicio];
                    const precio = precios[servicio];
                    const subtotal = cantidad * precio;
                    
                    resumenHTML += `
                        <div class="item-resumen">
                            <span>${nombres[servicio]}</span>
                            <span>${cantidad} × $${precio.toLocaleString()} = $${subtotal.toLocaleString()}</span>
                        </div>
                    `;
                    total += subtotal;
                });
                
            } else if (tipo === 'evaluacion-completa') {
                resumenHTML = `
                    <div class="item-resumen">
                        <span>Paquete Evaluación Completa</span>
                        <span>5 créditos = $350.000</span>
                    </div>
                    <div class="descuento-aplicado">
                        <span>Descuento aplicado: -$50.000 (12.5%)</span>
                    </div>
                `;
                total = 350000;
                
            } else if (tipo === 'psicoterapia-4') {
                resumenHTML = `
                    <div class="item-resumen">
                        <span>Paquete Psicoterapia 4 Sesiones</span>
                        <span>4 créditos = $260.000</span>
                    </div>
                    <div class="descuento-aplicado">
                        <span>Descuento aplicado: -$20.000 (7.5%)</span>
                    </div>
                `;
                total = 260000;
                
            } else if (tipo === 'psicoterapia-8') {
                resumenHTML = `
                    <div class="item-resumen">
                        <span>Paquete Psicoterapia 8 Sesiones</span>
                        <span>8 créditos = $500.000</span>
                    </div>
                    <div class="descuento-aplicado">
                        <span>Descuento aplicado: -$60.000 (10%)</span>
                    </div>
                `;
                total = 500000;
            }
            
            document.getElementById('resumen-servicios').innerHTML = resumenHTML;
            document.getElementById('subtotal-final').textContent = `$${total.toLocaleString()}`;
            document.getElementById('total-pagar').textContent = `$${total.toLocaleString()}`;
            
            document.getElementById('seccion-pago').style.display = 'block';
            document.getElementById('seccion-pago').scrollIntoView({ behavior: 'smooth' });
        }

        function cancelarCompra() {
            document.getElementById('seccion-pago').style.display = 'none';
            paqueteSeleccionado = null;
        }

        function procesarPago() {
            // Validar formulario
            const nombre = document.getElementById('nombre-completo').value;
            const email = document.getElementById('email').value;
            const telefono = document.getElementById('telefono').value;
            const documento = document.getElementById('documento').value;
            const terminos = document.getElementById('acepto-terminos').checked;
            
            if (!nombre || !email || !telefono || !documento || !terminos) {
                alert('Por favor completa todos los campos requeridos');
                return;
            }
            
            // Simular procesamiento
            document.getElementById('seccion-pago').style.display = 'none';
            document.getElementById('confirmacion').style.display = 'block';
            
            // Mostrar créditos obtenidos
            let creditosHTML = '';
            
            if (paqueteSeleccionado === 'individual') {
                const select = document.getElementById('servicio-individual');
                const servicioNombre = select.options[select.selectedIndex].text.split(' - ')[0];
                creditosHTML = `<div class="credito-final">${servicioNombre}: 1 crédito</div>`;
                
            } else if (paqueteSeleccionado === 'multiple') {
                Object.keys(carritoMultiple).forEach(servicio => {
                    const cantidad = carritoMultiple[servicio];
                    creditosHTML += `<div class="credito-final">${nombres[servicio]}: ${cantidad} crédito(s)</div>`;
                });
                
            } else if (paqueteSeleccionado === 'evaluacion-completa') {
                creditosHTML = `<div class="credito-final">Evaluación y Diagnóstico: 5 créditos</div>`;
                
            } else if (paqueteSeleccionado === 'psicoterapia-4') {
                creditosHTML = `<div class="credito-final">Psicoterapia Individual: 4 créditos</div>`;
                
            } else if (paqueteSeleccionado === 'psicoterapia-8') {
                creditosHTML = `<div class="credito-final">Psicoterapia Individual: 8 créditos</div>`;
            }
            
            document.getElementById('lista-creditos-finales').innerHTML = creditosHTML;
            
            // Aquí enviarías al backend
            console.log('Compra procesada:', {
                cliente: { nombre, email, telefono, documento },
                paquete: paqueteSeleccionado,
                servicios: paqueteSeleccionado === 'multiple' ? carritoMultiple : null
            });
            
            document.getElementById('confirmacion').scrollIntoView({ behavior: 'smooth' });
        }

        // Formateo de tarjeta
        document.getElementById('numero-tarjeta').addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });

        document.getElementById('vencimiento').addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });

        // Función para cambiar método de pago
function cambiarMetodoPago(metodo) {
    // Ocultar todos los formularios
    document.getElementById('tarjeta-form').style.display = 'none';
    document.getElementById('qr-form').style.display = 'none';
    document.getElementById('pse-form').style.display = 'none';
    
    // Mostrar el formulario seleccionado
    document.getElementById(metodo + '-form').style.display = 'block';
    
    // Lógica específica para cada método
    if (metodo === 'qr') {
        generarCodigoQR();
        iniciarTimerQR();
    } else if (metodo === 'pse') {
        // PSE no requiere lógica adicional por ahora
    }
}

// Función para generar código QR
function generarCodigoQR() {
    const qrContainer = document.getElementById('qr-code-container');
    const totalPagar = document.getElementById('total-pagar').textContent;
    
    // Simular generación de QR (en producción usarías una API real)
    setTimeout(() => {
        qrContainer.innerHTML = `
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=creser-payment-${Date.now()}" 
                 alt="Código QR de Pago" 
                 style="width: 180px; height: 180px; border-radius: 8px;">
        `;
        
        // Actualizar monto en la sección QR
        document.getElementById('qr-amount').textContent = totalPagar;
    }, 2000);
}

// Timer para QR
function iniciarTimerQR() {
    let tiempoRestante = 15 * 60; // 15 minutos en segundos
    const timerElement = document.getElementById('qr-timer');
    
    const timer = setInterval(() => {
        const minutos = Math.floor(tiempoRestante / 60);
        const segundos = tiempoRestante % 60;
        
        timerElement.textContent = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
        
        if (tiempoRestante <= 0) {
            clearInterval(timer);
            timerElement.textContent = 'Expirado';
            timerElement.style.color = 'var(--color-error)';
            
            // Regenerar QR
            document.getElementById('qr-code-container').innerHTML = `
                <div class="qr-expired">
                    <p>Código QR expirado</p>
                    <button onclick="generarCodigoQR(); iniciarTimerQR();" class="btn-regenerar">
                        Generar Nuevo QR
                    </button>
                </div>
            `;
        }
        
        tiempoRestante--;
    }, 1000);
}

// Función para actualizar tipo de documento en PSE
function actualizarTipoDocumento() {
    const tipoPersona = document.getElementById('tipo-persona').value;
    const tipoDocumento = document.getElementById('tipo-documento-pse');
    const nitOption = tipoDocumento.querySelector('option[value="nit"]');
    
    if (tipoPersona === 'juridica') {
        nitOption.style.display = 'block';
        tipoDocumento.value = 'nit';
    } else {
        nitOption.style.display = 'none';
        if (tipoDocumento.value === 'nit') {
            tipoDocumento.value = 'cc';
        }
    }
}

// Validación específica por método de pago
function validarMetodoPago() {
    const metodoSeleccionado = document.querySelector('input[name="metodo-pago"]:checked').value;
    
    switch (metodoSeleccionado) {
        case 'tarjeta':
            return validarTarjeta();
        case 'qr':
            return validarQR();
        case 'pse':
            return validarPSE();
        default:
            return false;
    }
}

function validarTarjeta() {
    const numeroTarjeta = document.getElementById('numero-tarjeta').value;
    const vencimiento = document.getElementById('vencimiento').value;
    const cvv = document.getElementById('cvv').value;
    const nombreTarjeta = document.getElementById('nombre-tarjeta').value;
    const documentoTarjeta = document.getElementById('documento-tarjeta').value;
    
    if (!numeroTarjeta || !vencimiento || !cvv || !nombreTarjeta || !documentoTarjeta) {
        alert('Por favor completa todos los campos de la tarjeta');
        return false;
    }
    
    // Validación básica de número de tarjeta (Luhn algorithm podría implementarse aquí)
    if (numeroTarjeta.replace(/\s/g, '').length < 13) {
        alert('Número de tarjeta inválido');
        return false;
    }
    
    return true;
}

function validarQR() {
    // Para QR, solo verificamos que el código esté generado y no haya expirado
    const qrContainer = document.getElementById('qr-code-container');
    const timerText = document.getElementById('qr-timer').textContent;
    
    if (timerText === 'Expirado') {
        alert('El código QR ha expirado. Por favor genera uno nuevo.');
        return false;
    }
    
    if (qrContainer.innerHTML.includes('qr-loading')) {
        alert('El código QR aún se está generando. Por favor espera.');
        return false;
    }
    
    return true;
}

function validarPSE() {
    const tipoPersona = document.getElementById('tipo-persona').value;
    const tipoDocumento = document.getElementById('tipo-documento-pse').value;
    const documento = document.getElementById('documento-pse').value;
    const banco = document.getElementById('banco-pse').value;
    
    if (!tipoPersona || !tipoDocumento || !documento || !banco) {
        alert('Por favor completa todos los campos de PSE');
        return false;
    }
    
    return true;
}

// Actualizar la función procesarPago para incluir validación
function procesarPago() {
    // Validar datos personales
    const nombre = document.getElementById('nombre-completo').value;
    const email = document.getElementById('email').value;
    const telefono = document.getElementById('telefono').value;
    const documento = document.getElementById('documento').value;
    const terminos = document.getElementById('acepto-terminos').checked;
    
    if (!nombre || !email || !telefono || !documento || !terminos) {
        alert('Por favor completa todos los campos personales requeridos');
        return;
    }
    
    // Validar método de pago específico
    if (!validarMetodoPago()) {
        return;
    }
    
    // Continuar con el procesamiento...
    const metodoSeleccionado = document.querySelector('input[name="metodo-pago"]:checked').value;
    
    // Simular procesamiento según el método
    let mensajeProcesamiento = '';
    switch (metodoSeleccionado) {
        case 'tarjeta':
            mensajeProcesamiento = 'Procesando pago con tarjeta...';
            break;
        case 'qr':
            mensajeProcesamiento = 'Esperando confirmación del pago QR...';
            break;
        case 'pse':
            mensajeProcesamiento = 'Redirigiendo a tu banco...';
            break;
    }
    
    // Mostrar mensaje de procesamiento
    const btnPagar = document.querySelector('.btn-pagar');
    const textoOriginal = btnPagar.textContent;
    btnPagar.textContent = mensajeProcesamiento;
    btnPagar.disabled = true;
    
    // Simular tiempo de procesamiento
    setTimeout(() => {
        document.getElementById('seccion-pago').style.display = 'none';
        document.getElementById('confirmacion').style.display = 'block';
        
        // Mostrar créditos obtenidos (código existente)
        mostrarCreditosObtenidos();
        
        document.getElementById('confirmacion').scrollIntoView({ behavior: 'smooth' });
        
        // Restaurar botón
        btnPagar.textContent = textoOriginal;
        btnPagar.disabled = false;
    }, 3000);
}
