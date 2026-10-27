// ------------------------------------------------------------------
// Live-Steuerung (gemeinsamer Baustein gemeinsam/live/): ein Schülergerät steuert die Leiterschaukel am Beamer.
// Gespiegelt wird der ganze Zustand aus state.js (außer Laserpointer an/aus, das bleibt auf jedem Gerät für sich);
// dazu kommen die sichtbaren Laserspuren des steuernden Geräts (laser.js), das andere Gerät zeichnet sie mit.
// Beim Übernehmen werden nur die Teile neu aufgebaut, die sich geändert haben (Versuch, Anzeige, Kabel, Pole).
// ------------------------------------------------------------------
import { initLive, zustandUebernehmen } from '../../../gemeinsam/live/live.js';
import { state, zustandAlsDaten } from './state.js';
import { swing, magnetMotion, endDrag, endMagnetDrag } from './physik.js';
import { applyMagnetPoles, setMagnetOpacity, applySetup } from './aufbau.js';
import { applyDisplay, buildCables, setMeterAngle } from './messgeraet.js';
import { uiAbgleichen } from './bedienfeld.js';
import { cancelDrag } from './ziehen.js';
import { table } from './szene.js';
import { laserDaten, fremdeLaser } from './laser.js';
import { tafelOffen } from '../../../gemeinsam/tafel/index.js';

// Bewegte Größen, die beim Zuschauen zwischen zwei empfangenen Zuständen geglättet werden (alles andere springt)
const GLAETTEN = [
  'swing.theta', 'swing.omega', 'magnetAngle', 'magnetMotion.z', 'magnetMotion.v', 'needle.pos', 'needle.vel',
  'lamp.heat', 'electron.x', 'meterAngle', 'view.position', 'view.target',
];

// Felder, bei deren Änderung der Aufbau neu entsteht
const AUFBAU = ['explain', 'setup', 'longMagnet', 'display', 'cablesSwapped'];
// einfache Einstellungen (Zahlen, Wahrheitswerte, Texte) – ändert sich eine, wird das Bedienfeld nachgezogen
const einstellungen = () => JSON.stringify(Object.entries(state).filter(([, w]) => typeof w !== 'object'));

// Laserpointer: Ein/Aus bleibt auf jedem Gerät für sich, die sichtbaren Spuren gehen mit (nicht bei offener Tafel –
// die zeigt jedes Gerät für sich, am anderen Gerät läge die Spur sonst auf der Szene)
function lesen() {
  const { laser, ...daten } = zustandAlsDaten();
  daten.laserSpuren = tafelOffen() ? [] : laserDaten();
  return daten;
}

function schreiben(daten) {
  const vorher = { ...state, flip: { ...state.flip } };
  const einstellungenVorher = einstellungen();
  const { laserSpuren } = daten;
  delete daten.laser;
  delete daten.laserSpuren;
  fremdeLaser(laserSpuren);
  zustandUebernehmen(state, daten);
  if (AUFBAU.some(k => vorher[k] !== state[k])) {
    applyDisplay();
    table.visible = !state.explain;
    applySetup();
    buildCables();
  }
  if (vorher.meterAngle !== state.meterAngle) setMeterAngle(state.meterAngle);
  if (vorher.northUp !== state.northUp) applyMagnetPoles();
  if (state.flip.active || vorher.flip.active) setMagnetOpacity(state.flip.active ? Math.abs(1 - 2 * state.flip.t) : 1);
  if (einstellungen() !== einstellungenVorher) uiAbgleichen();
}

// Wechsel zwischen Zuschauen und Steuern: laufendes Ziehen beenden; wer wieder steuert, hält nichts mehr fest,
// was zuvor das andere Gerät gezogen hat
function beiWechsel(zuschauen) {
  cancelDrag();
  fremdeLaser([]);
  if (!zuschauen) {
    if (swing.dragging) endDrag();
    if (magnetMotion.dragging) endMagnetDrag();
  }
}

export function initLiveSteuerung() {
  initLive({ id: 'leiterschaukel-induktion', lesen, schreiben, beiWechsel, glaetten: GLAETTEN });
}
