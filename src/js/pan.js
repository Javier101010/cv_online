// Desplazamiento lateral: el carrete inferior corre el rollo hacia un lado para
// mostrar la parte del fotograma que no cabe a lo ancho. Sigue siendo el mismo fotograma.
import { sectorPath } from './dial.js';

const PASO_TECLA = 120;
const ARRASTRE_MIN = 4; // px de movimiento a partir de los cuales no cuenta como clic

/** Carrete de película: rollo enrollado, cinco ventanas y el eje. */
function drawReel(svg) {
  const layers = [62, 70, 78, 86]
    .map((r) => `<circle r="${r}" fill="none" stroke="rgba(255,255,255,0.035)" stroke-width="0.6"/>`)
    .join('');
  const windows = Array.from({ length: 5 }, (_, k) =>
    `<path d="${sectorPath(30, 52, k * 72 - 22, k * 72 + 22)}" fill="#0a0908" stroke="rgba(255,255,255,0.08)" stroke-width="0.6" stroke-linejoin="round"/>`,
  ).join('');
  svg.innerHTML = `
    <circle r="96" fill="none" stroke="#35302a" stroke-width="4" stroke-dasharray="0.9 1.1"/>
    <circle r="92" fill="#15120f"/>
    <circle r="56" fill="#221d19"/>
    ${layers}
    ${windows}
    <circle r="22" fill="#2b2521" stroke="#4a433c" stroke-width="1.2"/>
    <circle r="9" fill="#0d0b09"/>
    <path d="M-2 -9h4v-5h-4zM-2 9h4v5h-4z" fill="#0d0b09"/>
    <circle cx="0" cy="-74" r="2.6" fill="#f28a1e"/>`;
}

/**
 * @param strips  tiras con contenido (las secciones)
 * @param reel    elemento .reel (role="slider")
 * @param media   MediaQueryList: solo se desplaza cuando coincide (escritorio)
 * @param hint    pista de "hay más a la derecha"; se muestra mientras quede contenido
 */
