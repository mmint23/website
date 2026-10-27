// ------------------------------------------------------------------
// Start der Simulation und Render-Schleife
// ------------------------------------------------------------------
import * as THREE from 'three';
import { renderer, scene, camera, controls } from './szene.js';
import { stepPhysics } from './physik.js';
import { syncModel } from './modell.js';
import { syncFeld } from './feldlinien.js';
import { syncMeter, syncCables } from './messgeraet.js';
import { updatePlot } from './diagramm.js';
import { initUi } from './bedienfeld.js';
import './ziehen.js';

initUi();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  stepPhysics(dt);
  syncModel();
  syncFeld();
  syncCables();
  syncMeter();
  updatePlot();
  controls.update();
  renderer.render(scene, camera);
});
