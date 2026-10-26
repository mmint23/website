// ------------------------------------------------------------------
// Start der Simulation und Render-Schleife
// ------------------------------------------------------------------
import * as THREE from 'three';
import { renderer, scene, camera, controls, resetView } from './szene.js';
import { state } from './state.js';
import { stepPhysics } from './physik.js';
import { syncApparatus } from './aufbau.js';
import { syncMeter } from './messgeraet.js';
import { syncLed } from './led.js';
import { syncLamp } from './gluehlampe.js';
import { initUi, animateFlip, updateValue, updateHoldSlider } from './bedienfeld.js';
import { syncExplain } from './erklaerung.js';
import './ziehen.js';
import { initLink } from './link.js';
import { initTafel, syncTafel, tafelOffen } from './tafel.js';
import { initAbgabe } from './abgabe.js';
import { initLaser } from './laser.js';

initUi();
initLink();
initTafel();
initAbgabe();
initLaser();
resetView();

const SLOW_MOTION = 0.25;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (tafelOffen()) return;   // Tafel groß geöffnet: Szene ruht, damit das Zeichnen flüssig bleibt
  animateFlip(dt);
  if (!state.paused) stepPhysics(state.slowMotion ? dt * SLOW_MOTION : dt);
  syncApparatus();
  syncMeter();
  syncLed();
  syncLamp();
  syncExplain(dt);
  syncTafel();
  updateValue();
  updateHoldSlider();
  controls.update();
  camera.position.toArray(state.view.position);
  controls.target.toArray(state.view.target);
  renderer.render(scene, camera);
});
