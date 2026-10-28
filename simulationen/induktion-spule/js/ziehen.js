// ------------------------------------------------------------------
// Mit Maus oder Finger: Stecker an die Buchsen ziehen (kabel.js), Drehschalter des Multimeters antippen, Magnet
// und Spule entlang der gemeinsamen Achse verschieben – in dieser Reihenfolge, wenn mehreres unter dem Finger
// liegt, danach das Messgerät (in seiner Ebene verschieben). Greift man daneben, dreht sich wie gewohnt die
// Ansicht. Magnet und Spule werden auf einer Ebene gerechnet, die die Achse enthält und möglichst quer zur
// Blickrichtung steht – so folgen sie dem Finger aus jeder Blickrichtung. Mit state.freeMove (in der Simulation
// immer) geht es auch nach oben und unten: dann auf der Bildebene z = 0 (schaut man fast von oben oder unten
// darauf, nur entlang der Achse).
// ------------------------------------------------------------------
import * as THREE from 'three';
import { MULTI_MODES } from './config.js';
import { state } from './state.js';
import { bodies, startDrag, dragTo, endDrag, multimeterRefresh } from './physik.js';
import { magnetTarget, coilTarget } from './modell.js';
import { multiKnob, updateMeterFace, meterGroup, moveMeter } from './messgeraet.js';
import { steckerUnter, steckerGreifen, steckerZiehen, steckerLoslassen } from './kabel.js';
import { renderer, camera, controls } from './szene.js';

const canvas = renderer.domElement;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const plane = new THREE.Plane();
const hit = new THREE.Vector3(), blick = new THREE.Vector3();
const ZIELE = [[magnetTarget, 'magnet'], [coilTarget, 'coil']];
let aktiv = null;   // { id, name, versatz } bzw. { id, stecker } bzw. { id, geraet: true, versatz }

function setRay(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
}

// Lage unter dem Finger { x, y } (y nur, wenn auch nach oben und unten verschoben werden darf), oder null.
// hoehe: y des gezogenen Teils (die Ebene für das Ziehen entlang der Achse geht durch das Teil)
const Z_EBENE = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
function lageUnterFinger(hoehe) {
  camera.getWorldDirection(blick);
  if (state.freeMove && Math.abs(blick.z) > 0.3) {
    return raycaster.ray.intersectPlane(Z_EBENE, hit) ? { x: hit.x, y: hit.y } : null;
  }
  blick.x = 0;   // Ebenennormale senkrecht zur Achse
  if (blick.lengthSq() < 1e-6) blick.set(0, 0, 1);
  plane.setFromNormalAndCoplanarPoint(blick.normalize(), new THREE.Vector3(0, hoehe, 0));
  return raycaster.ray.intersectPlane(plane, hit) ? { x: hit.x } : null;
}

// Was liegt unter dem Finger? Der Magnet hat Vorrang: Steckt er in der Spule, greift man ihn dort (die Spule
// dann außerhalb des Magneten, z. B. an den Flanschen)
function gegriffen() {
  const getroffen = new Set(raycaster.intersectObjects(ZIELE.map(([ziel]) => ziel), false).map(t => t.object));
  return ZIELE.find(([ziel]) => getroffen.has(ziel))?.[1] ?? null;
}

// Messgerät unter dem Finger? Gezogen wird es auf der Ebene durch das Gerät parallel zur Bildebene
const geraetEbene = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const amGeraet = () => raycaster.intersectObject(meterGroup(), true).length > 0;
function geraetUnterFinger() {
  geraetEbene.constant = -meterGroup().position.z;
  return raycaster.ray.intersectPlane(geraetEbene, hit) ? { x: hit.x, y: hit.y } : null;
}

// Drehschalter des Multimeters unter dem Finger?
const amSchalter = () => state.meter === 'multi' && raycaster.intersectObject(multiKnob, true).length > 0;

function festhalten(event) {
  controls.enabled = false;
  canvas.setPointerCapture(event.pointerId);
  canvas.style.cursor = 'grabbing';
}

// Erfassungsphase: läuft vor den OrbitControls, die für diesen Zug abgeschaltet werden
canvas.addEventListener('pointerdown', event => {
  if (aktiv) return;
  setRay(event);
  const stecker = steckerUnter(raycaster);
  if (stecker) {
    aktiv = { id: event.pointerId, stecker };
    festhalten(event);
    steckerGreifen(stecker);
    return;
  }
  if (amSchalter()) {   // Antippen: eine Stellung weiter
    event.stopImmediatePropagation();
    state.multiMode = MULTI_MODES[(MULTI_MODES.indexOf(state.multiMode) + 1) % MULTI_MODES.length];
    updateMeterFace();
    multimeterRefresh();
    return;
  }
  const name = gegriffen();
  if (!name && amGeraet()) {
    const lage = geraetUnterFinger();
    if (!lage) return;
    const { position } = meterGroup();
    aktiv = { id: event.pointerId, geraet: true, versatz: { x: position.x - lage.x, y: position.y - lage.y } };
    festhalten(event);
    return;
  }
  const lage = name && lageUnterFinger(bodies[name].y);
  if (!lage) return;
  const body = bodies[name];
  aktiv = { id: event.pointerId, name, versatz: { x: body.x - lage.x, y: lage.y === undefined ? 0 : body.y - lage.y } };
  festhalten(event);
  startDrag(name, body.x, body.y);
}, { capture: true });

canvas.addEventListener('pointermove', event => {
  setRay(event);
  if (!aktiv || event.pointerId !== aktiv.id) {
    if (!aktiv && event.pointerType === 'mouse') {
      canvas.style.cursor = amSchalter() ? 'pointer' : steckerUnter(raycaster) || gegriffen() || amGeraet() ? 'grab' : '';
    }
    return;
  }
  if (aktiv.stecker) {
    steckerZiehen(raycaster, event.clientX, event.clientY, canvas.getBoundingClientRect());
    return;
  }
  if (aktiv.geraet) {
    const lage = geraetUnterFinger();
    if (lage) moveMeter(lage.x + aktiv.versatz.x, lage.y + aktiv.versatz.y);
    return;
  }
  const lage = lageUnterFinger(bodies[aktiv.name].y);
  if (lage) dragTo(aktiv.name, lage.x + aktiv.versatz.x, lage.y === undefined ? undefined : lage.y + aktiv.versatz.y);
});

function loslassen(event) {
  if (!aktiv || event.pointerId !== aktiv.id) return;
  if (aktiv.stecker) steckerLoslassen();
  else if (aktiv.name) endDrag(aktiv.name);
  aktiv = null;
  controls.enabled = true;
  canvas.style.cursor = '';
}
canvas.addEventListener('pointerup', loslassen);
canvas.addEventListener('pointercancel', loslassen);

// Laufendes Ziehen beenden (Live-Steuerung: Wechsel zwischen Steuern und Zuschauen)
export function cancelDrag() {
  if (aktiv?.name) endDrag(aktiv.name);
  aktiv = null;
  controls.enabled = true;
  canvas.style.cursor = '';
}
