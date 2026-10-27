// ------------------------------------------------------------------
// Innenpolgenerator (freischwebend): In der Mitte dreht sich ein Stabmagnet (Polrad) auf der Welle, außen
// stehen Spulen mit Eisenkern fest – Spule 1 oben, bei zwei Spulen Spule 2 unten, dann mit Eisenjoch (Ring).
// Was sich dreht, hängt in rotorGroup (Drehung um die z-Achse). Jede Spule hat zwei Anschlüsse: A (Anfang der
// Wicklung, innen, rechts) und E (Ende der Wicklung, außen, links); dort beginnen die Kabel (messgeraet.js).
// ------------------------------------------------------------------
import * as THREE from 'three';
import { MAGNET, COIL, YOKE, SHAFT, CRANK, B_MAX, B_ARROW } from './config.js';
import { state } from './state.js';
import { rotor, coilField } from './physik.js';
import { addMesh, makeLabel, makeTextSprite } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';

const B_COLOR = '#1565c0';

// ---------------- Polrad: Stabmagnet auf der Welle, Kurbel vorne

export const rotorGroup = new THREE.Group();
scene.add(rotorGroup);

const shaft = addMesh(new THREE.CylinderGeometry(SHAFT.R, SHAFT.R, SHAFT.Z_MAX - SHAFT.Z_MIN, 24), mat.steel, rotorGroup);
shaft.rotation.x = Math.PI / 2;
shaft.position.z = (SHAFT.Z_MIN + SHAFT.Z_MAX) / 2;

// eigene Materialien, damit der Magnet für die Feldlinien durchsichtig werden kann
const magnetMat = { north: mat.north.clone(), south: mat.south.clone() };
{
  const half = MAGNET.LENGTH / 2;
  const geometry = new THREE.BoxGeometry(MAGNET.WIDTH, half, MAGNET.DEPTH);
  addMesh(geometry, magnetMat.north, rotorGroup).position.y = half / 2;
  addMesh(geometry, magnetMat.south, rotorGroup).position.y = -half / 2;
  for (const [text, y] of [['N', half * 0.6], ['S', -half * 0.6]]) {
    const label = makeLabel(text, 2.6);
    label.position.set(0, y, MAGNET.DEPTH / 2 + 0.02);
    rotorGroup.add(label);
  }
}

// Kurbel: Arm 90° neben dem Nordpol (nach links bei φ = 0), Griff nach vorne
const crank = new THREE.Group();
crank.position.z = CRANK.Z;
crank.rotation.z = CRANK.OFFSET;
rotorGroup.add(crank);
const arm = addMesh(new THREE.BoxGeometry(0.8, CRANK.ARM + 0.8, 0.8), mat.steel, crank);
arm.position.y = CRANK.ARM / 2;
const grip = addMesh(new THREE.CylinderGeometry(0.6, 0.6, CRANK.KNOB_LEN, 20), mat.wood, crank);
grip.rotation.x = Math.PI / 2;
grip.position.set(0, CRANK.ARM, CRANK.KNOB_LEN / 2 + 0.4);

// Unsichtbare, größere Grifffläche für Finger und Maus (Arm und Griff)
export const crankTargets = [];
{
  const target = new THREE.Mesh(new THREE.BoxGeometry(3.5, CRANK.ARM + 3, CRANK.KNOB_LEN + 2.5),
    new THREE.MeshBasicMaterial({ visible: false }));
  target.position.set(0, CRANK.ARM / 2 + 0.5, CRANK.KNOB_LEN / 2);
  crank.add(target);
  crankTargets.push(target);
}

// ---------------- Spulen mit Eisenkern (stehen fest)

// Wicklung als Schraubenlinie um den Kern; Anfang und Ende vorne (z > 0), damit die Zuleitungen sichtbar sind
class Wendel extends THREE.Curve {
  getPoint(t, ziel = new THREE.Vector3()) {
    const a = Math.PI / 2 + t * COIL.TURNS_SHOWN * 2 * Math.PI;
    return ziel.set(COIL.WIND_R * Math.cos(a), COIL.WIND_IN + t * (COIL.WIND_OUT - COIL.WIND_IN), COIL.WIND_R * Math.sin(a));
  }
}

function wire(points, radius, material, parent) {
  const path = new THREE.CurvePath();
  for (let i = 1; i < points.length; i++) {
    path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i - 1]), new THREE.Vector3(...points[i])));
  }
  return addMesh(new THREE.TubeGeometry(path, 24 * points.length, radius, 10, false), material, parent);
}

// Pfeil entlang der Spulenachse für B (Länge und Richtung werden in syncModel gesetzt); immer sichtbar,
// auch durch die (dann durchsichtige) Wicklung hindurch
function makeArrow(color) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true });
  const shaftMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1, 12), material);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.2, 16), material);
  for (const m of [shaftMesh, head]) {
    m.renderOrder = 10;
    group.add(m);
  }
  group.userData = { shaftMesh, head };
  return group;
}
function setArrow(arrow, length) {
  const { shaftMesh, head } = arrow.userData;
  const l = Math.abs(length), HEAD = 1.2;
  arrow.visible = l > 0.25;
  if (!arrow.visible) return;
  const sign = Math.sign(length);
  const shaftLength = Math.max(l - HEAD, 0.01);
  shaftMesh.scale.y = shaftLength;
  shaftMesh.position.y = sign * (-l / 2 + shaftLength / 2);
  head.position.y = sign * (l / 2 - HEAD / 2);
  head.rotation.z = sign > 0 ? 0 : Math.PI;
}

