// ------------------------------------------------------------------
// Start der Simulation und Render-Schleife
// ------------------------------------------------------------------
import * as THREE from 'three';
import { renderer, scene, camera, controls } from './szene.js';
import { state } from './state.js';
import { stepPhysics, stepPark } from './physik.js';
import { syncModel } from './modell.js';
import { syncFeld } from './feldlinien.js';
import { syncMeter, syncCables } from './messgeraet.js';
import { syncLed } from './led.js';
import { syncLamp } from './gluehlampe.js';
import { updatePlot } from './diagramm.js';
import { initUi, updateReadout } from './bedienfeld.js';
import './ziehen.js';
import { initLiveSteuerung, zuschauen, ansichtUebernehmen } from './live.js';

initUi();
initLiveSteuerung();   // Live-Steuerung (nur über den Abgabe-Server; sonst unsichtbar)

const SLOW_MOTION = 0.25;
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  // Live-Steuerung: Zeigt dieses Gerät nur an, rechnet es nicht selbst – Bewegung und Ansicht kommen vom anderen
  const nurAnzeigen = zuschauen();
  if (!nurAnzeigen) {
    stepPark(dt);   // Rotor beim Antrieb „Wind“ (Echtzeit, wie in der Leiterschleife)
    if (!state.paused) stepPhysics(state.slowMotion ? dt * SLOW_MOTION : dt);
  }
  syncModel();
  syncFeld();
  syncCables();
  syncMeter();
  syncLed();
  syncLamp();
  updateReadout();
  updatePlot();
  if (nurAnzeigen) ansichtUebernehmen();
  else controls.update();
  renderer.render(scene, camera);
});
