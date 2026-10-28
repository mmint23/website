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
import { initLiveSteuerung, zuschauen, ansichtUebernehmen } from './live.js';

initUi();
initLiveSteuerung();   // Live-Steuerung (nur über den Abgabe-Server; sonst unsichtbar)

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
  // Live-Steuerung: Beim Zuschauen kommen Lagen und Ansicht vom steuernden Gerät (live.js); die Physik rechnet
  // daraus nur Spannung, Zeiger und Diagramme
  if (zuschauen()) ansichtUebernehmen();
  else controls.update();
  renderer.render(scene, camera);
});
