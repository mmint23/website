// ------------------------------------------------------------------
// Start der Simulation und Render-Schleife
// ------------------------------------------------------------------
import * as THREE from 'three';
import { renderer, scene, camera, controls } from './szene.js';
import { stepPhysics } from './physik.js';
import { syncModel } from './modell.js';
import { syncFeld } from './feldlinien.js';
import { syncMeter } from './messgeraet.js';
import { syncCables } from './kabel.js';
import { updatePlot } from './diagramm.js';
import { initUi, updateReadout } from './bedienfeld.js';
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
  updateReadout();
  updatePlot();
  controls.update();
  renderer.render(scene, camera);
});
