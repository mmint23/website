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
import { showLink } from '../../../gemeinsam/link.js';
import { tafelOffen } from '../../../gemeinsam/tafel/index.js';
import { initTafel3d, syncTafel } from './tafel3d.js';
import { initLaser } from './laser.js';
import { initLiveSteuerung } from './live.js';
import { zuschauen } from '../../../gemeinsam/live/live.js';

initUi();
document.getElementById('linkBtn').addEventListener('click', () => showLink());
initTafel3d();   // vor initLaser: legt den Laser-Knopf in der Werkzeugleiste der Tafel an
initLaser();
initLiveSteuerung();   // nach initTafel3d: das Bedienfeld kommt in die Abgabeleiste der Lehrerseite
resetView();

const SLOW_MOTION = 0.25;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (tafelOffen()) return;   // Tafel groß geöffnet: Szene ruht, damit das Zeichnen flüssig bleibt
  // Live-Steuerung: Zeigt dieses Gerät nur an, rechnet es nicht selbst – der Zustand kommt vom anderen Gerät
  const nurAnzeigen = zuschauen();
  if (!nurAnzeigen) animateFlip(dt);
  if (!state.paused && !nurAnzeigen) stepPhysics(state.slowMotion ? dt * SLOW_MOTION : dt);
  syncApparatus();
  syncMeter();
  syncLed();
  syncLamp();
  syncExplain(dt);
  syncTafel();
  updateValue();
  updateHoldSlider();
  if (nurAnzeigen) {
    // Ansicht des steuernden Geräts übernehmen
    camera.position.fromArray(state.view.position);
    controls.target.fromArray(state.view.target);
    camera.lookAt(controls.target);
  } else {
    controls.update();
    camera.position.toArray(state.view.position);
    controls.target.toArray(state.view.target);
  }
  renderer.render(scene, camera);
});
