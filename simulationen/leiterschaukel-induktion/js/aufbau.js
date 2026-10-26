// ------------------------------------------------------------------
// Versuchsaufbau: Stativ mit Querstange, Leiterschaukel, Hufeisenmagnet (im Drehgelenk oder auf dem Tisch)
// Die Schaukel hat eine eigene Gruppe (swingGroup) mit dem Stab als Kind (bar) – dort kann später
// die mikroskopische Ansicht (Elektronen im Stab) angehängt werden.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { AXIS_Y, PIVOT_Y, SWING, STAND, MAGNET, MAGNET_LONG, EXPLAIN, axisHeight } from './config.js';
import { state } from './state.js';
import { swing, magnetMotion } from './physik.js';
import { addMesh, makeLabel, textTexture } from './hilfen.js';
import { mat, COLOR_B } from './materialien.js';
import { scene } from './szene.js';

const rod = (radius, length, material, parent) => addMesh(new THREE.CylinderGeometry(radius, radius, length, 24), material, parent);

// ---------------- Stativ: zwei Stangen auf Fußplatten, Querstange mit Aufhängungen und Buchsen
// Querstange, Muffen und Schaukel bilden eine Gruppe, die je nach Versuch höher oder tiefer eingespannt wird.
// Stangen, Querstange, Muffen und Buchsen werden im Erklärmodus ausgeblendet (stands, rigDecor).
const rig = new THREE.Group();
scene.add(rig);
const stands = new THREE.Group();
scene.add(stands);
const rigDecor = new THREE.Group();
rig.add(rigDecor);

for (const side of [-1, 1]) {
  const x = side * STAND.X;
  const base = addMesh(new THREE.BoxGeometry(5, 1.2, 18), mat.standBase, stands);
  base.position.set(x, 0.6, 0);
  const pole = rod(STAND.R, STAND.TOP - 1.2, mat.rod, stands);
  pole.position.set(x, 1.2 + (STAND.TOP - 1.2) / 2, 0);
  const sleeve = addMesh(new THREE.BoxGeometry(2.6, 2.6, 2.6), mat.clamp, rigDecor);   // Muffe
  sleeve.position.set(x, PIVOT_Y, 0);
}
const crossbar = rod(0.5, 2 * STAND.X, mat.rod, rigDecor);
crossbar.rotation.z = Math.PI / 2;
crossbar.position.set(0, PIVOT_Y, 0);

// Isolierte Aufhängung je Bügel mit Buchse (links schwarz, rechts rot) für die Kabel zum Messgerät
for (const side of [-1, 1]) {
  const block = addMesh(new THREE.BoxGeometry(4, 2.2, 2.2), mat.insulator, rigDecor);
  block.position.set(side * (SWING.HANGER_X + 1), PIVOT_Y, 0);
  const socket = rod(0.55, 1.2, side > 0 ? mat.cableRed : mat.cableBlack, rigDecor);
  socket.position.set(side * (SWING.HANGER_X + 2), PIVOT_Y + 1.6, 0);
}
// Steckerpunkt der Buchse (side −1 links, +1 rechts) in Weltkoordinaten
export const socketPoint = side => new THREE.Vector3(side * (SWING.HANGER_X + 2), PIVOT_Y + 2.2 + rig.position.y, 0);

// ---------------- Leiterschaukel: hängt an der Querstange, dreht sich um die x-Achse

export const swingGroup = new THREE.Group();
swingGroup.position.set(0, PIVOT_Y, 0);
rig.add(swingGroup);

for (const side of [-1, 1]) {
  const hanger = rod(SWING.HANGER_R, SWING.LENGTH, mat.brass, swingGroup);
  hanger.position.set(side * SWING.HANGER_X, -SWING.LENGTH / 2, 0);
  const eye = addMesh(new THREE.TorusGeometry(0.7, 0.18, 10, 24), mat.brass, swingGroup);   // Öse um die Querstange
  eye.rotation.y = Math.PI / 2;
  eye.position.set(side * SWING.HANGER_X, 0, 0);
}
export const bar = rod(SWING.BAR_R, SWING.BAR_LEN, mat.copper, swingGroup);
bar.rotation.z = Math.PI / 2;
bar.position.set(0, -SWING.LENGTH, 0);

