// ------------------------------------------------------------------
// Kurbel mit Maus oder Finger drehen. Wer die Kurbel greift, schaltet den Antrieb auf „Kurbel“.
// Greift man daneben, dreht sich wie gewohnt die Ansicht.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { CRANK } from './config.js';
import { state } from './state.js';
import { startCrank, crankTo, endCrank } from './physik.js';
import { crankTargets } from './modell.js';
import { renderer, camera, controls } from './szene.js';

const canvas = renderer.domElement;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -CRANK.X);   // Drehebene der Kurbel
const hit = new THREE.Vector3();
let activeId = null;
let onDriveChange = () => {};

function setRay(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
}

// Winkel des Punkts unter dem Finger um die Welle (gleiche Zählung wie φ: Arm vorne bei φ = 0)
function angleAtPointer() {
  if (!raycaster.ray.intersectPlane(plane, hit)) return null;
  return Math.atan2(-hit.y, hit.z);
}

// Beim Antrieb „Wind“ ist die Kurbel durch den kleinen Rotor ersetzt
const grabbed = () => state.drive !== 'wind' && raycaster.intersectObjects(crankTargets, false).length > 0;

// Erfassungsphase: läuft vor den OrbitControls, die dann für diesen Zug abgeschaltet werden
canvas.addEventListener('pointerdown', event => {
  if (activeId !== null || state.paused || state.view !== 'model') return;   // in der Pause bleibt alles stehen
  setRay(event);
  if (!grabbed()) return;
  activeId = event.pointerId;
  controls.enabled = false;
  canvas.setPointerCapture(event.pointerId);
  canvas.style.cursor = 'grabbing';
  if (state.drive !== 'crank') {
    state.drive = 'crank';
    onDriveChange();
  }
  startCrank(angleAtPointer() ?? 0);
}, { capture: true });

canvas.addEventListener('pointermove', event => {
  setRay(event);
  if (event.pointerId !== activeId) {
    if (activeId === null && event.pointerType === 'mouse') canvas.style.cursor = state.view === 'model' && grabbed() ? 'grab' : '';
    return;
  }
  const angle = angleAtPointer();
  if (angle !== null) crankTo(angle);
});

function release(event) {
  if (event.pointerId !== activeId) return;
  activeId = null;
  endCrank();
  controls.enabled = true;
  canvas.style.cursor = '';
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);

// Rückmeldung an das Bedienfeld, wenn das Greifen den Antrieb umschaltet
export function onCrankGrab(callback) {
  onDriveChange = callback;
}
