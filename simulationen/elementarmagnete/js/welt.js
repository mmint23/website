// ------------------------------------------------------------------
// Felder in der Szene: Stabmagnet, Spule, magnetisiertes Eisenstück; Hammerschlag; Zeitschritt
// ------------------------------------------------------------------
import { feldVonPolen, stabmagnetPole, stueckPole, schritt, hammerschlag, magnetisierung } from './modell.js';
import { state, STUECK, MAGNET, SPULE, I_MAX } from './state.js';

/** Lage des Eisenstücks (Mitte) */
export const stueckX = () => (state.modus === 'spule' ? state.kernX : 0);

/** Feld der Spule (innen gleichmäßig, außen vernachlässigt); Stärke bis 1,5 bei 5 A */
export function spulenFeld() {
  return state.modus === 'spule' && state.stromAn ? state.polung * 0.3 * state.strom : 0;
}
const inSpule = (x, y) => Math.abs(x) < SPULE.halb && Math.abs(y) < SPULE.r;

export const magnetPole = () => stabmagnetPole(state.magnetX, state.magnetY, MAGNET.l, state.unten);

/** Äußeres Feld am Ort (Welt) – das, was die Elementarmagnete dreht */
export function aeussereFeld(x, y) {
  if (state.modus === 'streichen') return feldVonPolen(magnetPole(), x, y);
  return inSpule(x, y) ? { bx: spulenFeld(), by: 0 } : { bx: 0, by: 0 };
}

/** Ist der Eisenkern ganz in der Spule? */
export const kernDrin = () => Math.abs(state.kernX) < 0.5;

/**
 * Pole für Feldlinien und Kompass. Streichen: Stabmagnet + Eisenstück.
 * Spule: Spule und Eisenkern zusammen an den Spulenenden (Kern drin), sonst Spule und Kern einzeln.
 */
export function allePole() {
  const { mx } = magnetisierung(state.magnete);
  if (state.modus === 'streichen') return [...magnetPole(), ...stueckPole(0, 0, STUECK.b, mx)];
  const qSpule = 1.2 * spulenFeld();
  // Kern in der Spule: beide wirken zusammen wie ein Magnet mit Polen an den Spulenenden
  const qKern = kernDrin() ? 2.5 * mx : 0;
  const pole = [{ x: SPULE.halb - 0.3, y: 0, q: qSpule + qKern, nx: 1, ny: 0 },
    { x: -SPULE.halb + 0.3, y: 0, q: -(qSpule + qKern), nx: -1, ny: 0 }];
  return kernDrin() ? pole : [...pole, ...stueckPole(stueckX(), 0, STUECK.b, mx)];
}

/** Anteile am Magnetfeld der Spule: Spule allein und zusätzlich durch den Eisenkern (für die Anzeige) */
export function feldAnteile() {
  const { mx } = magnetisierung(state.magnete);
  const spule = Math.abs(1.2 * spulenFeld());
  // Kern drin: Beitrag in Richtung des Spulenfelds (ohne Strom: so stark, wie der Kern selbst magnetisch ist)
  const b = spulenFeld();
  const kern = kernDrin() ? Math.max(0, 2.5 * (b !== 0 ? mx * Math.sign(b) : Math.abs(mx))) : 0;
  return { spule, kern, max: 1.2 * 0.3 * I_MAX + 2.5 };
}

/** Elementarmagnete um dt weiterdrehen (in Teilschritten) */
export function weiter(dt) {
  const n = Math.max(1, Math.ceil(dt / (1 / 120)));
  const x0 = stueckX();
  for (let k = 0; k < n; k++) {
    schritt(state.magnete, (x, y) => aeussereFeld(x + x0, y), dt / n, state.material);
  }
}

export function schlag() {
  hammerschlag(state.magnete);
}
