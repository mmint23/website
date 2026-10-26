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

initUi();

const SLOW_MOTION = 0.25;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
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
