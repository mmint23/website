// ------------------------------------------------------------------
// Start und Bildschleife: Elementarmagnete drehen, Eisenkern verschieben, zeichnen
// ------------------------------------------------------------------
import { state } from './state.js';
import { weiter } from './welt.js';
import { initAnsicht, zeichnen } from './ansicht.js';
import { initBedienfeld, anzeigen } from './bedienfeld.js';

initAnsicht();
initBedienfeld();

let zuletzt = performance.now(), textUhr = 0;
function schleife(now) {
  const dt = Math.min(0.05, (now - zuletzt) / 1000);
  zuletzt = now;
  // Eisenkern hinein- bzw. herausschieben
  const d = state.kernZiel - state.kernX;
  state.kernX += Math.sign(d) * Math.min(Math.abs(d), 14 * dt);
  weiter(dt);
  zeichnen(dt);
  textUhr += dt;
  if (textUhr > 0.1) { anzeigen(); textUhr = 0; }
  requestAnimationFrame(schleife);
}
requestAnimationFrame(schleife);
