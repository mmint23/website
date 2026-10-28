// ------------------------------------------------------------------
// Generator-Modell (freischwebend): Hufeisenmagnet mit Polblöcken oben (N) und unten (S), Welle mit
// rechteckiger Leiterschleife, zwei Schleifringe mit Bürsten und eine Kurbel am linken Wellenende.
// Alles, was sich dreht, hängt in der Gruppe rotorGroup (Drehung um die x-Achse).
// ------------------------------------------------------------------
import * as THREE from 'three';
import { LOOP, MAGNET, SHAFT, RINGS, CRANK, EXPLAIN, RINGS_ANIM } from './config.js';
import { state } from './state.js';
import { rotor } from './physik.js';
import { addMesh, makeLabel, textTexture } from './hilfen.js';
import { PATH } from './physik.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';

const cylinderX = (radius, length, material, parent) => {
  const mesh = addMesh(new THREE.CylinderGeometry(radius, radius, length, 32), material, parent);
  mesh.rotation.z = Math.PI / 2;
  return mesh;
};

// Draht als Rohr durch die angegebenen Punkte (gerade Stücke mit sanften Ecken)
function wire(points, radius, material, parent) {
  const path = new THREE.CurvePath();
  for (let i = 1; i < points.length; i++) {
    path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i - 1]), new THREE.Vector3(...points[i])));
  }
  return addMesh(new THREE.TubeGeometry(path, 32 * points.length, radius, 12, false), material, parent);
}

// ---------------- Hufeisenmagnet: Polblöcke oben und unten, hinten durch ein Joch verbunden

const magnet = new THREE.Group();
scene.add(magnet);
const poleY = MAGNET.GAP / 2 + MAGNET.THICK / 2;
const poleGeometry = new THREE.BoxGeometry(MAGNET.WIDTH, MAGNET.THICK, MAGNET.DEPTH);
const upperPole = addMesh(poleGeometry, mat.north, magnet);
upperPole.position.y = poleY;
const lowerPole = addMesh(poleGeometry, mat.south, magnet);
lowerPole.position.y = -poleY;
const YOKE_T = 3;
const yokeHeight = MAGNET.GAP + 2 * MAGNET.THICK;
const yoke = addMesh(new THREE.BoxGeometry(MAGNET.WIDTH, yokeHeight, YOKE_T), mat.yoke, magnet);
yoke.position.z = -MAGNET.DEPTH / 2 - YOKE_T / 2;

// Polbeschriftungen vorne und oben bzw. unten
const upperLabels = [], lowerLabels = [];
for (const [list, sign] of [[upperLabels, 1], [lowerLabels, -1]]) {
  const front = makeLabel('N', 3.6);
  front.position.set(0, sign * poleY, MAGNET.DEPTH / 2 + 0.02);
  const outside = makeLabel('N', 5);
  outside.rotation.x = -sign * Math.PI / 2;
  outside.position.set(0, sign * (poleY + MAGNET.THICK / 2 + 0.02), 1);
  for (const label of [front, outside]) {
    magnet.add(label);
    list.push(label);
  }
}

export function applyMagnetPoles() {
  upperPole.material = state.northUp ? mat.north : mat.south;
  lowerPole.material = state.northUp ? mat.south : mat.north;
  for (const label of upperLabels) label.material.map = textTexture(state.northUp ? 'N' : 'S');
  for (const label of lowerLabels) label.material.map = textTexture(state.northUp ? 'S' : 'N');
}

// ---------------- Welle (fest) und drehende Teile

cylinderX(SHAFT.R, SHAFT.X_MAX - SHAFT.X_MIN, mat.steel, scene).position.x = (SHAFT.X_MIN + SHAFT.X_MAX) / 2;

export const rotorGroup = new THREE.Group();
scene.add(rotorGroup);

// Leiterschleife: Längsseite A vorne (z = +R), B hinten (z = −R), bei φ = 0 waagrecht.
// Links verbindet eine Querseite A und B (an der Welle mit einem Isolierstück befestigt), rechts führen
// die Enden zur Welle und als Zuleitungen zu den Schleifringen (A → Ring 1, B → Ring 2).
// Im Erklärmodus wird die Schleife durch eine dicke, durchsichtige ersetzt (Elektronen darin sichtbar): zuerst
// mit offenen Enden (A vorne, B hinten); mit dem Knopf „Schleifringe“ kommen Zuleitungen zu den Ringen dazu.
const L2 = LOOP.LENGTH / 2, R = LOOP.RADIUS, OPEN = EXPLAIN.OPEN_END;

