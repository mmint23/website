// ------------------------------------------------------------------
// Schaukel (und beim Versuch „Magnet auf dem Tisch“ den Magneten) mit Maus oder Finger ziehen;
// das Messgerät durch seitliches Ziehen um die senkrechte Achse drehen.
// Greift man daneben, dreht sich wie gewohnt die Ansicht.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { SWING, axisHeight } from './config.js';
import { state } from './state.js';
import { startDrag, dragTo, endDrag, magnetMotion, startMagnetDrag, dragMagnetTo, endMagnetDrag } from './physik.js';
import { grabTargets, magnetTargets } from './aufbau.js';
import { meterTargets, meterAngle, setMeterAngle } from './messgeraet.js';
import { renderer, camera, controls } from './szene.js';

const canvas = renderer.domElement;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const plane = new THREE.Plane();
const hit = new THREE.Vector3();
// Laufender Zug: was gezogen wird ('swing' | 'magnet' | 'meter'), Zeiger-ID und Startwerte
const METER_TURN = 0.01;   // Drehung des Messgeräts in rad pro Pixel
let drag = null;

function setRay(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
}

// Was liegt unter dem Finger? Der Magnet lässt sich nur auf dem Tisch verschieben.
function pick() {
  const targets = [...grabTargets, ...(state.explain || state.display !== 'meter' ? [] : meterTargets), ...(state.setup === 'tisch' ? magnetTargets : [])];
  const first = raycaster.intersectObjects(targets, false)[0];
  if (!first) return null;
  const kind = magnetTargets.includes(first.object) ? 'magnet' : meterTargets.includes(first.object) ? 'meter' : 'swing';
  return { kind, point: first.point };
}

// Schaukel: Winkel, bei dem sie durch den Punkt unter dem Finger geht (Schwingebene x = const)
// Magnet: Punkt in der waagrechten Ebene, in der er gegriffen wurde
function pointerOnPlane() {
  return raycaster.ray.intersectPlane(plane, hit);
}
const pivotY = () => axisHeight(state.setup, state.longMagnet) + SWING.LENGTH;
const swingAngle = p => Math.atan2(p.z, pivotY() - p.y);

// Erfassungsphase: läuft vor den OrbitControls, die dann für diesen Zug abgeschaltet werden
canvas.addEventListener('pointerdown', event => {
  if (drag || state.paused) return;   // in der Pause bleibt alles stehen
  setRay(event);
  const target = pick();
  if (!target) return;
  drag = { kind: target.kind, id: event.pointerId };
  controls.enabled = false;
  canvas.setPointerCapture(event.pointerId);
  canvas.style.cursor = 'grabbing';
  if (target.kind === 'meter') {
    Object.assign(drag, { startX: event.clientX, startAngle: meterAngle() });
  } else if (target.kind === 'swing') {
    plane.set(new THREE.Vector3(1, 0, 0), -target.point.x);
    startDrag(swingAngle(target.point));
  } else {
    plane.set(new THREE.Vector3(0, 1, 0), -target.point.y);
    Object.assign(drag, { startZ: magnetMotion.z, startHitZ: target.point.z });
    startMagnetDrag(magnetMotion.z);
  }
}, { capture: true });

canvas.addEventListener('pointermove', event => {
  setRay(event);
  if (!drag || event.pointerId !== drag.id) {
    if (!drag && event.pointerType === 'mouse') canvas.style.cursor = pick() ? 'grab' : '';
    return;
  }
  if (drag.kind === 'meter') {
    setMeterAngle(drag.startAngle + (event.clientX - drag.startX) * METER_TURN);
    return;
  }
  const p = pointerOnPlane();
  if (!p) return;
  if (drag.kind === 'swing') dragTo(swingAngle(p));
  else dragMagnetTo(drag.startZ + p.z - drag.startHitZ);
});

function release(event) {
  if (!drag || event.pointerId !== drag.id) return;
  if (drag.kind === 'swing') endDrag(); else if (drag.kind === 'magnet') endMagnetDrag();
  drag = null;
  controls.enabled = true;
  canvas.style.cursor = '';
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);

// Laufenden Zug abbrechen (z. B. beim Wechsel des Versuchs)
export function cancelDrag() {
  if (!drag) return;
  endDrag();
  endMagnetDrag();
  drag = null;
  controls.enabled = true;
  canvas.style.cursor = '';
}
