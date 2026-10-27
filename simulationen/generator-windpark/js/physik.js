// ------------------------------------------------------------------
// Windräder: Drehzahl hängt vom Wind ab, mit Trägheit (ohne Darstellung – lässt sich mit Node testen).
// Das Generator-Modell ist eine eigene Simulation (generator-leiterschleife); dort dreht der Rotor beim Antrieb
// „Wind“ genauso.
// ------------------------------------------------------------------
import { TURBINE } from './config.js';
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