export const terminals = [];   // je Spule { a, e } als Weltkoordinaten
const coils = [];
COIL.THETA.forEach((theta, k) => {
  const group = new THREE.Group();
  group.rotation.z = theta;
  scene.add(group);
  // eigene Materialien, damit Wicklung und Kern für den B-Pfeil durchsichtig werden können
  const copper = mat.copper.clone();
  const iron = mat.iron.clone();
  const insulator = mat.insulator.clone();

  // Eisenkern mit Polschuh zum Magneten hin
  const shoeH = 0.9;
  const shoe = addMesh(new THREE.BoxGeometry(5.4, shoeH, 3.8), iron, group);
  shoe.position.y = COIL.CORE_IN + shoeH / 2;
  const coreLength = COIL.CORE_OUT - COIL.CORE_IN - shoeH;
  const core = addMesh(new THREE.CylinderGeometry(COIL.CORE_R, COIL.CORE_R, coreLength, 28), iron, group);
  core.position.y = COIL.CORE_IN + shoeH + coreLength / 2;
  // Spulenkörper (Flansche) und Wicklung
  for (const y of [COIL.WIND_IN - 0.45, COIL.WIND_OUT + 0.45]) {
    addMesh(new THREE.CylinderGeometry(3.1, 3.1, 0.3, 32), insulator, group).position.y = y;
  }
  addMesh(new THREE.TubeGeometry(new Wendel(), COIL.TURNS_SHOWN * 40, 0.24, 8, false), copper, group);
  // Zuleitungen vom Anfang der Wicklung (innen) zu A und vom Ende (außen) zu E; Anschlüsse als Messingknöpfe
  // mit Schild. Bei Spule 2 (gedreht um 180°) liegen A und E in Weltkoordinaten wieder rechts bzw. links.
  const flip = Math.cos(theta) < 0 ? -1 : 1;
  const tx = flip * COIL.TERMINAL_X, ty = COIL.TERMINAL_Y, tz = COIL.TERMINAL_Z;
  const front = COIL.WIND_R + 0.55;
  wire([[0, COIL.WIND_IN, COIL.WIND_R], [0, COIL.WIND_IN, front], [tx, COIL.WIND_OUT + 0.2, front], [tx, ty, tz]], 0.16, copper, group);
  wire([[0, COIL.WIND_OUT, COIL.WIND_R], [-tx, COIL.WIND_OUT + 0.4, tz], [-tx, ty, tz]], 0.16, copper, group);
  const ends = {};
  for (const [name, x] of [['a', tx], ['e', -tx]]) {
    const knob = addMesh(new THREE.SphereGeometry(0.45, 16, 12), mat.brass, group);
    knob.position.set(x, ty, tz);
    ends[name] = knob;
    const schild = makeTextSprite(name.toUpperCase(), 1.15, '#4a5866');
    schild.position.set(x * 2.6, ty - 1.1, tz + 0.5);
    group.add(schild);
  }
  // B im Kern: Pfeil in der Mitte der Wicklung, Beschriftung daneben
  const arrow = makeArrow(B_COLOR);
  arrow.position.y = (COIL.WIND_IN + COIL.WIND_OUT) / 2;
  group.add(arrow);
  const bLabel = makeTextSprite('B', 2.2, B_COLOR);
  group.add(bLabel);
  bLabel.position.set(-4.4, arrow.position.y + 1.2, 0);
  const name = makeTextSprite(`Spule ${k + 1}`, 1.8, '#4a5866');
  group.add(name);
  name.position.set(6.6, (COIL.WIND_IN + COIL.WIND_OUT) / 2, 0);
  coils.push({ group, copper, iron, insulator, arrow, bLabel });
  group.updateMatrixWorld(true);
  terminals.push({
    a: ends.a.getWorldPosition(new THREE.Vector3()),
    e: ends.e.getWorldPosition(new THREE.Vector3()),
  });
});

// Eisenjoch: Ring außen um die Spulen (bei zwei Spulen), schließt den magnetischen Kreis
const yoke = (() => {
  const shape = new THREE.Shape().absarc(0, 0, YOKE.R_OUT, 0, Math.PI * 2, false);
  shape.holes.push(new THREE.Path().absarc(0, 0, YOKE.R_IN, 0, Math.PI * 2, true));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: YOKE.DEPTH, bevelEnabled: false, curveSegments: 72 });
  geometry.translate(0, 0, -YOKE.DEPTH / 2);
  return addMesh(geometry, mat.yoke.clone(), scene);
})();

// ---------------- Abgleich mit dem Zustand

function setSeeThrough(pairs, on) {
  for (const [material, opacity] of pairs) {
    material.transparent = on;
    material.opacity = on ? opacity : 1;
    material.depthWrite = !on;
  }
}
const coilParts = coil => [[coil.copper, 0.32], [coil.iron, 0.22], [coil.insulator, 0.3]];
let seeThrough = null, magnetSeeThrough = null;

export function syncModel() {
  rotorGroup.rotation.z = rotor.phi;
  const two = state.coils === 2;
  coils[1].group.visible = two;
  yoke.visible = two;
  // Spulen durchsichtig für den B-Pfeil und die Feldlinien; Magnet und Joch nur für die Feldlinien
  const durchsichtig = state.showB || state.showField;
  if (seeThrough !== durchsichtig) {
    seeThrough = durchsichtig;
    for (const coil of coils) setSeeThrough(coilParts(coil), durchsichtig);
  }
  if (magnetSeeThrough !== state.showField) {
    magnetSeeThrough = state.showField;
    setSeeThrough([[magnetMat.north, 0.45], [magnetMat.south, 0.45], [yoke.material, 0.3]], state.showField);
  }
  coils.forEach((coil, k) => {
    coil.arrow.visible = coil.bLabel.visible = state.showB;
    if (state.showB) setArrow(coil.arrow, coilField(k) / B_MAX * B_ARROW);
    coil.bLabel.visible = state.showB && coil.arrow.visible;
  });
}