// Unsichtbare, dickere Griffflächen, damit sich die Schaukel auch mit dem Finger gut greifen lässt
export const grabTargets = [];
{
  const invisible = new THREE.MeshBasicMaterial({ visible: false });
  const grabBar = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, SWING.BAR_LEN + 2, 8), invisible);
  grabBar.rotation.z = Math.PI / 2;
  grabBar.position.copy(bar.position);
  swingGroup.add(grabBar);
  grabTargets.push(grabBar);
  for (const side of [-1, 1]) {
    const grabHanger = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, SWING.LENGTH - 3, 8), invisible);
    grabHanger.position.set(side * SWING.HANGER_X, -SWING.LENGTH / 2 - 1.5, 0);
    swingGroup.add(grabHanger);
    grabTargets.push(grabHanger);
  }
}

// ---------------- Hufeisenmagnet (Koordinaten des Magneten, siehe config.js)
// Drehbarer Magnet: dreht sich um die Stabachse. Magnet auf dem Tisch: liegt flach, nach vorne/hinten verschiebbar.

const magnet = new THREE.Group();
magnet.position.set(0, AXIS_Y, 0);
scene.add(magnet);

const inner = MAGNET.GAP / 2, outer = inner + MAGNET.THICK;
const legOffset = inner + MAGNET.THICK / 2;
const armX = MAGNET.HOLDER_X - 0.6;

// Magnetkörper (Bogen, Schenkel, Beschriftungen, Halterarm) für die Schenkellage { Z_IN, Z_OPEN }.
// Es gibt einen kurzen und einen langen; sichtbar ist jeweils einer.
function buildBody({ Z_IN, Z_OPEN }) {
  const group = new THREE.Group();
  magnet.add(group);

  // Bogen als extrudierter Halbring hinter dem Stab (Form in der z-y-Ebene, Extrusion entlang x)
  const shape = new THREE.Shape();
  shape.moveTo(Z_IN, outer);
  shape.absarc(Z_IN, 0, outer, Math.PI / 2, Math.PI * 1.5, false);
  shape.lineTo(Z_IN, -inner);
  shape.absarc(Z_IN, 0, inner, Math.PI * 1.5, Math.PI / 2, true);
  shape.closePath();
  const yokeGeometry = new THREE.ExtrudeGeometry(shape, { depth: MAGNET.WIDTH, bevelEnabled: false, curveSegments: 40 });
  yokeGeometry.translate(0, 0, -MAGNET.WIDTH / 2);
  yokeGeometry.rotateY(-Math.PI / 2);   // Formebene → z-y-Ebene, Extrusion → entlang x
  const yoke = addMesh(yokeGeometry, mat.yoke, group);

  // Schenkel: in Grundstellung oben Nordpol (rot), unten Südpol (grün)
  const legGeometry = new THREE.BoxGeometry(MAGNET.WIDTH, MAGNET.THICK, Z_OPEN - Z_IN);
  const upperLeg = addMesh(legGeometry, mat.north, group);
  upperLeg.position.set(0, legOffset, (Z_IN + Z_OPEN) / 2);
  const lowerLeg = addMesh(legGeometry, mat.south, group);
  lowerLeg.position.set(0, -legOffset, (Z_IN + Z_OPEN) / 2);

  // Polbeschriftungen: Stirnseite, beide Seitenflächen und Außenfläche der Schenkel
  const upperLabels = [], lowerLabels = [];
  for (const [list, sign] of [[upperLabels, 1], [lowerLabels, -1]]) {
    const front = makeLabel('N', 2.6);
    front.position.set(0, sign * legOffset, Z_OPEN + 0.02);
    const left = makeLabel('N', 2.6);
    left.rotation.y = -Math.PI / 2;
    left.position.set(-MAGNET.WIDTH / 2 - 0.02, sign * legOffset, Z_OPEN - 2);
    const right = makeLabel('N', 2.6);
    right.rotation.y = Math.PI / 2;
    right.position.set(MAGNET.WIDTH / 2 + 0.02, sign * legOffset, Z_OPEN - 2);
    const outside = makeLabel('N', 4);
    outside.rotation.x = -sign * Math.PI / 2;
    outside.position.set(0, sign * (outer + 0.02), Z_OPEN - 3);
    for (const label of [front, left, right, outside]) {
      group.add(label);
      list.push(label);
    }
  }

  // Halter: Winkelstück vom Bogen zum Drehgelenk rechts neben dem Magneten (nur beim drehbaren Magneten).
  // Es greift in der Mitte des Bogens an, wohin der Stab nie kommt, und liegt außerhalb der Bügel der Schaukel.
  // Eigene Materialien, da der ganze Magnet beim Umdrehen überblendet wird.
  const yokeMid = Z_IN - (inner + outer) / 2;
  const holderArm = new THREE.Group();
  group.add(holderArm);
  const holderMat = mat.holder.clone(), pointerMat = mat.cableRed.clone();
  const cross = addMesh(new THREE.BoxGeometry(armX - MAGNET.WIDTH / 2 + 0.4, 1.4, 1.4), holderMat, holderArm);
  cross.position.set((MAGNET.WIDTH / 2 + armX) / 2, 0, yokeMid);
  const radial = addMesh(new THREE.BoxGeometry(0.8, 1.4, -yokeMid + 0.7), holderMat, holderArm);
  radial.position.set(armX, 0, yokeMid / 2);
  const pointer = addMesh(new THREE.BoxGeometry(0.12, 0.3, 4), pointerMat, holderArm);   // Zeiger der Winkelskala
  pointer.position.set(MAGNET.HOLDER_X + 1.12, 0, -2);

  // Feldlinien im Spalt (nur im Erklärmodus): Pfeile vom oberen zum unteren Pol; bei Südpol oben wird die
  // Gruppe an der Waagrechten gespiegelt (scale.y = −1), dann zeigen die Spitzen nach oben.
  const fieldLines = new THREE.Group();
  group.add(fieldLines);
  const lineMat = new THREE.MeshBasicMaterial({ color: COLOR_B, transparent: true, opacity: 0.45, depthWrite: false });
  lineMat.userData.baseOpacity = 0.45;
  const HEAD = 0.9;
  for (let z = Z_IN + 1.5; z <= Z_OPEN - 0.5; z += 3) {
    for (const x of [-2, 2]) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2 * inner - HEAD, 8), lineMat);
      shaft.position.set(x, HEAD / 2, z);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.3, HEAD, 12), lineMat);
      head.rotation.x = Math.PI;
      head.position.set(x, -inner + HEAD / 2, z);
      fieldLines.add(shaft, head);
    }
  }

  return { group, upperLeg, lowerLeg, upperLabels, lowerLabels, holderArm, fieldLines, targets: [yoke, upperLeg, lowerLeg] };
}
const bodies = { short: buildBody(MAGNET), long: buildBody(MAGNET_LONG) };
const body = () => (state.longMagnet ? bodies.long : bodies.short);

