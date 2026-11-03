// ------------------------------------------------------------------
// Windräder: Drehzahl hängt vom Wind ab, mit Trägheit (ohne Darstellung – lässt sich mit Node testen).
// Das Generator-Modell ist eine eigene Simulation (generator-leiterschleife); dort dreht der Rotor beim Antrieb
// „Wind“ genauso.
// ------------------------------------------------------------------
import { TURBINE, KRAFTWERK } from './config.js';
import { state } from './state.js';

// Drehzahl der Windräder in U/min (0 unterhalb der Einschaltgeschwindigkeit)
export const park = { rpm: 0 };
export function turbineTargetRpm(wind) {
  if (wind < TURBINE.CUT_IN) return 0;
  if (wind >= TURBINE.RATED) return TURBINE.RPM_RATED;
  return TURBINE.RPM_MIN + (TURBINE.RPM_RATED - TURBINE.RPM_MIN) * (wind - TURBINE.CUT_IN) / (TURBINE.RATED - TURBINE.CUT_IN);
}

// Windräder sind träge: Drehzahl folgt dem Wind verzögert (dt in s, Echtzeit)
export function stepPark(dt) {
  park.rpm += (turbineTargetRpm(state.wind) - park.rpm) * Math.min(1, dt / TURBINE.SPIN_TIME);
  if (park.rpm < 0.05 && turbineTargetRpm(state.wind) === 0) park.rpm = 0;
}

// Kohlekraftwerk: Das Feuer macht Hitze, die Hitze macht aus Wasser Dampf, der Dampf dreht die Turbine und mit ihr den
// Generator (alle Größen 0 … 1, jede folgt der vorigen verzögert). Ohne Feuer kühlt der Kessel ab, es entsteht kein
// Dampf mehr, und Turbine und Generator laufen aus.
export const kraftwerk = { feuer: true, hitze: 1, dampf: 1, drehzahl: 1 };
const folgen = (wert, ziel, zeit, dt) => wert + (ziel - wert) * Math.min(1, dt / zeit);
// Dampf erst, wenn das Wasser heiß genug ist (ab einem Drittel der vollen Hitze, voll ab 90 %)
export const dampfZiel = hitze => Math.min(1, Math.max(0, (hitze - 0.33) / (0.9 - 0.33)));
export function stepKraftwerk(dt) {
  const k = kraftwerk;
  k.hitze = folgen(k.hitze, k.feuer ? 1 : 0, KRAFTWERK.HITZE_ZEIT, dt);
  k.dampf = folgen(k.dampf, dampfZiel(k.hitze), KRAFTWERK.DAMPF_ZEIT, dt);
  k.drehzahl = folgen(k.drehzahl, k.dampf, KRAFTWERK.DREH_ZEIT, dt);
  for (const name of ['hitze', 'dampf', 'drehzahl']) if (k[name] < 0.002) k[name] = 0;
}
