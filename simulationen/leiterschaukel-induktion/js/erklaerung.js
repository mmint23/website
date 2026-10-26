// ------------------------------------------------------------------
// Erklärmodus „Elektron im Leiter“
// Ein (stark vergrößertes) Elektron sitzt im durchsichtigen Stab und bewegt sich mit ihm durch das Magnetfeld.
// Pfeile am Elektron: Geschwindigkeit v des Leiters (grün), Lorentzkraft F_L auf das Elektron (rot);
// das Magnetfeld B zeigen die Feldlinien im Polspalt (aufbau.js). Daneben eine rechte Hand zur Drei-Finger-Regel: Daumen v (Bewegung der positiven Ladungen
// mit dem Leiter), Zeigefinger B, Mittelfinger Kraft auf eine positive Ladung – auf das Elektron wirkt die
// Kraft entgegengesetzt.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { SWING, EXPLAIN, axisHeight } from './config.js';
import { state } from './state.js';
import {
  electron, relativeVelocity, electronForce, electronPositions, electronRestPositions, highlightedElectron,
} from './physik.js';
import { swingGroup } from './aufbau.js';
import { addMesh } from './hilfen.js';
import { mat, COLOR_V, COLOR_B, COLOR_F } from './materialien.js';   // COLOR_B: Zeigefinger der Hand
import { scene, camera } from './szene.js';

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------- Beschriftungen (zeigen immer zur Kamera, liegen vor allem anderen)

function makeTag(text, color, height = 1.6) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = 'bold 64px system-ui, sans-serif';
  ctx.font = font;
  canvas.width = Math.max(128, Math.ceil(ctx.measureText(text).width) + 56);
  canvas.height = 128;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(4, 4, canvas.width - 8, 120, 60);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.scale.set(height * canvas.width / 128, height, 1);
  sprite.renderOrder = 12;
  return sprite;
}

// ---------------- Elektron im Stab (Kind der Schaukel, bewegt sich mit ihr)

// Wird über Stab und Magnet gezeichnet, damit es immer gut zu sehen ist
// Ladungen als Kugel mit Vorzeichen darin: schattierte Scheibe, die immer zur Kamera zeigt und über Stab und
// Magnet gezeichnet wird. ring: weißer Rand (hebt das beobachtete Elektron hervor).
function chargeTexture(light, dark, sign, ring = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(46, 42, 6, 64, 64, 62);
  gradient.addColorStop(0, light);
  gradient.addColorStop(1, dark);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();
  if (ring) {
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Vorzeichen als Balken, damit es genau in der Mitte sitzt
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(34, 57, 60, 14);
  if (sign === '+') ctx.fillRect(57, 34, 14, 60);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function makeCharge(texture, radius, parent, renderOrder) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.scale.setScalar(2 * radius);
  sprite.renderOrder = renderOrder;
  parent.add(sprite);
  return sprite;
}
const electronTexture = chargeTexture('#64b5f6', '#0d47a1', '−', true);
const electronMesh = makeCharge(electronTexture, EXPLAIN.ELECTRON_R, swingGroup, 9);

// ---------------- Viele Elektronen: weitere Elektronen (unter der Stabachse) und ortsfeste positive
// Atomrümpfe (darüber). Das hervorgehobene Elektron ist electronMesh; es trägt die Pfeile.
const MANY_Y = 0.45;                                  // Abstand von der Stabachse
const manyGroup = new THREE.Group();
swingGroup.add(manyGroup);
const ionTexture = chargeTexture('#ff8a80', '#b71c1c', '+');
const plainElectronTexture = chargeTexture('#90caf9', '#1565c0', '−');
const otherElectrons = [];
for (const x of electronRestPositions()) {
  const ion = makeCharge(ionTexture, EXPLAIN.MANY.ION_R, manyGroup, 8);
  ion.position.set(x, -SWING.LENGTH + MANY_Y, 0);
}
for (let i = 0; i < EXPLAIN.MANY.COUNT - 1; i++) otherElectrons.push(makeCharge(plainElectronTexture, EXPLAIN.MANY.R, manyGroup, 8));
// Beschriftung der Stabenden, sobald sich die Elektronen merklich verschoben haben
const excessTag = makeTag('Elektronenüberschuss  −', '#0d47a1', 1.1);
const deficitTag = makeTag('Elektronenmangel  +', '#b71c1c', 1.1);
for (const tag of [excessTag, deficitTag]) manyGroup.add(tag);
const TAG_SHIFT = 1;                                   // ab dieser Verschiebung (cm) erscheinen die Schilder

// ---------------- Pfeile am Elektron (in Weltkoordinaten, Länge ∝ Größe)

function makeArrow(color, label) {
  const material = new THREE.MeshBasicMaterial({ color, depthTest: false });
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 10), material);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1, 16), material);
  for (const part of [shaft, head]) {
    part.renderOrder = 10;
    group.add(part);
  }
  const tag = makeTag(label, color);
  group.add(tag);
  scene.add(group);
  return { group, shaft, head, tag };
}
const arrows = { v: makeArrow(COLOR_V, 'v'), F: makeArrow(COLOR_F, 'F_L') };