// Zuleitung vom Drahtende (Abstand fromZ von der Achse, vorne sign = +1 bzw. hinten −1) zum Schleifring:
// erst zur Welle, dann sichtbar auf der Isolierhülse entlang bis an die Stirnseite des Rings (Lötpunkt).
// Die Zuleitung zu Ring 2 läuft dabei unter Ring 1 hindurch.
function lead(sign, fromZ, ringIndex, radius, parent) {
  const r = RINGS.LEAD_R, xEnd = RINGS.X[ringIndex] - RINGS.WIDTH / 2;
  const mesh = wire([[L2, 0, sign * fromZ], [L2 + 0.4, 0, sign * r], [xEnd, 0, sign * r]], radius, mat.copper, parent);
  const solder = addMesh(new THREE.SphereGeometry(0.28, 14, 10), mat.brass, parent);
  solder.position.set(xEnd, 0, sign * r);
  return { mesh, solder };
}
function buildLoop(radius, material) {
  const group = new THREE.Group();
  rotorGroup.add(group);
  wire([[-L2, 0, R], [L2, 0, R]], radius, material, group);       // Längsseite A
  wire([[L2, 0, -R], [-L2, 0, -R]], radius, material, group);     // Längsseite B
  wire([[-L2, 0, -R], [-L2, 0, R]], radius, material, group);     // Querseite
  return group;
}
const loopNormal = buildLoop(LOOP.WIRE_R, mat.copper);
lead(1, R, 0, LOOP.WIRE_R * 0.6, loopNormal);     // Seite A → Ring 1
lead(-1, R, 1, LOOP.WIRE_R * 0.6, loopNormal);    // Seite B → Ring 2
const glassCopper = new THREE.MeshStandardMaterial({
  color: 0xd9874a, metalness: 0.3, roughness: 0.3, transparent: true, opacity: EXPLAIN.OPACITY, depthWrite: false,
});
// Ein durchgehendes Rohr von Ende A bis Ende B mit gerundeten Ecken (derselbe Weg wie die Elektronen, PATH in
// physik.js) – keine überlappenden Stücke, die an den Ecken doppelt durchscheinen
const loopExplain = new THREE.Group();
rotorGroup.add(loopExplain);
loopExplain.visible = false;
{
  const path = new THREE.CurvePath();
  for (let i = 1; i < PATH.length; i++) {
    path.add(new THREE.LineCurve3(new THREE.Vector3(PATH[i - 1][0], 0, PATH[i - 1][1]), new THREE.Vector3(PATH[i][0], 0, PATH[i][1])));
  }
  addMesh(new THREE.TubeGeometry(path, 12 * PATH.length, EXPLAIN.WIRE_R, 24, false), glassCopper, loopExplain);
}
for (const sign of [1, -1]) {   // offene Enden: halbe Kugel als Kappe, nach innen (zur Welle) gewölbt
  const cap = addMesh(new THREE.SphereGeometry(EXPLAIN.WIRE_R, 24, 12, 0, 2 * Math.PI, 0, Math.PI / 2), glassCopper, loopExplain);
  cap.position.set(L2, 0, sign * OPEN);
  cap.rotation.x = -sign * Math.PI / 2;
}
// Zuleitungen von den offenen Enden zu den Schleifringen (Ende A → Ring 1, Ende B → Ring 2)
const explainLeads = new THREE.Group();
rotorGroup.add(explainLeads);
const explainLeadParts = [lead(1, OPEN, 0, LOOP.WIRE_R * 0.7, explainLeads), lead(-1, OPEN, 1, LOOP.WIRE_R * 0.7, explainLeads)];
const hub = cylinderX(SHAFT.R + 0.5, 1.4, mat.insulator, rotorGroup);
hub.position.x = -L2;
// Schleifringe auf einer Isolierhülse, dazu das Isolierstück, an dem die Zuleitungen an der Welle anliegen
// (im Erklärmodus erst mit dem Knopf „Schleifringe“ sichtbar)
const ringsGroup = new THREE.Group();
rotorGroup.add(ringsGroup);
const leadHub = cylinderX(SHAFT.R + 0.5, 1.4, mat.insulator, ringsGroup);
leadHub.position.x = L2;
const sleeveStart = RINGS.X[0] - 1.4, sleeveEnd = RINGS.X[1] + 1.2;
cylinderX(RINGS.SLEEVE_R, sleeveEnd - sleeveStart, mat.insulator, ringsGroup).position.x = (sleeveStart + sleeveEnd) / 2;
for (const x of RINGS.X) cylinderX(RINGS.R, RINGS.WIDTH, mat.brass, ringsGroup).position.x = x;

