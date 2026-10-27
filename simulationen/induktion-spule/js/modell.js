// ------------------------------------------------------------------
// Stabmagnet und Spule (freischwebend, Mitten auf der x-Achse). Beide werden entlang der Achse verschoben
// (ziehen.js) und in der Bildebene gedreht (Bedienfeld). Die Spule hat zwei Anschlüsse oben an den Flanschen:
// A rechts, E links – dort beginnen die Kabel (kabel.js). Mit Feldlinien oder B-Pfeil werden Spule und Magnet
// durchsichtig. Die Wicklung wird je nach Windungszahl neu aufgebaut. Bei Windungszahl 1 steht statt der Spule
// eine einzelne Leiterschleife da (Drahtring, die beiden Anschlüsse dicht nebeneinander darüber).
// ------------------------------------------------------------------
import * as THREE from 'three';
import { MAGNET, COIL, TURNS, LOOP, B_ARROW, B_ARROW_REF } from './config.js';
import { state } from './state.js';
import { bodies, coilField } from './physik.js';
import { addMesh, makeLabel, makeTextSprite } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';

const B_COLOR = '#1565c0';

// ---------------- Stabmagnet: rote Hälfte Nordpol, grüne Südpol; im Modell zeigt der Nordpol nach +x.
// magnetGroup: Lage und Drehung; darin magnetBody, beim Umdrehen um die senkrechte Achse gewendet (die
// Beschriftung vorne bleibt lesbar). Die Feldlinien hängen an magnetBody.

export const magnetGroup = new THREE.Group();
scene.add(magnetGroup);
export const magnetBody = new THREE.Group();
magnetGroup.add(magnetBody);
const magnetMat = { north: mat.north.clone(), south: mat.south.clone() };
{
  const half = MAGNET.LENGTH / 2, w = MAGNET.WIDTH;
  const geometry = new THREE.BoxGeometry(half, w, w);
  addMesh(geometry, magnetMat.north, magnetBody).position.x = half / 2;
  addMesh(geometry, magnetMat.south, magnetBody).position.x = -half / 2;
  // N und S vorne, oben und hinten (lesbar aus jeder üblichen Blickrichtung)
  for (const [text, x] of [['N', half * 0.55], ['S', -half * 0.55]]) {
    for (const [y, z, rx, ry] of [[0, w / 2 + 0.02, 0, 0], [w / 2 + 0.02, 0, -Math.PI / 2, 0], [0, -w / 2 - 0.02, 0, Math.PI]]) {
      const label = makeLabel(text, 1.7);
      label.position.set(x, y, z);
      label.rotation.set(rx, ry, 0);
      magnetBody.add(label);
    }
  }
}
// Unsichtbare, etwas größere Grifffläche
export const magnetTarget = new THREE.Mesh(new THREE.BoxGeometry(MAGNET.LENGTH + 1, MAGNET.WIDTH + 2, MAGNET.WIDTH + 2),
  new THREE.MeshBasicMaterial({ visible: false }));
magnetBody.add(magnetTarget);

// ---------------- Spule: durchsichtiger Spulenkörper mit Flanschen, Kupferwicklung, zwei Anschlüsse

export const coilGroup = new THREE.Group();
scene.add(coilGroup);
// spulenTeile: Spulenkörper, Wicklung und Anschlüsse der Spule; schleifenTeile: die Leiterschleife
const spulenTeile = new THREE.Group(), schleifenTeile = new THREE.Group();
coilGroup.add(spulenTeile, schleifenTeile);
const coilMat = { copper: mat.copper.clone(), body: mat.insulator.clone(), flange: mat.housing.clone() };
coilMat.body.transparent = true;
coilMat.body.opacity = 0.35;
coilMat.body.depthWrite = false;
const halfL = COIL.LENGTH / 2;

// Spulenkörper: Rohr (offen, der Magnet passt hindurch) und zwei Flansche mit Loch
{
  const tube = new THREE.CylinderGeometry(COIL.R_INNER + 0.15, COIL.R_INNER + 0.15, COIL.LENGTH + 1.2, 40, 1, true);
  tube.rotateZ(Math.PI / 2);
  addMesh(tube, coilMat.body, spulenTeile);
  const shape = new THREE.Shape().absarc(0, 0, COIL.R_FLANGE, 0, Math.PI * 2, false);
  shape.holes.push(new THREE.Path().absarc(0, 0, COIL.R_INNER, 0, Math.PI * 2, true));
  const flange = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: false, curveSegments: 48 });
  flange.translate(0, 0, -0.25);
  flange.rotateY(Math.PI / 2);
  for (const x of [-halfL - COIL.FLANGE_X / 2 - 0.05, halfL + COIL.FLANGE_X / 2 + 0.05]) addMesh(flange, coilMat.flange, spulenTeile).position.x = x;
}

// Wicklung als Schraubenlinie entlang x; Anfang links oben, Ende rechts oben. Sichtbare Windungen und
// Drahtstärke je nach Windungszahl (mehr Windungen: dünnerer Draht, dichter gewickelt)
class Wendel extends THREE.Curve {
  constructor(windungen) {
    super();
    this.windungen = windungen;
  }
  getPoint(t, ziel = new THREE.Vector3()) {
    const a = t * this.windungen * 2 * Math.PI;
    return ziel.set(-halfL + t * COIL.LENGTH, COIL.R_WIND * Math.cos(a), COIL.R_WIND * Math.sin(a));
  }
}
let wicklung = null, gewickelt = null;
function wickeln() {
  if (gewickelt === state.turns) return;
  gewickelt = state.turns;
  const { shown, wire, loop } = TURNS[state.turns];
  spulenTeile.visible = !loop;
  schleifenTeile.visible = Boolean(loop);
  for (const [name, p] of Object.entries(loop ? terminalLocal.schleife : terminalLocal.spule)) terminalLocal[name].copy(p);
  coilTarget.scale.set(loop ? 4 / (COIL.LENGTH + 2) : 1, 1, 1);   // Grifffläche: schmal bei der Leiterschleife
  if (loop) return;
  if (wicklung) {
    wicklung.geometry.dispose();
    spulenTeile.remove(wicklung);
  }
  wicklung = addMesh(new THREE.TubeGeometry(new Wendel(shown), shown * 40, wire, 8, false), coilMat.copper, spulenTeile);
}