const up = v3(0, 1, 0);
const tmp = new THREE.Vector3();
// Pfeil vom Punkt origin in Richtung dir mit der Länge length (zu kurze Pfeile werden ausgeblendet)
function setArrow({ group, shaft, head, tag }, origin, dir, length) {
  group.visible = length > 0.4 && dir.lengthSq() > 0;
  if (!group.visible) return;
  const headLength = Math.min(0.9, length * 0.45);
  group.position.copy(origin);
  group.quaternion.setFromUnitVectors(up, tmp.copy(dir).normalize());
  shaft.scale.y = length - headLength;
  shaft.position.y = (length - headLength) / 2;
  head.scale.y = headLength;
  head.position.y = length - headLength / 2;
  tag.position.y = length + 1.1;
}

// ---------------- Hand zur Drei-Finger-Regel (rechte Hand)

// Modell der Hand in eigenen Koordinaten: Daumen +x, Zeigefinger +y, Mittelfinger +z (wie im Schienenversuch)
function buildHand() {
  const hand = new THREE.Group();
  scene.add(hand);
  const finger = (points, radius) => {
    for (let i = 1; i < points.length; i++) {
      const a = v3(...points[i - 1]);
      const b = v3(...points[i]);
      const segment = addMesh(new THREE.CapsuleGeometry(radius, a.distanceTo(b), 6, 16), mat.skin, hand);
      segment.position.copy(a).add(b).multiplyScalar(0.5);
      segment.quaternion.setFromUnitVectors(up, b.sub(a).normalize());
    }
  };
  addMesh(new THREE.BoxGeometry(7.6, 8, 2.6), mat.skin, hand);                    // Handfläche
  const wrist = addMesh(new THREE.CylinderGeometry(2.8, 3, 6, 24), mat.skin, hand);
  wrist.position.y = -7;
  wrist.scale.z = 0.7;
  finger([[3, -2.6, 0.3], [5, -2, 0.5], [10.5, -2, 0.5]], 0.95);                  // Daumen
  finger([[2.7, 3.6, 0], [2.7, 12.5, 0]], 0.85);                                   // Zeigefinger
  finger([[0.9, 3.4, 0.3], [0.9, 4.4, 0.6], [0.9, 4.4, 9.5]], 0.9);               // Mittelfinger
  finger([[-0.9, 3.6, 0], [-0.9, 5.2, 1.6], [-0.9, 4.4, 3.4], [-0.9, 2.6, 3]], 0.8);   // Ringfinger
  finger([[-2.7, 3.4, 0], [-2.7, 4.7, 1.4], [-2.7, 4, 2.9], [-2.7, 2.6, 2.6]], 0.7); // kleiner Finger
  // Pfeile in den Fingern
  const fingerArrow = (from, to, color) => {
    const material = new THREE.MeshBasicMaterial({ color, depthTest: false });
    const dir = to.clone().sub(from);
    const HEAD = 2.4, shaftLength = dir.length() - HEAD;
    const arrow = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, shaftLength, 12), material);
    shaft.position.y = shaftLength / 2;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.95, HEAD, 20), material);
    head.position.y = shaftLength + HEAD / 2;
    for (const part of [shaft, head]) {
      part.renderOrder = 5;
      arrow.add(part);
    }
    arrow.position.copy(from);
    arrow.quaternion.setFromUnitVectors(up, dir.normalize());
    hand.add(arrow);
  };
  fingerArrow(v3(4, -2, 0.5), v3(14, -2, 0.5), COLOR_V);
  fingerArrow(v3(2.7, 2, 0), v3(2.7, 16, 0), COLOR_B);
  fingerArrow(v3(0.9, 4.4, 1), v3(0.9, 4.4, 13), COLOR_F);
  const tags = [
    ['Daumen: v', COLOR_V, v3(16.5, -2, 0.5), v3(1, 0, 0)],
    ['Zeigefinger: B', COLOR_B, v3(2.7, 18, 0), v3(0, 1, 0)],
    ['Mittelfinger: F auf +', COLOR_F, v3(0.9, 4.4, 17), v3(0, 0, 1)],
  ].map(([text, color, tip, dir]) => {
    const sprite = makeTag(text, color, 2.5);
    sprite.position.copy(tip);
    hand.add(sprite);
    return { sprite, tip, dir };
  });
  return { hand, tags };
}
const { hand, tags: handTags } = buildHand();
const HAND_SCALE = 0.4;
hand.scale.setScalar(HAND_SCALE);

// Schilder so verankern, dass sie in Fingerrichtung von der Fingerspitze weg zeigen
const tipScreen = new THREE.Vector3();
const aheadScreen = new THREE.Vector3();
function anchorTags() {
  for (const { sprite, tip, dir } of handTags) {
    tipScreen.copy(tip).applyMatrix4(hand.matrixWorld).project(camera);
    aheadScreen.copy(tip).add(dir).applyMatrix4(hand.matrixWorld).project(camera);
    const dx = (aheadScreen.x - tipScreen.x) * camera.aspect;
    const dy = aheadScreen.y - tipScreen.y;
    const m = Math.max(Math.abs(dx), Math.abs(dy)) || 1;
    sprite.center.set(0.5 - 0.5 * dx / m, 0.5 - 0.5 * dy / m);
  }
}

