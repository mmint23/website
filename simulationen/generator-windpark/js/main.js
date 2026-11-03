// ------------------------------------------------------------------
// Start der Simulation und Render-Schleife: Windpark (auch beim Blick ins Kohlekraftwerk) oder Wohnzimmer im Dorf. Generator-Modell und
// Innenpolgenerator sind eigene Simulationen (Seitenwechsel, uebergang.js).
// ------------------------------------------------------------------
import * as THREE from 'three';
import { renderer, camera, controls } from './szene.js';
import { state } from './state.js';
import { stepPark, stepKraftwerk } from './physik.js';
import { parkScene, syncPark } from './landschaft.js';
import { initUi, updateParkStatus } from './bedienfeld.js';
import { updateTransition } from './uebergang.js';
import { raumScene, syncRaum } from './raum.js';
import { syncKraftwerk } from './kraftwerk.js';

initUi();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  stepPark(dt);
  stepKraftwerk(dt);
  updateTransition(dt);
  controls.update();
  updateParkStatus();
  if (state.view === 'room') {
    syncRaum(dt);
    renderer.render(raumScene, camera);
  } else {
    syncPark(dt, camera);
    syncKraftwerk(dt, camera);
    renderer.render(parkScene, camera);
  }
});
