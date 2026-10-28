// Fondo provisional para todos los fotogramas; cámbialo cuando tengas tus fotos
const FONDO = `${import.meta.env.BASE_URL}img/fondo-prueba.jpeg`;

const pad = (n) => String(n).padStart(2, '0');

function edge(top, n) {
  const el = document.createElement('div');
  el.className = 'strip__edge';
  el.setAttribute('aria-hidden', 'true');
  const marks = top ? [`◐ ${pad(n)}`, 'RENE 400'] : [pad(n), `▸ ${pad(n)}A`];
  el.innerHTML =
    '<span class="strip__holes"></span>' +
    marks.map((m) => `<span class="strip__mark">${m}</span>`).join('') +
    '<span class="strip__holes strip__holes--short"></span>';
  return el;
}

function frame(kind, shot) {
  const el = document.createElement('div');
  el.className = `frame frame--${kind}`;
  el.style.setProperty('--shot', shot);
  el.innerHTML = `<img class="frame__img" src="${FONDO}" alt="" decoding="async">`;
  if (kind === 'main') el.insertAdjacentHTML('beforeend', '<div class="frame__grade"></div>');
  else el.setAttribute('aria-hidden', 'true');
  return el;
}

/** Envuelve el contenido de una sección en una tira de película con su fotograma. */
export function decorateStrip(strip, n) {
  const shot = strip.dataset.shot ?? '50% 50%';
  const content = [...strip.childNodes];
  const main = frame('main', shot);
  main.append(...content);

  const frames = document.createElement('div');
  frames.className = 'strip__frames';
  frames.append(frame('peek-l', '15% 65%'), main, frame('peek-r', '85% 40%'));

  strip.replaceChildren(edge(true, n), frames, edge(false, n));
  // escalonado con tope, para que los últimos elementos no tarden demasiado
  strip.querySelectorAll('.reveal').forEach((el, i) => el.style.setProperty('--i', Math.min(i, 7)));
}

/** Tira decorativa sin contenido, para que siempre haya rollo arriba y abajo. */
export function createLeader(n, shot) {
  const strip = document.createElement('div');
  strip.className = 'strip strip--leader';
  strip.setAttribute('aria-hidden', 'true');
  strip.dataset.shot = shot;
  decorateStrip(strip, n);
  return strip;
}
