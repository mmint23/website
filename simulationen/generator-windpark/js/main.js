// ------------------------------------------------------------------
// Start der Simulation und Render-Schleife
// ------------------------------------------------------------------
import * as THREE from 'three';
import { renderer, scene, camera, controls } from './szene.js';
import { state } from './state.js';
import { stepPhysics, stepPark } from './physik.js';
import { parkScene, syncPark } from './landschaft.js';
import { syncModel } from './modell.js';
import { syncMeter } from './messgeraet.js';
import { updatePlot } from './diagramm.js';
import { initUi, updateHoldSlider, updateParkStatus } from './bedienfeld.js';
import { syncExplain } from './erklaerung.js';
import './ziehen.js';
import { updateTransition } from './uebergang.js';
import { initTafel, oeffneTafel, tafelOffen } from '../../../gemeinsam/tafel/index.js';

initUi();
// Tafel im Erklärmodus: Schleife in fünf Stellungen, darunter ein leeres U-t-Diagramm zum Einzeichnen
// der Sinuskurve; mit Abgabe an die Lehrkraft, wenn die Seite über den Abgabe-Server läuft
initTafel({
  id: 'generator-windpark',
  bild: 'bilder/tafel.svg',
  bildText: 'Leiterschleife zwischen Nord- und Südpol in den Stellungen 0°, 90°, 180°, 270° und 360°, darunter ein leeres U-t-Diagramm',
  seitenverhaeltnis: 1.6,
});
document.getElementById('tafelBtn').addEventListener('click', oeffneTafel);

const SLOW_MOTION = 0.25;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (tafelOffen()) return;   // Tafel groß geöffnet: Szene ruht, damit das Zeichnen flüssig bleibt
  stepPark(dt);
  updateTransition(dt);
  controls.update();
  updateParkStatus();
  if (state.view === 'park') {
    syncPark(dt, camera);
    updatePlot();                // blendet das Diagramm aus
    renderer.render(parkScene, camera);
    return;
  }
  if (!state.paused) stepPhysics(state.slowMotion ? dt * SLOW_MOTION : dt);
  syncModel(state.paused ? 0 : dt);
  syncMeter();
  syncExplain();
  updateHoldSlider();
  updatePlot();
  renderer.render(scene, camera);
});