// Kurbel am linken Wellenende: Arm nach vorne (bei φ = 0), Griff parallel zur Welle
const crank = new THREE.Group();
crank.position.x = CRANK.X;
rotorGroup.add(crank);
const arm = addMesh(new THREE.BoxGeometry(0.8, 0.8, CRANK.ARM + 0.8), mat.steel, crank);
arm.position.z = CRANK.ARM / 2;
const grip = cylinderX(0.6, CRANK.KNOB_LEN, mat.wood, crank);
grip.position.set(-CRANK.KNOB_LEN / 2 - 0.4, 0, CRANK.ARM);

// Kleiner Rotor mit drei Blättern am linken Wellenende (Antrieb „Wind“, statt der Kurbel): zeigt, dass die
// Schleife im Windrad vom Rotor angetrieben wird
const windRotor = new THREE.Group();
windRotor.position.x = CRANK.X - 0.5;
windRotor.visible = false;
rotorGroup.add(windRotor);
{
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.45 });
  const hubMesh = addMesh(new THREE.SphereGeometry(1.3, 20, 14), white, windRotor);
  hubMesh.scale.x = 1.4;
  const shape = new THREE.Shape();
  shape.moveTo(-0.6, 0);
  shape.lineTo(-1.4, 2.2);
  shape.quadraticCurveTo(-0.9, 6, -0.25, 9);
  shape.lineTo(0.3, 9);
  shape.quadraticCurveTo(0.9, 4.5, 1.0, 1.6);
  shape.lineTo(0.6, 0);
  shape.closePath();
  const bladeGeometry = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: false });
  bladeGeometry.translate(0, 0, -0.125);
  bladeGeometry.rotateY(Math.PI / 2);   // Blattfläche quer zur Welle (Drehebene y-z)
  for (let k = 0; k < 3; k++) {
    const arm = new THREE.Group();
    arm.rotation.x = k * 2 * Math.PI / 3;
    windRotor.add(arm);
    const blade = addMesh(bladeGeometry, white, arm);
    blade.rotation.y = 0.6;            // leicht angestellt, damit die Blätter von jeder Seite gut zu sehen sind
  }
}

// Unsichtbare, größere Grifffläche für Finger und Maus (Arm und Griff)
export const crankTargets = [];
{
  const invisible = new THREE.MeshBasicMaterial({ visible: false });
  const target = new THREE.Mesh(new THREE.BoxGeometry(CRANK.KNOB_LEN + 3, 3.5, CRANK.ARM + 3), invisible);
  target.position.set(-CRANK.KNOB_LEN / 2, 0, CRANK.ARM / 2 + 0.5);
  crank.add(target);
  crankTargets.push(target);
}

// ---------------- Bürsten (fest): Kohleblöcke drücken von unten auf die Schleifringe

const BRUSH_H = 1.2;
export const brushTerminals = [];
const brushGroup = new THREE.Group();
scene.add(brushGroup);
for (const x of RINGS.X) {
  const brush = addMesh(new THREE.BoxGeometry(0.8, BRUSH_H, 0.9), mat.carbon, brushGroup);
  brush.position.set(x, -RINGS.R - BRUSH_H / 2, 0);
  const holder = addMesh(new THREE.BoxGeometry(0.5, 2.4, 0.5), mat.brass, brushGroup);
  holder.position.set(x, -RINGS.R - BRUSH_H - 1.2, 0);
  const terminal = addMesh(new THREE.SphereGeometry(0.45, 16, 12), mat.brass, brushGroup);
  terminal.position.set(x, -RINGS.R - BRUSH_H - 2.6, 0);
  brushTerminals.push(terminal.position.clone());
}

