// ------------------------------------------------------------------
// Start der Simulation und Render-Schleife
// ------------------------------------------------------------------
import * as THREE from 'three';
import { renderer, scene, camera, controls } from './szene.js';
import { state } from './state.js';
import { stepPhysics } from './physik.js';
import { syncModel } from './modell.js';
import { syncMeter, syncCables } from './messgeraet.js';
import { updatePlot } from './diagramm.js';
import { initUi, updateReadout } from './bedienfeld.js';
import './ziehen.js';

initUi();

const SLOW_MOTION = 0.25;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  stepPhysics(state.slowMotion ? dt * SLOW_MOTION : dt);
  syncModel();
  syncCables();
  syncMeter();
  updateReadout();
  updatePlot();
  controls.update();
  renderer.render(scene, camera);
});
