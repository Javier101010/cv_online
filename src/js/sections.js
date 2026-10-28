// Correo que recibe los mensajes del formulario (se abre el cliente de correo del visitante).
// Mientras esté vacío, el formulario invita a escribir por LinkedIn.
const CORREO_CONTACTO = '';

/** Visor modal: reproduce el video o abre el proyecto al pulsar una tarjeta. */
export function setupViewer({ onOpen } = {}) {
  const viewer = document.querySelector('.viewer');
  const title = viewer.querySelector('.viewer__title');
  const media = viewer.querySelector('.viewer__media');
  const base = import.meta.env.BASE_URL;

  document.querySelectorAll('.project').forEach((card) => {
    card.addEventListener('click', () => {
      const { type, src } = card.dataset;
      title.textContent = card.dataset.title;
      if (type === 'video') {
        media.innerHTML = `<video src="${base}${src}" controls autoplay playsinline></video>`;
      } else {
        media.innerHTML = `<iframe src="${base}${src}" title="${card.dataset.title}"></iframe>`;
      }
      onOpen?.();
      viewer.showModal();
    });
  });

  viewer.querySelector('.viewer__close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', (e) => {
    if (e.target === viewer) viewer.close(); // clic fuera del contenido
  });
  // al cerrar se descarta el contenido para detener el video
  viewer.addEventListener('close', () => media.replaceChildren());

  return { isOpen: () => viewer.open };
}

export function setupContactForm() {
  const form = document.querySelector('.contact__form');
  const status = form.querySelector('.contact__status');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!CORREO_CONTACTO) {
      status.textContent = 'El formulario aún no está activo. Mientras tanto, escríbeme por LinkedIn.';
      return;
    }
    const { email, motivo } = Object.fromEntries(new FormData(form));
    const body = `${motivo}\n\nResponder a: ${email}`;
    location.href = `mailto:${CORREO_CONTACTO}?subject=${encodeURIComponent('Contacto desde el portafolio')}&body=${encodeURIComponent(body)}`;
    status.textContent = 'Se abrió tu aplicación de correo para enviar el mensaje.';
  });
}
