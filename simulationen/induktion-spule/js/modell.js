// ------------------------------------------------------------------
// Stabmagnet und Spule (freischwebend auf der gemeinsamen x-Achse). Beide werden nur entlang der Achse
// verschoben (ziehen.js). Die Spule hat zwei Anschlüsse oben an den Flanschen: A rechts, E links – dort beginnen
// die Kabel zum Messgerät (messgeraet.js). Mit Feldlinien oder B-Pfeil werden Spule und Magnet durchsichtig.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { MAGNET, COIL, B_ARROW, B_ARROW_REF } from './config.js';
import { state } from './state.js';
import { bodies, coilField } from './physik.js';
import { addMesh, makeLabel, makeTextSprite } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';

const B_COLOR = '#1565c0';

// ---------------- Stabmagnet: rote Hälfte Nordpol, grüne Südpol; im Modell zeigt der Nordpol nach +x

export const magnetGroup = new THREE.Group();
scene.add(magnetGroup);
const magnetMat = { north: mat.north.clone(), south: mat.south.clone() };
{
  const half = MAGNET.LENGTH / 2, w = MAGNET.WIDTH;
  const geometry = new THREE.BoxGeometry(half, w, w);
  addMesh(geometry, magnetMat.north, magnetGroup).position.x = half / 2;
  addMesh(geometry, magnetMat.south, magnetGroup).position.x = -half / 2;
  // N und S vorne, oben und hinten (lesbar aus jeder üblichen Blickrichtung)
  for (const [text, x] of [['N', half * 0.55], ['S', -half * 0.55]]) {
    for (const [y, z, rx, ry] of [[0, w / 2 + 0.02, 0, 0], [w / 2 + 0.02, 0, -Math.PI / 2, 0], [0, -w / 2 - 0.02, 0, Math.PI]]) {
      const label = makeLabel(text, 1.7);
      label.position.set(x, y, z);
      label.rotation.set(rx, ry, 0);
      magnetGroup.add(label);
    }
  }
}
// Unsichtbare, etwas größere Grifffläche
export const magnetTarget = new THREE.Mesh(new THREE.BoxGeometry(MAGNET.LENGTH + 1, MAGNET.WIDTH + 2, MAGNET.WIDTH + 2),
  new THREE.MeshBasicMaterial({ visible: false }));
magnetGroup.add(magnetTarget);

// ---------------- Spule: durchsichtiger Spulenkörper mit Flanschen, Kupferwicklung, zwei Anschlüsse

export const coilGroup = new THREE.Group();
scene.add(coilGroup);
const coilMat = { copper: mat.copper.clone(), body: mat.insulator.clone(), flange: mat.housing.clone() };
coilMat.body.transparent = true;
coilMat.body.opacity = 0.35;
coilMat.body.depthWrite = false;
const halfL = COIL.LENGTH / 2;

// Spulenkörper: Rohr (offen, der Magnet passt hindurch) und zwei Flansche mit Loch
{
  const tube = new THREE.CylinderGeometry(COIL.R_INNER + 0.15, COIL.R_INNER + 0.15, COIL.LENGTH + 1.2, 40, 1, true);
  tube.rotateZ(Math.PI / 2);
  addMesh(tube, coilMat.body, coilGroup);
  const shape = new THREE.Shape().absarc(0, 0, COIL.R_FLANGE, 0, Math.PI * 2, false);
  shape.holes.push(new THREE.Path().absarc(0, 0, COIL.R_INNER, 0, Math.PI * 2, true));
  const flange = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false, curveSegments: 48 });
  flange.translate(0, 0, -0.25);
  flange.rotateY(Math.PI / 2);
  for (const x of [-halfL - 0.35, halfL + 0.35]) addMesh(flange, coilMat.flange, coilGroup).position.x = x;
}

// Wicklung als Schraubenlinie entlang x; Anfang links oben, Ende rechts oben
class Wendel extends THREE.Curve {
  getPoint(t, ziel = new THREE.Vector3()) {
    const a = t * COIL.TURNS_SHOWN * 2 * Math.PI;
    return ziel.set(-halfL + t * COIL.LENGTH, COIL.R_WIND * Math.cos(a), COIL.R_WIND * Math.sin(a));
  }
}
addMesh(new THREE.TubeGeometry(new Wendel(), COIL.TURNS_SHOWN * 40, 0.17, 8, false), coilMat.copper, coilGroup);

