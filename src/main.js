import { createDial } from './js/dial.js';
import { decorateStrip, createLeader } from './js/film.js';
import { setupViewer, setupContactForm } from './js/sections.js';
import { createPan } from './js/pan.js';
import { createEdgeGuard } from './js/edge.js';

// Coreografía de la transición "cámara mecánica" (ms)
const TIEMPOS = {
  alejar: 300,   // la cámara se aleja
  avance: 680,   // el rollo corre hasta el siguiente fotograma (+160 por cada sección extra)
  pausa: 140,    // se queda alejada un instante
  acercar: 340,  // vuelve a acercarse
};
const ZOOM_LEJOS = 0.6;
const ESPERA_RECORRIDO = 10000; // tiempo en cada fotograma durante el recorrido automático
const MECANICO = 'cubic-bezier(0.65, 0, 0.35, 1)';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const stage = document.querySelector('.stage');
const camera = document.querySelector('.camera');
const track = document.querySelector('.track');
const flickerEl = document.querySelector('.flicker');
const announcer = document.getElementById('announcer');
const prevBtn = document.querySelector('.advance--prev');
const nextBtn = document.querySelector('.advance--next');
const playBtn = document.querySelector('.dial__lens');
const playProgress = document.querySelector('.dial__play-progress');

const strips = [...track.querySelectorAll('.strip')];
strips.forEach((strip, i) => decorateStrip(strip, i + 1));
track.prepend(createLeader(0, '40% 20%'));
track.append(createLeader(strips.length + 1, '60% 80%'));

const dial = createDial(document.querySelector('.dial'), strips.length);
const pan = createPan({
  strips,
  reel: document.querySelector('.reel'),
  media: matchMedia('(min-width: 761px)'),
  hint: document.querySelector('.more-hint'),
});

let current = Math.max(0, strips.findIndex((s) => `#${s.id}` === location.hash));
let busy = false;
let queued = null;

// ---------------------------------------------------------------------------

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const trackY = (i) => `translateY(${-strips[i].offsetTop}px)`;

async function play(el, keyframes, duration, easing = MECANICO) {
  const anim = el.animate(keyframes, { duration, easing, fill: 'forwards' });
  await anim.finished;
  anim.commitStyles();
  anim.cancel();
}

function flicker() {
  flickerEl.animate(
    [{ opacity: 0 }, { opacity: 0.35 }, { opacity: 0.05 }, { opacity: 0.22 }, { opacity: 0 }],
    { duration: 380 },
  );
}

// La cámara vuelve a acercarse; el texto entra antes de que termine el movimiento
async function zoomIn(index, duration) {
  stage.classList.remove('is-pulled');
  flicker();
  setTimeout(() => strips[index].classList.add('is-revealed'), duration * 0.55);
  await play(camera, [
    { transform: `scale(${ZOOM_LEJOS})` },
    { transform: 'scale(1.012)', offset: 0.8 },
    { transform: 'scale(1)' },
  ], duration);
  camera.style.transform = '';
  stage.classList.remove('is-moving');
}

function setActiveStrip(index) {
  strips.forEach((strip, i) => {
    strip.classList.toggle('is-active', i === index);
    strip.inert = i !== index;
  });
  prevBtn.disabled = index === 0;
  nextBtn.disabled = index === strips.length - 1;
}

function announce(index) {
  const title = strips[index].querySelector('h1, h2').textContent.replace(/\s+/g, ' ').trim();
  announcer.textContent = `Sección ${index + 1} de ${strips.length}: ${title}`;
  history.replaceState(null, '', `#${strips[index].id}`);
}

function render(index) {
  pan.setStrip(strips[index]);
  track.style.transform = trackY(index);
  setActiveStrip(index);
  dial.setActive(index, 0);
  strips.forEach((strip, i) => strip.classList.toggle('is-revealed', i === index));
}

