// Variables globales
let noticias = [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    cargarNoticias();
    configurarEventos();
    configurarFormularioContacto();
});

async function cargarNoticias() {
    try {
        mostrarLoading(true);
        
        const response = await apiRequest(CONFIG.ENDPOINTS.NOTICIAS);
        noticias = response.noticias || [];
        
        mostrarNoticias();
        
    } catch (error) {
        console.error('Error cargando noticias:', error);
        mostrarMensaje('Error al cargar las noticias', 'error');
    } finally {
        mostrarLoading(false);
    }
}

function mostrarNoticias() {
    const container = document.getElementById('noticias-container');
    container.innerHTML = '';
    
    noticias.forEach(noticia => {
        const noticiaElement = crearElementoNoticia(noticia);
        container.appendChild(noticiaElement);
    });
}

function crearElementoNoticia(noticia) {
    const article = document.createElement('article');
    article.className = 'noticia-card';
    article.setAttribute('data-id', noticia.id);
    
    article.innerHTML = `
        <div class="noticia-imagen">
            <img src="${noticia.imagen || 'recursos/noticia-default.jpg'}" alt="${noticia.titulo}">
        </div>
        <div class="noticia-contenido">
            <div class="noticia-meta">
                <span class="fecha-noticia">
                    <i class="fas fa-calendar-alt"></i> ${formatearFecha(noticia.fecha_publicacion)}
                </span>
                <span class="autor-noticia">
                    <i class="fas fa-user"></i> ${noticia.autor}
                </span>
            </div>
            <h2>${noticia.titulo}</h2>
            <p>${noticia.contenido.substring(0, 150)}...</p>
            <div class="noticia-acciones">
                <button class="btn-leer-mas" data-id="${noticia.id}">
                    <i class="fas fa-book-open"></i> Leer más
                </button>
                <div class="admin-acciones" style="display: ${authManager.isAdmin() ? 'flex' : 'none'};">
                    <button class="btn-editar-noticia" data-id="${noticia.id}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-eliminar-noticia" data-id="${noticia.id}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Añadir eventos
    const btnLeerMas = article.querySelector('.btn-leer-mas');
    btnLeerMas.addEventListener('click', () => leerMas(noticia.id));
    
    if (authManager.isAdmin()) {
        const btnEditar = article.querySelector('.btn-editar-noticia');
        const btnEliminar = article.querySelector('.btn-eliminar-noticia');
        
        btnEditar.addEventListener('click', () => editarNoticia(noticia.id));
        btnEliminar.addEventListener('click', () => eliminarNoticia(noticia.id));
    }
    
    return article;
}

function configurarEventos() {
    // Botón nueva noticia
    const btnNuevaNoticia = document.getElementById('btn-nueva-noticia');
    if (btnNuevaNoticia) {
        btnNuevaNoticia.addEventListener('click', mostrarFormulario);
    }
    
    // Botón cancelar
    const btnCancelar = document.getElementById('btn-cancelar-noticia');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', cancelarFormulario);
    }
    
    // Botón cerrar modal
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', cerrarModal);
    }
    
    // Preview de imagen
    const inputImagen = document.getElementById('imagen-noticia');
    if (inputImagen) {
        inputImagen.addEventListener('change', manejarPreviewImagen);
    }
    
    // Envío del formulario
    const formNoticia = document.getElementById('form-noticia');
    if (formNoticia) {
        formNoticia.addEventListener('submit', manejarEnvioFormulario);
    }
    
    // Establecer fecha actual
    establecerFechaActual();
    
    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modal-noticia');
        if (event.target === modal) {
            cerrarModal();
        }
    });
}

function manejarPreviewImagen(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('preview-imagen');
    const previewImg = document.getElementById('preview-img');
    
    if (file) {
        try {
            validarArchivo(file);
            
            const reader = new FileReader();
            reader.onload = function(e) {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } catch (error) {
            mostrarMensaje(error.message, 'error');
            e.target.value = '';
            preview.style.display = 'none';
        }
    } else {
        preview.style.display = 'none';
    }
}

async function manejarEnvioFormulario(e) {
    e.preventDefault();
    
    if (!authManager.requireAdmin()) return;
    
    const formData = new FormData(e.target);
    const noticiaId = document.getElementById('noticia-id').value;
    
    try {
        mostrarLoading(true);
        
        let response;
        if (noticiaId) {
            // Actualizar noticia existente
            response = await uploadFile(`${CONFIG.ENDPOINTS.ACTUALIZAR_NOTICIA}/${noticiaId}`, formData);
        } else {
            // Crear nueva noticia
            response = await uploadFile(CONFIG.ENDPOINTS.CREAR_NOTICIA, formData);
        }
        
        mostrarMensaje(noticiaId ? 'Noticia actualizada exitosamente' : 'Noticia publicada exitosamente', 'success');
        
        // Recargar noticias
        await cargarNoticias();
        
        // Limpiar formulario
        cancelarFormulario();
        
    } catch (error) {
        console.error('Error guardando noticia:', error);
        mostrarMensaje('Error al guardar la noticia', 'error');
    } finally {
        mostrarLoading(false);
    }
}

function establecerFechaActual() {
    const fechaInput = document.getElementById('fecha-noticia');
    if (fechaInput) {
        const hoy = new Date().toISOString().split('T')[0];
        fechaInput.value = hoy;
    }
}

function mostrarFormulario() {
    if (!authManager.requireAdmin()) return;
    
    document.getElementById('formulario-noticia').style.display = 'block';
    document.getElementById('formulario-noticia').scrollIntoView({ behavior: 'smooth' });
    
    // Resetear formulario
    document.getElementById('form-titulo').textContent = 'Crear Nueva Noticia';
    document.getElementById('btn-publicar').innerHTML = '<i class="fas fa-paper-plane"></i> Publicar Noticia';
    document.getElementById('noticia-id').value = '';
}

function cancelarFormulario() {
    document.getElementById('form-noticia').reset();
    document.getElementById('preview-imagen').style.display = 'none';
    document.getElementById('formulario-noticia').style.display = 'none';
    document.getElementById('noticia-id').value = '';
    establecerFechaActual();
}

function leerMas(id) {
    const noticia = noticias.find(n => n.id === id);
    if (!noticia) return;
    
    document.getElementById('modal-titulo').textContent = noticia.titulo;
    document.getElementById('modal-fecha').innerHTML = `<i class="fas fa-calendar-alt"></i> ${formatearFecha(noticia.fecha_publicacion)}`;
    document.getElementById('modal-autor').innerHTML = `<i class="fas fa-user"></i> ${noticia.autor}`;
    document.getElementById('modal-imagen').src = noticia.imagen || 'recursos/noticia-default.jpg';
    document.getElementById('modal-imagen').alt = noticia.titulo;
    
    // Convertir saltos de línea a párrafos
    const contenidoFormateado = noticia.contenido.split('\n\n').map(parrafo => 
        `<p>${parrafo}</p>`
    ).join('');
    document.getElementById('modal-contenido').innerHTML = contenidoFormateado;
    
    document.getElementById('modal-noticia').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modal-noticia').style.display = 'none';
}

function editarNoticia(id) {
    if (!authManager.requireAdmin()) return;
    
    const noticia = noticias.find(n => n.id === id);
    if (!noticia) return;
    
    // Llenar formulario con datos existentes
    document.getElementById('noticia-id').value = noticia.id;
    document.getElementById('titulo-noticia').value = noticia.titulo;
    document.getElementById('contenido-noticia').value = noticia.contenido;
    
    // Convertir fecha
    const fechaInput = new Date(noticia.fecha_publicacion).toISOString().split('T')[0];
    document.getElementById('fecha-noticia').value = fechaInput;
    
    // Mostrar formulario
    document.getElementById('formulario-noticia').style.display = 'block';
    document.getElementById('formulario-noticia').scrollIntoView({ behavior: 'smooth' });
    
    // Cambiar texto del botón y título
    document.getElementById('form-titulo').textContent = 'Editar Noticia';
    document.getElementById('btn-publicar').innerHTML = '<i class="fas fa-save"></i> Actualizar Noticia';
}

async function eliminarNoticia(id) {
    if (!authManager.requireAdmin()) return;
    
    if (!confirm('¿Estás seguro de que quieres eliminar esta noticia?')) return;
    
    try {
        mostrarLoading(true);
        
        await apiRequest(`${CONFIG.ENDPOINTS.ELIMINAR_NOTICIA}/${id}`, {
            method: 'DELETE'
        });
        
        mostrarMensaje('Noticia eliminada exitosamente', 'success');
        
        // Recargar noticias
        await cargarNoticias();
        
    } catch (error) {
        console.error('Error eliminando noticia:', error);
        mostrarMensaje('Error al eliminar la noticia', 'error');
    } finally {
        mostrarLoading(false);
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
