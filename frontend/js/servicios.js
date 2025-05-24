// JavaScript para servicios.html
document.addEventListener('DOMContentLoaded', function() {
    configurarFormularioContacto();
});

function toggleServicio(id) {
    const descripcion = document.getElementById(id);
    const expandir = descripcion.previousElementSibling.querySelector('.expandir');
    
    if (descripcion.style.display === 'block') {
        descripcion.style.display = 'none';
        expandir.textContent = '+';
    } else {
        descripcion.style.display = 'block';
        expandir.textContent = '-';
    }
}

async function configurarFormularioContacto() {
    const formContacto = document.getElementById('form-contacto');
    
    if (formContacto) {
        formContacto.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const datos = {
                nombre: formData.get('nombre'),
                telefono: formData.get('telefono'),
                email: formData.get('email'),
                mensaje: formData.get('mensaje')
            };
            
            try {
                mostrarLoading(true);
                
                const response = await apiRequest(CONFIG.ENDPOINTS.CONTACTO, {
                    method: 'POST',
                    body: JSON.stringify(datos)
                });
                
                mostrarMensaje('Mensaje enviado exitosamente. Te contactaremos pronto.', 'success');
                this.reset();
                
            } catch (error) {
                console.error('Error enviando mensaje:', error);
                mostrarMensaje('Error al enviar el mensaje. Por favor, intenta nuevamente.', 'error');
            } finally {
                mostrarLoading(false);
            }
        });
    }
}