function wire(points, radius, material, parent) {
  const path = new THREE.CurvePath();
  for (let i = 1; i < points.length; i++) {
    path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i - 1]), new THREE.Vector3(...points[i])));
  }
  return addMesh(new THREE.TubeGeometry(path, 24 * points.length, radius, 10, false), material, parent);
}

// Anschlüsse oben auf den Flanschen (Messingknöpfe mit Schild): A rechts, E links – in Koordinaten der Spule
const TERMINAL_Y = COIL.R_FLANGE + 0.5;
export const terminalLocal = { a: new THREE.Vector3(halfL + 0.35, TERMINAL_Y, 0), e: new THREE.Vector3(-halfL - 0.35, TERMINAL_Y, 0) };
for (const [name, p] of Object.entries(terminalLocal)) {
  const knob = addMesh(new THREE.SphereGeometry(0.45, 16, 12), mat.brass, coilGroup);
  knob.position.copy(p);
  const inward = -Math.sign(p.x);
  wire([[p.x + inward * 0.9, COIL.R_WIND, 0], [p.x + inward * 0.9, TERMINAL_Y - 0.6, 0], [p.x, TERMINAL_Y, 0]], 0.13, coilMat.copper, coilGroup);
  const schild = makeTextSprite(name.toUpperCase(), 1.1, '#4a5866');
  schild.position.set(p.x - inward * 1.1, TERMINAL_Y + 0.4, 0);
  coilGroup.add(schild);
}

export const coilTarget = new THREE.Mesh(new THREE.BoxGeometry(COIL.LENGTH + 2, 2 * COIL.R_FLANGE + 1, 2 * COIL.R_FLANGE + 1),
  new THREE.MeshBasicMaterial({ visible: false }));
coilGroup.add(coilTarget);

// ---------------- Pfeil für B im Spuleninneren (entlang der Achse, immer sichtbar)

const arrow = new THREE.Group();
{
  const material = new THREE.MeshBasicMaterial({ color: B_COLOR, depthTest: false, transparent: true });
  const shaftMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1, 12), material);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.2, 16), material);
  for (const m of [shaftMesh, head]) {
    m.renderOrder = 10;
    m.rotation.z = -Math.PI / 2;   // Kegelspitze nach +x
    arrow.add(m);
  }
  arrow.userData = { shaftMesh, head };
}
coilGroup.add(arrow);
const bLabel = makeTextSprite('B', 1.8, B_COLOR);
bLabel.position.set(0, -COIL.R_FLANGE - 1.3, 0);
coilGroup.add(bLabel);

function setArrow(length) {
  const { shaftMesh, head } = arrow.userData;
  const l = Math.abs(length), HEAD = 1.2;
  arrow.visible = l > 0.25;
  if (!arrow.visible) return;
  const sign = Math.sign(length);
  const shaftLength = Math.max(l - HEAD, 0.01);
  shaftMesh.scale.y = shaftLength;
  shaftMesh.position.x = sign * (-l / 2 + shaftLength / 2);
  head.position.x = sign * (l / 2 - HEAD / 2);
  head.rotation.z = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
}

// ---------------- Abgleich mit dem Zustand (jedes Bild)

let durchsichtig = null;
function setSeeThrough(on) {
  for (const [material, opacity] of [[coilMat.copper, 0.22], [coilMat.flange, 0.4], [magnetMat.north, 0.45], [magnetMat.south, 0.45]]) {
    material.transparent = on;
    material.opacity = on ? opacity : 1;
    material.depthWrite = !on;
    material.needsUpdate = true;   // Umschalten auf durchsichtig braucht ein neues Shaderprogramm
  }
}

export function syncModel() {
  magnetGroup.position.x = bodies.magnet.x;
  magnetGroup.rotation.y = state.northRight ? 0 : Math.PI;
  coilGroup.position.x = bodies.coil.x;
  const sehen = state.showField || state.showB;
  if (durchsichtig !== sehen) setSeeThrough(durchsichtig = sehen);
  if (state.showB) setArrow(coilField() / B_ARROW_REF * B_ARROW);
  else arrow.visible = false;
  bLabel.visible = state.showB && arrow.visible;
}
