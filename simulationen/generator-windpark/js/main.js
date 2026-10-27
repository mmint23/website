// ------------------------------------------------------------------
// Start der Simulation und Render-Schleife: Windpark oder Wohnzimmer im Dorf. Generator-Modell und
// Innenpolgenerator sind eigene Simulationen (Seitenwechsel, uebergang.js).
// ------------------------------------------------------------------
import * as THREE from 'three';
import { renderer, camera, controls } from './szene.js';
import { state } from './state.js';
import { stepPark } from './physik.js';
import { parkScene, syncPark } from './landschaft.js';
import { initUi, updateParkStatus } from './bedienfeld.js';
import { updateTransition } from './uebergang.js';
import { raumScene, syncRaum } from './raum.js';

initUi();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  stepPark(dt);
  updateTransition(dt);
  controls.update();
  updateParkStatus();
  if (state.view === 'park') {
    syncPark(dt, camera);
    renderer.render(parkScene, camera);
  } else {
    syncRaum(dt);
    renderer.render(raumScene, camera);
  }
});
