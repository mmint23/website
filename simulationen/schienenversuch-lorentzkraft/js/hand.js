// ------------------------------------------------------------------
// Drei-Finger-Regel: zwei rechte Hände
// Daumen: technische Stromrichtung I, Zeigefinger: Magnetfeld B, Mittelfinger: Lorentzkraft F
// - Merkhand (Knopf „Hand anzeigen“): steht rechts neben dem Aufbau, bewegt und dreht sich nie.
//   In den Fingern sind Pfeile für Strom (grün), Feld (blau) und Kraft (rot) eingezeichnet.
// - Lösungshand (Knopf „Lösung anzeigen“): steht links neben dem Aufbau und dreht sich mit,
//   wenn Polung, Magnet oder Winkel geändert werden, damit sie immer zum Versuch passt.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { barHeight } from './config.js';
import { state, currentSetup } from './state.js';
import { addMesh } from './hilfen.js';
import { mat } from './materialien.js';
import { scene, camera } from './szene.js';

const HAND_X = -24;              // Lösungshand: neben dem Magneten, links von der Stange
const HAND_ABOVE_BAR = 14;       // Höhe der Handfläche über der Stange
const MAX_ANGLE = 179;           // bei α > 179° wirkt keine Kraft – Lösungshand wird ausgeblendet

const GUIDE_POSITION = [38, 30, -14];   // Merkhand: rechts hinter dem Schienenende, in beiden Versuchen gleich
const GUIDE_SCALE = 0.75;
const GUIDE_TURN = Math.PI / 6;          // leicht gedreht, damit alle drei Finger gut zu sehen sind

// Modell der Hand in eigenen Koordinaten: Daumen +x, Zeigefinger +y, Mittelfinger +z
// (rechtshändiges System, Handfläche zeigt nach +z)
function buildHandModel() {
  const hand = new THREE.Group();
  hand.visible = false;
  scene.add(hand);

  // Finger als Kette von Kapseln durch die angegebenen Punkte
  const finger = (points, radius) => {
    for (let i = 1; i < points.length; i++) {
      const a = new THREE.Vector3(...points[i - 1]);
      const b = new THREE.Vector3(...points[i]);
      const segment = addMesh(new THREE.CapsuleGeometry(radius, a.distanceTo(b), 6, 16), mat.skin, hand);
      segment.position.copy(a).add(b).multiplyScalar(0.5);
      segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
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
  return hand;
}

// Beschriftung als Schild, das immer zur Kamera zeigt und vor allem anderen liegt
function makeTag(hand, text, color, tip, dir) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = 'bold 64px system-ui, sans-serif';
  ctx.font = font;
  canvas.width = Math.max(512, Math.ceil(ctx.measureText(text).width) + 80);
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
  sprite.scale.set(3 * canvas.width / 128, 3, 1);
  sprite.renderOrder = 10;
  sprite.position.copy(tip);
  hand.add(sprite);
  return { sprite, tip, dir };
}

// Pfeil entlang eines Fingers, wird über die Hand gezeichnet
function makeArrow(hand, from, to, color) {
  const material = new THREE.MeshBasicMaterial({ color, depthTest: false });
  const HEAD = 2.4;
  const dir = to.clone().sub(from);
  const shaftLength = dir.length() - HEAD;
  dir.normalize();
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
  arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  hand.add(arrow);
}

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const X = v(1, 0, 0);
const Y = v(0, 1, 0);
const Z = v(0, 0, 1);

// Lösungshand mit Fingerbeschriftung (Fingerspitze etwas davor und Richtung in Handkoordinaten)
const solution = buildHandModel();
const solutionTags = [
  makeTag(solution, 'Daumen: I', '#d84315', v(12, -2, 0.5), X),
  makeTag(solution, 'Zeigefinger: B', '#1565c0', v(2.7, 14, 0), Y),
  makeTag(solution, 'Mittelfinger: F', '#6a1b9a', v(0.9, 4.4, 11), Z),
];

// Merkhand mit Pfeilen in den Fingern, fest an ihrem Platz
const guide = buildHandModel();
guide.position.set(...GUIDE_POSITION);
guide.rotation.y = GUIDE_TURN;
guide.scale.setScalar(GUIDE_SCALE);
const COLOR_CURRENT = '#2e7d32';
const COLOR_FIELD = '#1565c0';
const COLOR_FORCE = '#c62828';
makeArrow(guide, v(4, -2, 0.5), v(14, -2, 0.5), COLOR_CURRENT);
makeArrow(guide, v(2.7, 2, 0), v(2.7, 16, 0), COLOR_FIELD);
makeArrow(guide, v(0.9, 4.4, 1), v(0.9, 4.4, 13), COLOR_FORCE);
const guideTags = [
  makeTag(guide, 'Stromrichtung I', COLOR_CURRENT, v(15, -2, 0.5), X),
  makeTag(guide, 'Magnetfeldlinien B', COLOR_FIELD, v(2.7, 17, 0), Y),
  makeTag(guide, 'Lorentzkraft F', COLOR_FORCE, v(0.9, 4.4, 14), Z),
];
guide.updateMatrixWorld();

const basis = new THREE.Matrix4();
const current = new THREE.Vector3();
const field = new THREE.Vector3();
const force = new THREE.Vector3();
const tipScreen = new THREE.Vector3();
const aheadScreen = new THREE.Vector3();

// Schilder so verankern, dass sie in Fingerrichtung von der Fingerspitze weg zeigen
// (hängt nur von der Kameraansicht ab, die Hand selbst bleibt unverändert)
function anchorTags(hand, tags) {
  for (const { sprite, tip, dir } of tags) {
    tipScreen.copy(tip).applyMatrix4(hand.matrixWorld).project(camera);
    aheadScreen.copy(tip).add(dir).applyMatrix4(hand.matrixWorld).project(camera);
    const dx = (aheadScreen.x - tipScreen.x) * camera.aspect;
    const dy = aheadScreen.y - tipScreen.y;
    const m = Math.max(Math.abs(dx), Math.abs(dy)) || 1;
    sprite.center.set(0.5 - 0.5 * dx / m, 0.5 - 0.5 * dy / m);
  }
}

// Sichtbarkeit und Ausrichtung der Hände (wird in jedem Bild aufgerufen)
export function syncHand() {
  guide.visible = state.showHand;
  if (guide.visible) anchorTags(guide, guideTags);

  solution.visible = state.showSolution && state.magnetAngle <= MAX_ANGLE;
  if (!solution.visible) return;
  solution.position.set(HAND_X, barHeight(currentSetup()) + HAND_ABOVE_BAR, 0);

  // Strom in der Stange von der Plus- zur Minus-Schiene (vgl. physik.js).
  // Der Zeigefinger zeigt in Richtung des Feldanteils senkrecht zur Stange (beim drehbaren Magneten ±y).
  current.set(0, 0, -state.polarity);
  field.set(0, state.northUp ? -1 : 1, 0);
  force.crossVectors(current, field);
  solution.quaternion.setFromRotationMatrix(basis.makeBasis(current, field, force));
  solution.updateMatrixWorld();
  anchorTags(solution, solutionTags);
}
