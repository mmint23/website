// ------------------------------------------------------------------
// Live-Steuerung (gemeinsamer Baustein gemeinsam/live/): ein Schülergerät steuert die Simulation am Beamer.
// Gespiegelt werden die Einstellungen (state.js), Lage und Drehung von Magnet und Spule (physik.js), die Lagen der
// Messgeräte, lose bzw. gerade gezogene Stecker (kabel.js) und die Ansicht. Spannung, Zeiger, Multimeter und
// Diagramme rechnet das zuschauende Gerät aus den (geglätteten) Lagen selbst – so passen sie genau zur Bewegung.
// ------------------------------------------------------------------
import { initLive, zuschauen, zustandUebernehmen } from '../../../gemeinsam/live/live.js';
import { state } from './state.js';
import { bodies, fluxChanged, multimeterRefresh } from './physik.js';
import { meterLagen, meterLagenSetzen } from './messgeraet.js';
import { kabelDaten, kabelUebernehmen, steckerAbbrechen } from './kabel.js';
import { updateUi } from './bedienfeld.js';
import { cancelDrag } from './ziehen.js';
import { camera, controls } from './szene.js';

const TEILE = ['magnet', 'coil'];

// Stetige Größen, die beim Zuschauen zwischen zwei empfangenen Zuständen geglättet werden
const GLAETTEN = [
  ...TEILE.flatMap(name => ['x', 'y', 'angle'].map(k => `bodies.${name}.${k}`)),
  'view.position', 'view.target', 'meter.pointer', 'meter.qual', 'meter.multi',
  'kabel.lose.red', 'kabel.lose.black', 'kabel.gezogen.punkt',
];

// Einstellungen, bei deren Änderung der Fluss springt, ohne dass sich etwas bewegt (kein Spannungsstoß)
const SPRUNG = ['northRight', 'strength', 'turns', 'lineModel'];

function lesen() {
  return {
    state: structuredClone(state),
    bodies: Object.fromEntries(TEILE.map(name => [name, { x: bodies[name].x, y: bodies[name].y, angle: bodies[name].angle }])),
    meter: meterLagen(),
    kabel: kabelDaten(),
    view: { position: camera.position.toArray(), target: controls.target.toArray() },
  };
}

let ansicht = null;   // empfangene Ansicht, wird in jedem Bild übernommen (ansichtUebernehmen)
function schreiben(daten) {
  const vorher = JSON.stringify(state);
  const sprung = SPRUNG.some(k => daten.state[k] !== state[k]);
  const stecker = JSON.stringify(daten.state.plugs) !== JSON.stringify(state.plugs) || daten.state.multiMode !== state.multiMode;
  zustandUebernehmen(state, daten.state);
  // Lagen direkt setzen, Ziele gleich mit: Die Physik bewegt dann nichts selbst, rechnet aber Spannung und Zeiger
  for (const name of TEILE) {
    const { x, y, angle } = daten.bodies[name];
    Object.assign(bodies[name], { x, y, angle, target: x, yTarget: y, angleTarget: angle });
  }
  meterLagenSetzen(daten.meter);
  kabelUebernehmen(daten.kabel);
  ansicht = daten.view;
  if (sprung) fluxChanged();
  if (stecker) multimeterRefresh();
  if (JSON.stringify(state) !== vorher) updateUi();
}

// Beim Zuschauen jedes Bild: Kamera wie beim steuernden Gerät
export function ansichtUebernehmen() {
  if (!ansicht) return;
  camera.position.fromArray(ansicht.position);
  controls.target.fromArray(ansicht.target);
  camera.lookAt(controls.target);
}

// Wechsel zwischen Zuschauen und Steuern: laufendes Ziehen beenden
function beiWechsel(zuschauen) {
  cancelDrag();
  steckerAbbrechen();
  if (!zuschauen) ansicht = null;
}

export { zuschauen };
export function initLiveSteuerung() {
  initLive({ id: 'induktion-spule', lesen, schreiben, beiWechsel, glaetten: GLAETTEN });
}