// ---------------- Feldlinien zwischen den Polen (Erklärmodus, Knopf „B“): Pfeile vom oberen zum unteren Pol;
// bei Südpol oben wird die Gruppe gespiegelt (scale.y = −1), dann zeigen die Spitzen nach oben.

const fieldLines = new THREE.Group();
fieldLines.visible = false;
scene.add(fieldLines);
{
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x1565c0, transparent: true, opacity: 0.4, depthWrite: false });
  const half = MAGNET.GAP / 2, HEAD = 1;
  for (const x of [-4.5, -1.5, 1.5, 4.5]) {
    for (const z of [-5.5, 0, 5.5]) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2 * half - HEAD, 8), lineMat);
      shaft.position.set(x, HEAD / 2, z);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.32, HEAD, 12), lineMat);
      head.rotation.x = Math.PI;
      head.position.set(x, -half + HEAD / 2, z);
      fieldLines.add(shaft, head);
    }
  }
}

// ---------------- Abgleich mit dem Zustand

// Anbau der Schleifringe im Erklärmodus (0 = abgenommen, 1 = angebaut): Ringe gleiten von rechts auf die
// Welle, dann wachsen die Zuleitungen zu den Ringen, zuletzt kommen die Bürsten von unten. Rückwärts beim Abnehmen.
let ringsProgress = 1;
export const ringsAttached = () => ringsProgress >= 1;
const RING_SLIDE = 14, BRUSH_DROP = 7;
const smooth = t => t * t * (3 - 2 * t);
const part = (p, a, b) => smooth(Math.min(1, Math.max(0, (p - a) / (b - a))));

// Sofort an- bzw. abgebaut (z. B. beim Wechsel in den Erklärmodus, ohne Animation)
export function setRingsInstant() {
  ringsProgress = !state.explain || state.showRings ? 1 : 0;
}

// Magnet durchsichtig (nur im Erklärmodus): Polblöcke, Joch und Beschriftungen
let magnetGlass = null;
function syncMagnetGlass() {
  const on = state.explain && state.magnetGlass;
  if (on === magnetGlass) return;
  magnetGlass = on;
  for (const material of [mat.north, mat.south, mat.yoke]) {
    material.transparent = on;
    material.opacity = on ? EXPLAIN.MAGNET_OPACITY : 1;
    material.depthWrite = !on;
    material.needsUpdate = true;
  }
  for (const label of [...upperLabels, ...lowerLabels]) label.material.opacity = on ? EXPLAIN.MAGNET_OPACITY : 1;
}

export function syncModel(dt = 0) {
  rotorGroup.rotation.x = rotor.phi;
  syncMagnetGlass();
  crank.visible = state.drive !== 'wind';
  windRotor.visible = state.drive === 'wind';
  loopNormal.visible = !state.explain;
  loopExplain.visible = state.explain;
  // Schleifringe und Bürsten: im Modell immer, im Erklärmodus erst mit dem Knopf „Schleifringe“ (animiert)
  const target = !state.explain || state.showRings ? 1 : 0;
  if (!state.explain) ringsProgress = 1;
  else ringsProgress += Math.sign(target - ringsProgress) * Math.min(Math.abs(target - ringsProgress), dt / RINGS_ANIM);
  const p = ringsProgress;
  const slide = part(p, 0, 0.45), grow = part(p, 0.45, 0.75), brushes = part(p, 0.75, 1);
  ringsGroup.visible = p > 0;
  ringsGroup.position.x = (1 - slide) * RING_SLIDE;
  explainLeads.visible = state.explain && grow > 0;
  for (const { mesh, solder } of explainLeadParts) {
    const count = mesh.geometry.index.count;
    mesh.geometry.setDrawRange(0, Math.ceil(grow * count / 6) * 6);
    solder.visible = grow >= 1;
  }
  brushGroup.visible = brushes > 0;
  brushGroup.position.y = -(1 - brushes) * BRUSH_DROP;
  fieldLines.visible = state.explain && state.showB;
  fieldLines.scale.y = state.northUp ? 1 : -1;
}