// Körper des sichtbaren Magneten, an denen man ihn (auf dem Tisch) greifen kann (wird in applySetup gefüllt)
export const magnetTargets = [];

// Drehgelenk mit Winkelskala (fest), auf eigener Stativstange – nur beim drehbaren Magneten
const holderStand = new THREE.Group();
scene.add(holderStand);
function angleScaleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f7f7f2';
  ctx.beginPath();
  ctx.arc(256, 256, 254, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ctx.fillStyle = '#1d2733';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Rechts im Bild liegt hinten (α = 0°), unten im Bild unten (α = 90°)
  for (let deg = 0; deg <= 90; deg += 10) {
    const a = deg * Math.PI / 180, major = deg % 30 === 0;
    ctx.lineWidth = major ? 7 : 4;
    ctx.beginPath();
    ctx.moveTo(256 + 240 * Math.cos(a), 256 + 240 * Math.sin(a));
    ctx.lineTo(256 + (major ? 190 : 210) * Math.cos(a), 256 + (major ? 190 : 210) * Math.sin(a));
    ctx.stroke();
    if (major) ctx.fillText(deg + '°', 256 + 145 * Math.cos(a), 256 + 145 * Math.sin(a));
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
const holderTop = new THREE.Group();   // Gelenk, Skala und Muffe: wandern mit der Höhe der Drehachse
holderStand.add(holderTop);
let holderPole;
{
  const hub = rod(4.2, 1, mat.holder, holderTop);
  hub.rotation.z = Math.PI / 2;
  hub.position.set(MAGNET.HOLDER_X + 0.5, AXIS_Y, 0);
  const face = new THREE.Mesh(new THREE.CircleGeometry(4, 48), new THREE.MeshBasicMaterial({ map: angleScaleTexture() }));
  face.rotation.y = Math.PI / 2;
  face.position.set(MAGNET.HOLDER_X + 1.02, AXIS_Y, 0);
  holderTop.add(face);
  const axle = rod(0.35, 1.6, mat.clamp, holderTop);
  axle.rotation.z = Math.PI / 2;
  axle.position.set(MAGNET.HOLDER_X + 1.2, AXIS_Y, 0);
  // Stativstange hinter dem Gelenk, damit die Skala frei bleibt
  const standX = MAGNET.HOLDER_X + 2.4;
  const stub = rod(0.4, 1.8, mat.rod, holderTop);
  stub.rotation.z = Math.PI / 2;
  stub.position.set(MAGNET.HOLDER_X + 1.5, AXIS_Y, -4.6);
  const link = addMesh(new THREE.BoxGeometry(0.8, 1.2, 4.6), mat.holder, holderTop);
  link.position.set(MAGNET.HOLDER_X + 0.5, AXIS_Y, -2.3);
  // Stange als Einheitslänge, wird in applySetup auf die Höhe der Drehachse gestreckt
  holderPole = rod(0.6, 1, mat.rod, holderStand);
  holderPole.position.set(standX, 0, -4.6);
  const sleeve = addMesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), mat.clamp, holderTop);
  sleeve.position.set(standX, AXIS_Y, -4.6);
  const base = addMesh(new THREE.BoxGeometry(5, 1.2, 9), mat.standBase, holderStand);
  base.position.set(standX, 0.6, -6);
}

