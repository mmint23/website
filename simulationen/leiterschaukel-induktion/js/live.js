// ------------------------------------------------------------------
// Live-Steuerung (gemeinsamer Baustein gemeinsam/live/): ein Schülergerät steuert die Leiterschaukel am Beamer.
// Gespiegelt wird der ganze Zustand aus state.js (außer Laserpointer an/aus, das bleibt auf jedem Gerät für sich);
// dazu kommen die sichtbaren Laserspuren des steuernden Geräts (gemeinsam/laser/), das andere Gerät zeichnet sie mit, und
// die Tafel des steuernden Geräts (offen/zu, Seite, Striche; gemeinsam/tafel/). Die eigene Tafel und die Abgaben des
// zuschauenden Geräts bleiben dabei unberührt; steuert es wieder, ist alles wie vorher.
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
import { laserDaten, fremdeLaser } from '../../../gemeinsam/laser/laser.js';
import { tafelLiveDaten, fremdeTafel } from '../../../gemeinsam/tafel/index.js';

// Bewegte Größen, die beim Zuschauen zwischen zwei empfangenen Zuständen geglättet werden (alles andere springt)
const GLAETTEN = [
  'swing.theta', 'swing.omega', 'magnetAngle', 'magnetMotion.z', 'magnetMotion.v', 'needle.pos', 'needle.vel',
  'lamp.heat', 'electron.x', 'meterAngle', 'view.position', 'view.target',
];

// Felder, bei deren Änderung der Aufbau neu entsteht
const AUFBAU = ['explain', 'setup', 'longMagnet', 'display', 'cablesSwapped'];
// einfache Einstellungen (Zahlen, Wahrheitswerte, Texte) – ändert sich eine, wird das Bedienfeld nachgezogen
const einstellungen = () => JSON.stringify(Object.entries(state).filter(([, w]) => typeof w !== 'object'));

// Laserpointer: Ein/Aus bleibt auf jedem Gerät für sich, die sichtbaren Spuren gehen mit – auf der Szene wie auf der
// Tafel (gemeinsam/laser/)
function lesen() {
  const daten = zustandAlsDaten();
  daten.laserSpuren = laserDaten();
  daten.tafel = tafelLiveDaten();
  return daten;
}

function schreiben(daten) {
  const vorher = { ...state, flip: { ...state.flip } };
  const einstellungenVorher = einstellungen();
  const { laserSpuren, tafel } = daten;
  delete daten.laserSpuren;
  delete daten.tafel;
  fremdeLaser(laserSpuren);
  if (tafel) fremdeTafel(tafel);
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
    fremdeTafel(null);   // wieder die eigene Tafel (bzw. die Abgabe, die vorher offen war)
    if (swing.dragging) endDrag();
    if (magnetMotion.dragging) endMagnetDrag();
  }
}

export function initLiveSteuerung() {
  // Beim Zuschauen auch die Tafel sperren (Laserpointer in ihrer Werkzeugleiste bleibt bedienbar: live-frei)
  initLive({
    id: 'leiterschaukel-induktion', lesen, schreiben, beiWechsel, glaetten: GLAETTEN,
    sperren: '#scene, .panel, .popup, .hint, .tafel-overlay',
  });
}
