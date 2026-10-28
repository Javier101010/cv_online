const SVG_NS = 'http://www.w3.org/2000/svg';
// Móvil: la rueda asoma a medias y gira para traer la opción activa al puntero.
// Escritorio: se ve entera y queda fija; solo se resalta la opción activa.
const GIRA = matchMedia('(max-width: 760px)');

function polar(r, deg) {
  const a = (deg * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
}

// Sector de anillo entre dos radios y dos ángulos (en grados)
export function sectorPath(rIn, rOut, a0, a1) {
  const [x0, y0] = polar(rOut, a0);
  const [x1, y1] = polar(rOut, a1);
  const [x2, y2] = polar(rIn, a1);
  const [x3, y3] = polar(rIn, a0);
  return `M${x0} ${y0}A${rOut} ${rOut} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${rIn} ${rIn} 0 0 0 ${x3} ${y3}Z`;
}

/**
 * Dibuja el anillo del dial y devuelve un controlador para marcar la sección activa.
 * Las primeras `count` casillas son las secciones; el resto, decorativas,
 * completan la rueda. La separación sale de --step en dial.css.
 */
export function createDial(dialEl, count) {
  const rotor = dialEl.querySelector('.dial__rotor');
  const ring = dialEl.querySelector('.dial__ring');
  const buttons = [...dialEl.querySelectorAll('.dial__btn')];
  let step = 36;
  let sectors = [];
  let active = 0;

  function draw() {
    step = parseFloat(getComputedStyle(dialEl).getPropertyValue('--step')) || 36;
    ring.innerHTML = `
    <defs>
      <radialGradient id="sector-fill" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="88">
        <stop offset="0.55" stop-color="#15120f"/>
        <stop offset="1" stop-color="#2b2521"/>
      </radialGradient>
    </defs>
    <circle r="96" fill="none" stroke="#35302a" stroke-width="5" stroke-dasharray="0.9 1.1"/>
    <circle r="91" fill="none" stroke="#0d0b09" stroke-width="2.5"/>`;

    sectors = [];
    for (let k = 0; k < 360 / step; k++) {
      const center = k * step;
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', sectorPath(51, 88, center - step / 2 + 1.4, center + step / 2 - 1.4));
      path.setAttribute('class', k < count ? 'dial__sector' : 'dial__sector dial__sector--deco');
      ring.append(path);
      sectors.push(path);
    }
  }

  function setActive(index, duration) {
    active = index;
    rotor.style.transitionDuration = `${duration}ms`;
    rotor.style.setProperty('--dial-rot', GIRA.matches ? `${-index * step}deg` : '0deg');
    buttons.forEach((btn, i) => {
      if (i === index) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });
    sectors.forEach((s, i) => s.classList.toggle('is-active', i === index));
  }

  draw();
  GIRA.addEventListener('change', () => {
    draw();
    setActive(active, 0);
  });

  return { buttons, setActive };
}