// ---------------- Abgleich mit dem Zustand

export function syncApparatus() {
  swingGroup.rotation.x = -swing.theta;
  magnet.rotation.x = -THREE.MathUtils.degToRad(state.magnetAngle);
  magnet.position.z = magnetMotion.z;
}

// Versuch und Magnet einstellen: Höhe der Querstange und des Magneten, kurzer oder langer Magnet,
// Halter ein- oder ausblenden
export function applySetup() {
  const axisY = axisHeight(state.setup, state.longMagnet);
  rig.position.y = axisY - AXIS_Y;
  magnet.position.y = axisY;
  holderTop.position.y = axisY - AXIS_Y;
  holderPole.scale.y = axisY + 1;
  holderPole.position.y = (axisY + 1) / 2 + 0.6;
  bodies.short.group.visible = !state.longMagnet;
  bodies.long.group.visible = state.longMagnet;
  magnetTargets.splice(0, magnetTargets.length, ...body().targets);
  // Erklärmodus: nur Magnet und Schaukel; Stab dicker und durchsichtig, Feldlinien im Spalt
  const showHolder = state.setup === 'drehbar' && !state.explain;
  for (const b of Object.values(bodies)) {
    b.holderArm.visible = showHolder;
  }
  syncFieldLines();
  holderStand.visible = showHolder;
  stands.visible = rigDecor.visible = !state.explain;
  const barScale = state.explain ? EXPLAIN.BAR_R / SWING.BAR_R : 1;
  bar.scale.set(barScale, 1, barScale);   // Zylinderachse = lokale y-Achse
  mat.copper.transparent = state.explain;
  mat.copper.opacity = state.explain ? 0.3 : 1;
  mat.copper.depthWrite = !state.explain;
  mat.copper.needsUpdate = true;
  syncApparatus();
}

// Feldlinien im Spalt: nur im Erklärmodus und wenn „B“ eingeschaltet ist
export function syncFieldLines() {
  for (const b of Object.values(bodies)) b.fieldLines.visible = state.explain && state.showB;
}

// Farben und Beschriftungen passend zur Polung des Magneten
export function applyMagnetPoles() {
  for (const { upperLeg, lowerLeg, upperLabels, lowerLabels } of Object.values(bodies)) {
    upperLeg.material = state.northUp ? mat.north : mat.south;
    lowerLeg.material = state.northUp ? mat.south : mat.north;
    for (const label of upperLabels) label.material.map = textTexture(state.northUp ? 'N' : 'S');
    for (const label of lowerLabels) label.material.map = textTexture(state.northUp ? 'S' : 'N');
  }
  for (const b of Object.values(bodies)) b.fieldLines.scale.y = state.northUp ? 1 : -1;
}

// Überblenden beim Umdrehen des Magneten
export function setMagnetOpacity(opacity) {
  magnet.traverse(obj => {
    if (!obj.isMesh) return;
    const transparent = opacity < 1 || obj.material.isMeshBasicMaterial;
    if (obj.material.transparent !== transparent) {
      obj.material.transparent = transparent;
      obj.material.needsUpdate = true;
    }
    obj.material.opacity = opacity * (obj.material.userData.baseOpacity ?? 1);   // Feldlinien bleiben durchscheinend
    obj.castShadow = opacity > 0.5;
  });
}