export function createPan({ strips, reel, media, hint }) {
  const disc = reel.querySelector('.reel__disc');
  drawReel(disc);
  const extra = new Map(); // tira → px que sobran a lo ancho
  let strip = null;
  let pan = 0;

  const max = () => (strip && extra.get(strip)) || 0;
  // radio del carrete: la película se enrolla en él, así que el giro sigue al avance
  const radius = () => (reel.offsetWidth * 0.94) / 2 || 1;

  function apply(animate) {
    reel.classList.toggle('is-dragging', !animate);
    disc.style.transform = `rotate(${(pan / radius()) * (180 / Math.PI)}deg)`;
    if (!strip) return;
    strip.classList.toggle('is-dragging', !animate);
    strip.style.translate = pan ? `${-pan}px 0` : '';
    reel.setAttribute('aria-valuenow', String(max() ? Math.round((pan / max()) * 100) : 0));
    hint?.classList.toggle('is-on', max() - pan > 1);
  }

  function set(px, animate = true) {
    const next = Math.min(max(), Math.max(0, px));
    const moved = next !== pan;
    pan = next;
    apply(animate);
    return moved;
  }

  function refreshReel() {
    const on = max() > 0;
    reel.classList.toggle('is-enabled', on);
    reel.setAttribute('aria-disabled', String(!on));
    reel.tabIndex = on ? 0 : -1;
  }

  /** Mide cuánto sobra en cada fotograma y alarga la tira para que quepa entero. */
  function measure() {
    strips.forEach((s) => {
      s.style.width = '';
      extra.set(s, 0);
    });
    if (media.matches) {
      strips.forEach((s) => {
        const panel = s.querySelector('.panel, .hero');
        if (!panel) return;
        // al alargar la tira, los rellenos en % también crecen: se repite hasta que quepa
        let total = 0;
        for (let i = 0; i < 4; i++) {
          const sobra = Math.ceil(panel.scrollWidth - panel.clientWidth);
          if (sobra <= 1) break;
          total += sobra;
          s.style.width = `calc(100% + ${total}px)`;
        }
        if (total > 8) extra.set(s, total);
        else s.style.width = '';
      });
    }
    refreshReel();
    set(pan, false);
  }

  /**
   * Cambio de fotograma: el anterior vuelve a su sitio y el carrete se rebobina.
   * Con `atEnd`, el nuevo llega ya corrido hasta el final (al retroceder con la rueda).
   */
  function setStrip(next, atEnd = false) {
    if (strip && strip !== next) {
      strip.classList.remove('is-dragging');
      strip.style.translate = '';
    }
    strip = next;
    refreshReel();
    pan = atEnd ? max() : 0;
    apply(!atEnd);
  }

  // Lo que se ve del fotograma (sin la parte que sobra)
  const visible = () => (strip ? strip.offsetWidth - max() : 0);

  // --- Arrastre del carrete: el ángulo girado se traduce en avance del rollo
  const drag = { id: null, angle: 0, from: 0, turned: 0, x: 0, y: 0, dist: 0 };

  function angleAt(e) {
    const r = reel.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
  }

  reel.addEventListener('pointerdown', (e) => {
    if (!max() || e.button !== 0) return;
    e.preventDefault();
    reel.focus({ preventScroll: true }); // así después responde a Inicio/Fin y Re Pág/Av Pág
    reel.setPointerCapture(e.pointerId);
    Object.assign(drag, { id: e.pointerId, angle: angleAt(e), from: pan, turned: 0, x: e.clientX, y: e.clientY, dist: 0 });
  });

  reel.addEventListener('pointermove', (e) => {
    if (e.pointerId !== drag.id) return;
    const a = angleAt(e);
    let d = a - drag.angle;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    drag.angle = a;
    drag.turned += d;
    drag.dist = Math.max(drag.dist, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
    if (drag.dist > ARRASTRE_MIN) set(drag.from + drag.turned * radius(), false);
  });

  function endDrag(e) {
    if (e.pointerId !== drag.id) return;
    drag.id = null;
    if (drag.dist <= ARRASTRE_MIN) {
      // clic: avanza un tramo; al final, rebobina
      set(pan >= max() - 1 ? 0 : pan + visible() * 0.6);
    } else {
      apply(true);
    }
  }
  reel.addEventListener('pointerup', endDrag);
  reel.addEventListener('pointercancel', endDrag);

  reel.addEventListener('keydown', (e) => {
    const keys = { Home: 0, End: max(), PageUp: pan - visible() * 0.6, PageDown: pan + visible() * 0.6 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    e.stopPropagation(); // en el carrete, Inicio/Fin desplazan en lugar de cambiar de fotograma
    set(keys[e.key]);
  });

  // Si el foco cae en algo que está fuera de la vista, el rollo se corre hasta mostrarlo
  strips.forEach((s) =>
    s.addEventListener('focusin', (e) => {
      if (s !== strip || !max()) return;
      const frame = s.querySelector('.frame--main').getBoundingClientRect();
      const left = frame.left + pan;
      const right = left + frame.width - max();
      const r = e.target.getBoundingClientRect();
      if (r.right > right - 24) set(pan + r.right - right + 48);
      else if (r.left < left + 24) set(pan - (left - r.left) - 48);
    }),
  );

  return {
    measure,
    setStrip,
    /** Desplaza por pasos (teclado). Devuelve false si no hay nada que desplazar. */
    step(dir) {
      if (!max()) return false;
      set(pan + dir * PASO_TECLA);
      return true;
    },
    /**
     * Rueda del mouse: hacia abajo corre el fotograma a la derecha, hacia arriba lo regresa.
     * Devuelve false si ya no queda nada que desplazar en esa dirección.
     */
    wheel(e) {
      if (!media.matches || !max()) return false;
      const unit = e.deltaMode === 1 ? 40 : 1;
      const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit;
      if (delta > 0 ? pan >= max() - 0.5 : pan <= 0.5) return false;
      // los saltos grandes (rueda con muescas) se animan; los pequeños (trackpad) siguen al dedo
      set(pan + delta, Math.abs(delta) >= 50);
      return true;
    },
  };
}