/**
 * Transición: se aleja → el rollo avanza (y el dial gira) → sigue alejada → se acerca.
 */
async function goTo(target, atEnd = false) {
  const next = Math.min(strips.length - 1, Math.max(0, target));
  if (next === current) return;
  if (busy) {
    queued = next;
    return;
  }

  busy = true;
  edge.clear();
  const from = current;
  current = next;
  announce(next);
  pan.setStrip(strips[next], atEnd); // el fotograma anterior vuelve a su sitio mientras la cámara se aleja

  if (reduceMotion.matches) {
    render(next);
    busy = false;
    return;
  }

  const dir = Math.sign(next - from);
  const avance = TIEMPOS.avance + (Math.abs(next - from) - 1) * 160;
  const y0 = -strips[from].offsetTop;
  const y1 = -strips[next].offsetTop;

  stage.classList.add('is-moving', 'is-pulled');
  strips[from].classList.remove('is-revealed');

  // 1. La cámara se aleja (con un pequeño rebote al frenar)
  await play(camera, [
    { transform: 'scale(1)' },
    { transform: `scale(${ZOOM_LEJOS - 0.018})`, offset: 0.82 },
    { transform: `scale(${ZOOM_LEJOS})` },
  ], TIEMPOS.alejar);

  // 2. El rollo avanza mientras el dial gira
  strips[from].classList.remove('is-active');
  dial.setActive(next, avance);
  await play(track, [
    { transform: `translateY(${y0}px)` },
    { transform: `translateY(${y1 - dir * 14}px)`, offset: 0.86 },
    { transform: `translateY(${y1}px)` },
  ], avance, 'cubic-bezier(0.7, 0, 0.25, 1)');

  // 3. Sigue alejada mientras el nuevo fotograma entra en foco
  setActiveStrip(next);
  await wait(TIEMPOS.pausa);

  // 4. Se acerca
  await zoomIn(next, TIEMPOS.acercar);
  finish();
}

function finish() {
  busy = false;
  wheel.quietUntil = performance.now() + 450; // absorbe la inercia del gesto que trajo hasta aquí
  if (queued !== null) {
    const q = queued;
    queued = null;
    goTo(q);
  }
}

// ---------------------------------------------------------------------------
// Recorrido automático: vuelve al primer fotograma y avanza solo, esperando en cada fotograma

const tour = { on: false, id: 0, timer: null };

function setTourUI(on) {
  playBtn.setAttribute('aria-pressed', String(on));
  playBtn.setAttribute('aria-label', on ? 'Detener recorrido' : 'Reproducir recorrido');
}

// El anillo del botón se llena durante la espera; su animación hace de temporizador
function countdown() {
  tour.timer = playProgress.animate(
    [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
    { duration: ESPERA_RECORRIDO },
  );
  return tour.timer.finished.then(() => true, () => false);
}

function stopTour() {
  if (!tour.on) return;
  tour.on = false;
  tour.timer?.cancel();
  setTourUI(false);
}

async function startTour() {
  const id = ++tour.id; // si se detiene y se reinicia, el recorrido anterior se descarta
  const vigente = () => tour.on && tour.id === id;
  tour.on = true;
  setTourUI(true);
  while (busy) await wait(100);
  if (!vigente()) return;
  if (current !== 0) await goTo(0);

  while (vigente() && current < strips.length - 1) {
    if (!(await countdown()) || !vigente()) return;
    await goTo(current + 1);
  }
  if (vigente()) stopTour();
}

playBtn.addEventListener('click', () => (tour.on ? stopTour() : startTour()));

// ---------------------------------------------------------------------------
// Controles: dial, flechas, rueda del mouse, teclado y gestos táctiles.
// Cualquier navegación manual detiene el recorrido.

function navigate(index, atEnd = false) {
  stopTour();
  goTo(index, atEnd);
}

const viewer = setupViewer({ onOpen: stopTour });
setupContactForm();

// ¿El panel bajo el cursor/dedo aún puede desplazarse en esa dirección?
// Si es así, el gesto recorre el panel en lugar de cambiar de fotograma.
function panelCanScroll(target, dy) {
  const panel = target.closest?.('.panel, .hero');
  if (!panel || panel.scrollHeight <= panel.clientHeight + 1) return false;
  return dy > 0
    ? panel.scrollTop + panel.clientHeight < panel.scrollHeight - 1
    : panel.scrollTop > 0;
}

dial.buttons.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(Number(btn.dataset.index));
  });
});

