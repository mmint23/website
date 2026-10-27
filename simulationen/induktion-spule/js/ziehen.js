// ------------------------------------------------------------------
// Magnet und Spule mit Maus oder Finger entlang der gemeinsamen Achse verschieben. Greift man daneben, dreht
// sich wie gewohnt die Ansicht. Gerechnet wird auf einer Ebene, die die Achse enthält und möglichst quer zur
// Blickrichtung steht – so folgt das Teil dem Finger aus jeder Blickrichtung.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { bodies, startDrag, dragTo, endDrag } from './physik.js';
import { magnetTarget, coilTarget } from './modell.js';
import { renderer, camera, controls } from './szene.js';

const canvas = renderer.domElement;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const plane = new THREE.Plane();
const hit = new THREE.Vector3(), blick = new THREE.Vector3();
const ZIELE = [[magnetTarget, 'magnet'], [coilTarget, 'coil']];
let aktiv = null;   // { id, name, versatz }

function setRay(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
}

// Lage auf der Achse unter dem Finger (x), oder null
function achseUnterFinger() {
  camera.getWorldDirection(blick);
  blick.x = 0;   // Ebenennormale senkrecht zur Achse
  if (blick.lengthSq() < 1e-6) blick.set(0, 0, 1);
  plane.setFromNormalAndCoplanarPoint(blick.normalize(), new THREE.Vector3());
  return raycaster.ray.intersectPlane(plane, hit) ? hit.x : null;
}

// Was liegt unter dem Finger? Der Magnet hat Vorrang: Steckt er in der Spule, greift man ihn dort (die Spule
// dann außerhalb des Magneten, z. B. an den Flanschen)
function gegriffen() {
  const getroffen = new Set(raycaster.intersectObjects(ZIELE.map(([ziel]) => ziel), false).map(t => t.object));
  return ZIELE.find(([ziel]) => getroffen.has(ziel))?.[1] ?? null;
}

// Erfassungsphase: läuft vor den OrbitControls, die für diesen Zug abgeschaltet werden
canvas.addEventListener('pointerdown', event => {
  if (aktiv) return;
  setRay(event);
  const name = gegriffen();
  const x = achseUnterFinger();
  if (!name || x === null) return;
  aktiv = { id: event.pointerId, name, versatz: bodies[name].x - x };
  controls.enabled = false;
  canvas.setPointerCapture(event.pointerId);
  canvas.style.cursor = 'grabbing';
  startDrag(name, bodies[name].x);
}, { capture: true });

canvas.addEventListener('pointermove', event => {
  setRay(event);
  if (!aktiv || event.pointerId !== aktiv.id) {
    if (!aktiv && event.pointerType === 'mouse') canvas.style.cursor = gegriffen() ? 'grab' : '';
    return;
  }
  const x = achseUnterFinger();
  if (x !== null) dragTo(aktiv.name, x + aktiv.versatz);
});

function loslassen(event) {
  if (!aktiv || event.pointerId !== aktiv.id) return;
  endDrag(aktiv.name);
  aktiv = null;
  controls.enabled = true;
  canvas.style.cursor = '';
}
canvas.addEventListener('pointerup', loslassen);
canvas.addEventListener('pointercancel', loslassen);
