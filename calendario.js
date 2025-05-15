document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("agenda-form");
  const btn = document.getElementById("agendar-btn");

  form.addEventListener("input", () => {
    const isFilled =
      form.servicio.value &&
      form.nombre.value.trim() &&
      form.correo.value.trim() &&
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

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("¡Cita agendada con éxito!");
    form.reset();
    btn.disabled = true;
    btn.classList.remove("enabled");
  });
});
