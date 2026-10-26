// ------------------------------------------------------------------
// Start der Simulation und Render-Schleife
// ------------------------------------------------------------------
import * as THREE from 'three';
import { renderer, scene, camera, controls, resetView } from './szene.js';
import { stepPhysics } from './physik.js';
import { buildApparatus, syncApparatus } from './aufbau.js';
import { updateSupply, buildCables } from './netzgeraet.js';
import { initUi, animateFlip, updateReadout } from './bedienfeld.js';
import { syncHand } from './hand.js';

initUi();
buildApparatus();
buildCables();
updateSupply();
resetView();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  animateFlip(dt);
  stepPhysics(dt);
  syncApparatus();
  syncHand();
  updateReadout();
  controls.update();
  renderer.render(scene, camera);
});
