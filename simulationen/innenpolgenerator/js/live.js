// ------------------------------------------------------------------
// Live-Steuerung (gemeinsamer Baustein gemeinsam/live/): ein Schülergerät steuert die Simulation am Beamer.
// Gespiegelt werden die Einstellungen (state.js), die Bewegung (Drehung des Magneten, Zeiger, Glühdraht, Windrotor,
// Simulationszeit für das U–t-Diagramm) und die Ansicht. Feldlinien, B-Pfeile, Spannung und LED rechnet das
// zuschauende Gerät aus der übernommenen Stellung selbst. Dazu kommen die Laserpointer-Spuren des steuernden Geräts
// (gemeinsam/laser/); an/aus bleibt auf jedem Gerät für sich.
// ------------------------------------------------------------------
import { initLive, zuschauen, zustandUebernehmen } from '../../../gemeinsam/live/live.js';
import { state } from './state.js';
import { rotor, needle, lamp, park, clock, endCrank } from './physik.js';
import { updateUi } from './bedienfeld.js';
import { clearPlot } from './diagramm.js';
import { camera, controls } from './szene.js';
import { laserDaten, fremdeLaser } from '../../../gemeinsam/laser/laser.js';

// Stetige Größen, die beim Zuschauen zwischen zwei empfangenen Zuständen geglättet werden
const GLAETTEN = [
  'rotor.phi', 'rotor.omega', 'needle.pos', 'needle.vel', 'lamp.heat', 'park.rpm', 'clock.t',
  'view.position', 'view.target',
];

function lesen() {
  return {
    state: structuredClone(state),
    rotor: { phi: rotor.phi, omega: rotor.omega },
    needle: { pos: needle.pos, vel: needle.vel },
    lamp: { heat: lamp.heat },
    park: { rpm: park.rpm },
    clock: { t: clock.t },
    view: { position: camera.position.toArray(), target: controls.target.toArray() },
    laserSpuren: laserDaten(),
  };
}

let ansicht = null;   // empfangene Ansicht, wird in jedem Bild übernommen (ansichtUebernehmen)
function schreiben(daten) {
  const vorher = JSON.stringify(state);
  if (daten.clock.t < clock.t - 0.5) clearPlot();   // anderes Gerät, andere Uhr: Diagramm neu beginnen
  zustandUebernehmen(state, daten.state);
  for (const [ziel, quelle] of [[rotor, daten.rotor], [needle, daten.needle], [lamp, daten.lamp], [park, daten.park],
    [clock, daten.clock]]) Object.assign(ziel, quelle);
  ansicht = daten.view;
  fremdeLaser(daten.laserSpuren);
  if (JSON.stringify(state) !== vorher) updateUi();   // Bedienfelder (auch Erklärmodus: alles links) nachziehen
}

// Beim Zuschauen jedes Bild: Kamera wie beim steuernden Gerät
export function ansichtUebernehmen() {
  if (!ansicht) return;
  camera.position.fromArray(ansicht.position);
  controls.target.fromArray(ansicht.target);
  camera.lookAt(controls.target);
}

// Wechsel zwischen Zuschauen und Steuern: laufendes Kurbeln beenden
function beiWechsel(zuschauen) {
  endCrank();
  fremdeLaser([]);
  if (!zuschauen) ansicht = null;
}

export { zuschauen };
export function initLiveSteuerung() {
  initLive({ id: 'innenpolgenerator', lesen, schreiben, beiWechsel, glaetten: GLAETTEN });
}
