// Tope en el borde del fotograma: antes de cambiar de fotograma con la rueda del mouse,
// el borde se oscurece y avisa ("Arriba" / "Abajo"). Solo un giro nuevo, después de
// soltar la rueda, cambia de fotograma; así la inercia o un giro de más no lo hacen por error.
const QUIETO = 500; // ms sin girar para dar por terminado el gesto (las muescas lentas llegan cada ~300 ms)
const OLVIDO = 4000; // ms tras los que el aviso se retira solo
const UMBRAL = 60; // px de giro deliberado para pasar de fotograma

/**
 * @param hints   avisos por dirección: { [-1]: elemento de arriba, 1: elemento de abajo }
 * @param onPass  se llama con la dirección (-1 | 1) cuando el usuario confirma el cambio
 */
export function createEdgeGuard(hints, onPass) {
  const state = { dir: 0, armed: false, acc: 0, settle: 0, forget: 0 };

  function clear() {
    clearTimeout(state.settle);
    clearTimeout(state.forget);
    Object.assign(state, { dir: 0, armed: false, acc: 0 });
    Object.values(hints).forEach((el) => el.classList.remove('is-on', 'is-armed'));
  }

  /** Giro de rueda contra el borde, en dirección `dir`, de `amount` px. */
  function push(dir, amount) {
    if (state.dir !== dir) {
      clear();
      state.dir = dir;
      hints[dir].classList.add('is-on');
    }
    clearTimeout(state.forget);
    state.forget = setTimeout(clear, OLVIDO);

    // Mientras la rueda siga girando (o por inercia) solo se avisa; se arma al detenerse
    if (!state.armed) {
      clearTimeout(state.settle);
      state.settle = setTimeout(() => {
        state.armed = true;
        hints[dir].classList.add('is-armed');
      }, QUIETO);
      return;
    }

    state.acc += amount;
    if (state.acc >= UMBRAL) {
      clear();
      onPass(dir);
    }
  }

  return { push, clear };
}