function wire(points, radius, material, parent) {
  const path = new THREE.CurvePath();
  for (let i = 1; i < points.length; i++) {
    path.add(new THREE.LineCurve3(new THREE.Vector3(...points[i - 1]), new THREE.Vector3(...points[i])));
  }
  return addMesh(new THREE.TubeGeometry(path, 24 * points.length, radius, 10, false), material, parent);
}

// Anschlüsse (Messingknöpfe mit Schild), in Koordinaten der Spule: bei der Spule oben auf den Flanschen, A rechts,
// E links; bei der Leiterschleife dicht nebeneinander über dem Ring. terminalLocal.a/.e gelten für das gerade
// gezeigte Teil (wickeln() setzt sie um, kabel.js liest sie).
const TERMINAL_Y = COIL.R_FLANGE + 0.5;
const ANSCHLUESSE = {
  spule: { a: new THREE.Vector3(halfL + 0.35, TERMINAL_Y, 0), e: new THREE.Vector3(-halfL - 0.35, TERMINAL_Y, 0) },
  schleife: { a: new THREE.Vector3(LOOP.TERMINAL_X, LOOP.TERMINAL_Y, 0), e: new THREE.Vector3(-LOOP.TERMINAL_X, LOOP.TERMINAL_Y, 0) },
};
export const terminalLocal = { a: ANSCHLUESSE.spule.a.clone(), e: ANSCHLUESSE.spule.e.clone(), ...ANSCHLUESSE };
for (const [name, p] of Object.entries(ANSCHLUESSE.spule)) {
  const knob = addMesh(new THREE.SphereGeometry(0.45, 16, 12), mat.brass, spulenTeile);
  knob.position.copy(p);
  const inward = -Math.sign(p.x);
  wire([[p.x + inward * 0.9, COIL.R_WIND, 0], [p.x + inward * 0.9, TERMINAL_Y - 0.6, 0], [p.x, TERMINAL_Y, 0]], 0.13, coilMat.copper, spulenTeile);
  const schild = makeTextSprite(name.toUpperCase(), 1.1, '#4a5866');
  schild.position.set(p.x - inward * 1.1, TERMINAL_Y + 0.4, 0);
  spulenTeile.add(schild);
}

// Leiterschleife: Drahtring in der Ebene quer zur Achse (oben eine kleine Lücke), zwei Zuleitungen nach oben zu den
// Anschlüssen (E links, A rechts)
{
  const r = TURNS[1].wire, LUECKE = 0.35;   // halbe Lücke oben im Ring (Bogenmaß)
  const ring = new THREE.TorusGeometry(COIL.R_WIND, r, 12, 96, 2 * Math.PI - 2 * LUECKE);
  ring.rotateZ(Math.PI / 2 + LUECKE);   // Lücke oben (bei +y)
  ring.rotateY(Math.PI / 2);            // Ring in der y-z-Ebene, Achse entlang x
  addMesh(ring, coilMat.copper, schleifenTeile);
  for (const [name, p] of Object.entries(ANSCHLUESSE.schleife)) {
    const seite = name === 'a' ? 1 : -1;   // A: Ringende vorne, E: hinten
    const ende = [0, COIL.R_WIND * Math.cos(LUECKE), seite * COIL.R_WIND * Math.sin(LUECKE)];
    wire([ende, [0, COIL.R_WIND + 0.4, ende[2] * 0.5], [p.x * 0.6, TERMINAL_Y - 1.2, 0], [p.x, TERMINAL_Y, 0]], r * 0.8, coilMat.copper, schleifenTeile);
    const knob = addMesh(new THREE.SphereGeometry(0.4, 16, 12), mat.brass, schleifenTeile);
    knob.position.copy(p);
    const schild = makeTextSprite(name.toUpperCase(), 1.1, '#4a5866');
    schild.position.set(p.x + Math.sign(p.x) * 1.1, TERMINAL_Y + 0.4, 0);
    schleifenTeile.add(schild);
  }
  schleifenTeile.visible = false;
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
  for (const [material, opacity] of [[coilMat.copper, 0.5], [coilMat.flange, 0.65], [magnetMat.north, 0.45], [magnetMat.south, 0.45]]) {
    material.transparent = on;
    material.opacity = on ? opacity : 1;
    material.depthWrite = !on;
    material.needsUpdate = true;   // Umschalten auf durchsichtig braucht ein neues Shaderprogramm
  }
}

export function syncModel() {
  magnetGroup.position.x = bodies.magnet.x;
  magnetGroup.rotation.z = bodies.magnet.angle;
  magnetBody.rotation.y = state.northRight ? 0 : Math.PI;
  magnetGroup.position.y = bodies.magnet.y;
  coilGroup.position.x = bodies.coil.x;
  coilGroup.position.y = bodies.coil.y;
  coilGroup.rotation.z = bodies.coil.angle;
  wickeln();
  const sehen = state.showField || state.showB;
  if (durchsichtig !== sehen) setSeeThrough(durchsichtig = sehen);
  if (state.showB) setArrow(coilField() / B_ARROW_REF * B_ARROW);
  else arrow.visible = false;
  bLabel.visible = state.showB && arrow.visible;
}
