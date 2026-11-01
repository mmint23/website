// ------------------------------------------------------------------
// Live-Steuerung (gemeinsamer Baustein gemeinsam/live/): ein Schülergerät steuert die Simulation am Beamer.
// Gespiegelt werden die Einstellungen (state.js), die Bewegung (Drehung, Elektronen, Zeiger, Glühdraht, Umbau
// Leiterschleife ↔ Spule, Windrotor, Simulationszeit für das U-t-Diagramm), die Ansicht und die Tafel des steuernden
// Geräts (offen/zu, Seite, Striche; gemeinsam/tafel/) samt seinen Laserpointer-Spuren (Szene und Tafel; gemeinsam/laser/). Eigene Tafel und Abgaben des zuschauenden Geräts bleiben
// unberührt. Der Schülermodus gehört zum Gerät und wird nicht übertragen; ist er an, öffnet „Steuerung abgeben“ das
// Schülergerät im Schülermodus.
// ------------------------------------------------------------------
import { initLive, zuschauen, zustandUebernehmen } from '../../../gemeinsam/live/live.js';
import { tafelLiveDaten, fremdeTafel } from '../../../gemeinsam/tafel/index.js';
import { laserDaten, fremdeLaser } from '../../../gemeinsam/laser/laser.js';
import { state, modus } from './state.js';
import { rotor, electrons, needle, lamp, spule, park, clock, endCrank } from './physik.js';
import { applyMagnetPoles, setRingsInstant } from './modell.js';
import { setMeterVisible } from './messgeraet.js';
import { updateUi } from './bedienfeld.js';
import { clearPlot } from './diagramm.js';
import { camera, controls, setTable } from './szene.js';

// Stetige Größen, die beim Zuschauen zwischen zwei empfangenen Zuständen geglättet werden
const GLAETTEN = [
  'rotor.phi', 'rotor.omega', 'electrons.shift', 'needle.pos', 'needle.vel', 'lamp.heat', 'spule.fortschritt',
  'park.rpm', 'clock.t', 'view.position', 'view.target',
];

function lesen() {
  return {
    state: structuredClone(state),
    rotor: { phi: rotor.phi, omega: rotor.omega },
    electrons: { shift: electrons.shift },
    needle: { pos: needle.pos, vel: needle.vel },
    lamp: { heat: lamp.heat },
    spule: { fortschritt: spule.fortschritt },
    park: { rpm: park.rpm },
    clock: { t: clock.t },
    view: { position: camera.position.toArray(), target: controls.target.toArray() },
    tafel: tafelLiveDaten(),
    laserSpuren: laserDaten(),   // Laserpointer an/aus bleibt auf jedem Gerät für sich
  };
}

let ansicht = null;   // empfangene Ansicht, wird in jedem Bild übernommen (ansichtUebernehmen)
function schreiben(daten) {
  const vorher = { ...state };
  if (daten.clock.t < clock.t - 0.5) clearPlot();   // anderes Gerät, andere Uhr: Diagramm neu beginnen
  zustandUebernehmen(state, daten.state);
  for (const [ziel, quelle] of [[rotor, daten.rotor], [electrons, daten.electrons], [needle, daten.needle],
    [lamp, daten.lamp], [spule, daten.spule], [park, daten.park], [clock, daten.clock]]) Object.assign(ziel, quelle);
  ansicht = daten.view;
  if (daten.tafel) fremdeTafel(daten.tafel);
  fremdeLaser(daten.laserSpuren);
  // Teile, die sonst setExplain bzw. die Knöpfe nachziehen (ohne den Zustand dabei zurückzusetzen)
  if (vorher.explain !== state.explain) setRingsInstant();   // Schleifringe an/ab animiert syncModel selbst
  if (vorher.explain !== state.explain || vorher.display !== state.display) {
    setMeterVisible(!state.explain);
    setTable(!state.explain);
  }
  if (vorher.northUp !== state.northUp) applyMagnetPoles();
  if (Object.keys(state).some(k => vorher[k] !== state[k])) updateUi();
}

// Beim Zuschauen jedes Bild: Kamera wie beim steuernden Gerät
export function ansichtUebernehmen() {
  if (!ansicht) return;
  camera.position.fromArray(ansicht.position);
  controls.target.fromArray(ansicht.target);
  camera.lookAt(controls.target);
}

// Wechsel zwischen Zuschauen und Steuern: laufendes Kurbeln beenden; wer wieder steuert, hat seine eigene Tafel
function beiWechsel(zuschauen) {
  endCrank();
  fremdeLaser([]);
  if (!zuschauen) {
    ansicht = null;
    fremdeTafel(null);
  }
}

export { zuschauen };
export function initLiveSteuerung() {
  initLive({
    id: 'generator-leiterschleife', lesen, schreiben, beiWechsel, glaetten: GLAETTEN,
    sperren: '#scene, .panel, .popup, .hint, .tafel-overlay',
    steuernAngaben: () => (modus.schueler ? { schueler: '' } : {}),
  });
}