// Ausrichtung der Hand: Daumen in Bewegungsrichtung, Zeigefinger in Richtung des Feldanteils senkrecht dazu.
// Bewegt sich der Stab kaum oder steht das Feld parallel zur Bewegung, behält die Hand ihre letzte Lage.
const handTarget = new THREE.Quaternion();
const basis = new THREE.Matrix4();
const thumb = new THREE.Vector3(0, 0, 1);       // Startlage: Stab bewegt sich nach vorne
const index = new THREE.Vector3();
const middle = new THREE.Vector3();
function fieldDirection() {
  const a = THREE.MathUtils.degToRad(state.magnetAngle);
  const s = state.northUp ? 1 : -1;
  return v3(0, -s * Math.cos(a), s * Math.sin(a));   // wie fieldAtBar() in physik.js, aber ohne Abfall am Rand
}
function updateHandTarget() {
  const v = relativeVelocity();
  const vel = v3(v.x, v.y, v.z);
  if (vel.length() > 0.02) thumb.copy(vel).normalize();
  const field = fieldDirection();
  index.copy(field).addScaledVector(thumb, -field.dot(thumb));
  if (index.lengthSq() < 0.01) return false;
  index.normalize();
  middle.crossVectors(thumb, index);
  handTarget.setFromRotationMatrix(basis.makeBasis(thumb, index, middle));
  return true;
}

// ---------------- Abgleich (jedes Bild)

const origin = new THREE.Vector3();
let wasOn = false;
export function syncExplain(dt) {
  const on = state.explain;
  const justOn = on && !wasOn;
  wasOn = on;
  // Bei „Viele Elektronen“ bleibt das beobachtete Elektron in der Reihe; der Knopf schaltet nur die Hervorhebung
  electronMesh.visible = on && (state.showElectron || state.manyElectrons);
  electronMesh.material.map = state.showElectron ? electronTexture : plainElectronTexture;
  manyGroup.visible = on && state.manyElectrons;
  if (!on) for (const arrow of Object.values(arrows)) arrow.group.visible = false;
  hand.visible = on && state.showExplainHand;
  if (!on) return;

  if (state.manyElectrons) {
    const p = electronPositions(), hi = highlightedElectron();
    electronMesh.position.set(p[hi], -SWING.LENGTH - MANY_Y, 0);
    electronMesh.scale.setScalar(state.showElectron ? 2 * EXPLAIN.ELECTRON_R * 0.75 : 2 * EXPLAIN.MANY.R);
    p.filter((_, i) => i !== hi).forEach((x, i) => otherElectrons[i].position.set(x, -SWING.LENGTH - MANY_Y, 0));
    const shown = Math.abs(electron.x) > TAG_SHIFT, side = Math.sign(electron.x);   // Überschuss auf dieser Seite
    excessTag.visible = deficitTag.visible = shown;
    excessTag.position.set(side * (SWING.BAR_LEN / 2 - 1.5), -SWING.LENGTH - 2.4, 0);
    deficitTag.position.set(-side * (SWING.BAR_LEN / 2 - 1.5), -SWING.LENGTH + 2.6, 0);
  } else {
    electronMesh.position.set(electron.x, -SWING.LENGTH, 0);
    electronMesh.scale.setScalar(2 * EXPLAIN.ELECTRON_R);
  }
  electronMesh.updateMatrixWorld();
  origin.setFromMatrixPosition(electronMesh.matrixWorld);

  const v = relativeVelocity(), F = electronForce();
  const len = (vec, scale) => Math.min(EXPLAIN.ARROW_MAX, Math.hypot(vec.x, vec.y, vec.z) * scale);
  // Pfeile einzeln abschaltbar; in der Pause zeigen sie den eingefrorenen Augenblick
  setArrow(arrows.v, origin, v3(v.x, v.y, v.z), state.showV ? len(v, EXPLAIN.ARROW_V) : 0);
  setArrow(arrows.F, origin, v3(F.x, F.y, F.z), state.showF ? len(F, EXPLAIN.ARROW_F) : 0);

  if (hand.visible) {
    const axisY = axisHeight(state.setup, state.longMagnet);
    hand.position.set(-18, axisY + 3, -6);
    const fresh = updateHandTarget();
    if (justOn) hand.quaternion.copy(handTarget);
    else if (fresh) hand.quaternion.slerp(handTarget, Math.min(1, 8 * dt));
    hand.updateMatrixWorld();
    anchorTags();
  }
}

// Kamera für den Erklärmodus: schräg von links vorne oben, damit auch die Bewegung nach vorne/hinten
// (v, Daumen) gut zu sehen ist; Hand links im Bild
export function explainView(controls) {
  const axisY = axisHeight(state.setup, state.longMagnet);
  camera.position.set(-42, axisY + 24, 42);
  controls.target.set(-6, axisY, -2);
}