prevBtn.addEventListener('click', () => navigate(current - 1));
nextBtn.addEventListener('click', () => navigate(current + 1));

// Al retroceder, el fotograma anterior aparece por su final para seguir recorriéndolo hacia atrás
const edge = createEdgeGuard(
  { [-1]: document.querySelector('.edge-hint--prev'), 1: document.querySelector('.edge-hint--next') },
  (dir) => navigate(current + dir, dir < 0),
);

const wheel = { quietUntil: 0 };
addEventListener('wheel', (e) => {
  if (e.ctrlKey || viewer.isOpen() || busy) return;
  const now = performance.now();
  // Tras cambiar de fotograma, la inercia se ignora mientras la rueda siga girando
  if (now < wheel.quietUntil) {
    wheel.quietUntil = now + 150;
    return;
  }
  // Primero se recorre el fotograma (a lo alto si hiciera falta, luego a lo ancho)
  if (panelCanScroll(e.target, e.deltaY) || pan.wheel(e)) {
    edge.clear();
    return;
  }
  // Ya no queda nada por ver: se para en el borde y avisa antes de cambiar de fotograma
  const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  const dir = Math.sign(delta);
  if (!dir || !strips[current + dir]) return;
  edge.push(dir, Math.abs(delta) * (e.deltaMode === 1 ? 40 : 1));
}, { passive: true });

addEventListener('keydown', (e) => {
  if (viewer.isOpen() || e.target.closest('input, textarea, select, [contenteditable]')) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    if (pan.step(e.key === 'ArrowRight' ? 1 : -1)) e.preventDefault();
    return;
  }
  const keys = {
    ArrowDown: current + 1,
    PageDown: current + 1,
    ArrowUp: current - 1,
    PageUp: current - 1,
    Home: 0,
    End: strips.length - 1,
  };
  if (e.key in keys) {
    e.preventDefault();
    navigate(keys[e.key]);
  }
});

const touch = { y: null, canUp: false, canDown: false };
stage.addEventListener('touchstart', (e) => {
  touch.y = e.touches[0].clientY;
  touch.canUp = panelCanScroll(e.target, -1);
  touch.canDown = panelCanScroll(e.target, 1);
}, { passive: true });
stage.addEventListener('touchend', (e) => {
  if (touch.y === null) return;
  const dy = touch.y - e.changedTouches[0].clientY;
  touch.y = null;
  if (Math.abs(dy) < 50 || (dy > 0 ? touch.canDown : touch.canUp)) return;
  navigate(current + Math.sign(dy));
}, { passive: true });

addEventListener('hashchange', () => {
  const i = strips.findIndex((s) => `#${s.id}` === location.hash);
  if (i !== -1) navigate(i);
});

addEventListener('resize', () => {
  pan.measure();
  if (!busy) track.style.transform = trackY(current);
});
document.fonts.ready.then(() => pan.measure());

// ---------------------------------------------------------------------------
// Arranque: la cámara empieza alejada y se acerca al primer fotograma

pan.measure();
render(current);
strips[current].classList.remove('is-revealed');

if (reduceMotion.matches) {
  strips[current].classList.add('is-revealed');
} else {
  busy = true;
  stage.classList.add('is-moving', 'is-pulled');
  camera.style.transform = `scale(${ZOOM_LEJOS})`;
  await wait(250);
  await zoomIn(current, 500);
  finish();
}
