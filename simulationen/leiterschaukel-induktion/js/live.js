// ------------------------------------------------------------------
// Live-Steuerung (gemeinsamer Baustein gemeinsam/live/): ein Schülergerät steuert die Leiterschaukel am Beamer.
// Gespiegelt wird der ganze Zustand aus state.js (außer dem Laserpointer, der bleibt auf jedem Gerät für sich).
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

// Felder, bei deren Änderung der Aufbau neu entsteht
const AUFBAU = ['explain', 'setup', 'longMagnet', 'display', 'cablesSwapped'];
// einfache Einstellungen (Zahlen, Wahrheitswerte, Texte) – ändert sich eine, wird das Bedienfeld nachgezogen
const einstellungen = () => JSON.stringify(Object.entries(state).filter(([, w]) => typeof w !== 'object'));

function lesen() {
  const { laser, ...daten } = zustandAlsDaten();
  return daten;
}

function schreiben(daten) {
  const vorher = { ...state, flip: { ...state.flip } };
  const einstellungenVorher = einstellungen();
  delete daten.laser;
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
  if (!zuschauen) {
    if (swing.dragging) endDrag();
    if (magnetMotion.dragging) endMagnetDrag();
  }
}

export function initLiveSteuerung() {
  initLive({ id: 'leiterschaukel-induktion', lesen, schreiben, beiWechsel });
}
