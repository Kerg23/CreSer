    // Función para actualizar el resumen
    function actualizarResumen() {
      const servicio = document.getElementById('servicio');
      const fecha = document.getElementById('fecha');
      const hora = document.getElementById('hora');
      const modalidad = document.querySelector('input[name="modalidad"]:checked');
      
      if (servicio.value && fecha.value && hora.value && modalidad) {
        const selectedOption = servicio.options[servicio.selectedIndex];
        
        document.getElementById('resumen-servicio').textContent = selectedOption.text;
        document.getElementById('resumen-fecha-hora').textContent = fecha.value + ' a las ' + hora.value;
        document.getElementById('resumen-modalidad').textContent = modalidad.value.charAt(0).toUpperCase() + modalidad.value.slice(1);
        
        document.getElementById('resumen-cita').style.display = 'block';
      } else {
        document.getElementById('resumen-cita').style.display = 'none';
      }
    }

    // Validar formulario
    function validarFormulario() {
      const servicio = document.getElementById('servicio').value;
      const nombre = document.getElementById('nombre').value;
      const correo = document.getElementById('correo').value;
      const telefono = document.getElementById('telefono').value;
      const fecha = document.getElementById('fecha').value;
      const hora = document.getElementById('hora').value;
      const modalidad = document.querySelector('input[name="modalidad"]:checked');
      
      const formularioCompleto = servicio && nombre && correo && telefono && fecha && hora && modalidad;
      
      document.getElementById('agendar-btn').disabled = !formularioCompleto;
    }

    // Event listeners para validación y actualización del resumen
    document.getElementById('servicio').addEventListener('change', function() {
      validarFormulario();
      actualizarResumen();
    });

    document.getElementById('nombre').addEventListener('input', validarFormulario);
    document.getElementById('correo').addEventListener('input', validarFormulario);
    document.getElementById('telefono').addEventListener('input', validarFormulario);
    
    document.getElementById('fecha').addEventListener('change', function() {
      validarFormulario();
      actualizarResumen();
    });
    
    document.getElementById('hora').addEventListener('change', function() {
      validarFormulario();
      actualizarResumen();
    });

    // Event listeners para modalidad
    document.querySelectorAll('input[name="modalidad"]').forEach(radio => {
      radio.addEventListener('change', function() {
        validarFormulario();
        actualizarResumen();
      });
    });

    // Establecer fecha mínima (hoy)
    document.getElementById('fecha').min = new Date().toISOString().split('T')[0];

    // Manejar envío del formulario
    document.getElementById('agenda-form').addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Recopilar datos del formulario para enviar al backend
      const formData = {
        servicio: document.getElementById('servicio').value,
        nombre: document.getElementById('nombre').value,
        correo: document.getElementById('correo').value,
        telefono: document.getElementById('telefono').value,
        fecha: document.getElementById('fecha').value,
        hora: document.getElementById('hora').value,
        modalidad: document.querySelector('input[name="modalidad"]:checked').value,
        comentarios: document.getElementById('comentarios').value
      };
      
      // Aquí enviarías los datos al backend
      console.log('Datos de la cita:', formData);
      
      // Mensaje temporal (reemplazar con lógica del backend)
      alert('¡Cita agendada exitosamente! Te contactaremos pronto para confirmar tu cita.');
      
      // Opcional: limpiar formulario
      this.reset();
      document.getElementById('resumen-cita').style.display = 'none';
      validarFormulario();
    });