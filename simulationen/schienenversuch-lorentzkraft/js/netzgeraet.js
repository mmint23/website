// ------------------------------------------------------------------
// Netzgerät und Kabel zu den Schienen
// ------------------------------------------------------------------
import * as THREE from 'three';
import { RAIL_GAP, RAIL_LEN, I_MAX } from './config.js';
import { state, currentSetup } from './state.js';
import { addMesh, makeLabel, formatAmpere } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';

const supply = new THREE.Group();
supply.position.set(-44, 0, -50);
scene.add(supply);

const housing = addMesh(new THREE.BoxGeometry(26, 14, 16), mat.housing, supply);
housing.position.set(0, 7.5, 0);
for (const x of [-11, 11]) for (const z of [-6, 6]) {
  const foot = addMesh(new THREE.CylinderGeometry(0.8, 0.8, 0.5, 12), mat.knob, supply);
  foot.position.set(x, 0.25, z);
}
const panel = addMesh(new THREE.BoxGeometry(24, 12, 0.3), mat.panel, supply);
panel.position.set(0, 7.5, 8.1);

// Anzeige der Stromstärke
const displayCanvas = document.createElement('canvas');
displayCanvas.width = 256;
displayCanvas.height = 96;
const displayTexture = new THREE.CanvasTexture(displayCanvas);
displayTexture.colorSpace = THREE.SRGBColorSpace;
function drawDisplay(text) {
  const ctx = displayCanvas.getContext('2d');
  ctx.fillStyle = '#0d1a0d';
  ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = '#5dff6a';
  ctx.font = 'bold 64px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 240, 52);
  displayTexture.needsUpdate = true;
}
const display = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.75), new THREE.MeshBasicMaterial({ map: displayTexture }));
display.position.set(-4.5, 10, 8.27);
supply.add(display);

// Drehknopf
const knob = addMesh(new THREE.CylinderGeometry(1.8, 1.8, 1.4, 32), mat.knob, supply);
knob.rotation.x = Math.PI / 2;
knob.position.set(6.5, 10, 8.9);
const knobMark = addMesh(new THREE.BoxGeometry(0.3, 0.1, 1.2), mat.panel, knob);
knobMark.position.set(0, 0.72, -1);

// Buchsen: Plus (rot) und Minus (blau)
const SOCKET_PLUS = new THREE.Vector3(-7, 4, 8.3);
const SOCKET_MINUS = new THREE.Vector3(1, 4, 8.3);
const socketPlus = addMesh(new THREE.CylinderGeometry(1, 1, 1.2, 20), mat.cableRed, supply);
socketPlus.rotation.x = Math.PI / 2;
socketPlus.position.copy(SOCKET_PLUS).add(new THREE.Vector3(0, 0, 0.6));
const socketMinus = addMesh(new THREE.CylinderGeometry(1, 1, 1.2, 20), mat.cableBlue, supply);
socketMinus.rotation.x = Math.PI / 2;
socketMinus.position.copy(SOCKET_MINUS).add(new THREE.Vector3(0, 0, 0.6));

const plusLabel = makeLabel('+', 2.6, '#c62828');
plusLabel.position.set(SOCKET_PLUS.x - 2.6, SOCKET_PLUS.y + 0.1, 8.27);
supply.add(plusLabel);
const minusLabel = makeLabel('−', 2.6, '#1e5bc6');
minusLabel.position.set(SOCKET_MINUS.x - 2.6, SOCKET_MINUS.y + 0.1, 8.27);
supply.add(minusLabel);

// Netzschalter mit Kontrolllampe
const powerSwitch = addMesh(new THREE.BoxGeometry(2.4, 1.6, 0.8), mat.knob, supply);
powerSwitch.position.set(8, 4, 8.6);
const led = addMesh(new THREE.SphereGeometry(0.5, 16, 12), mat.ledOff, supply);
led.position.set(8, 6.2, 8.3);

// Anzeige, Kontrolllampe, Schalter und Drehknopf passend zum Zustand
export function updateSupply() {
  drawDisplay(formatAmpere(state.powerOn ? state.current : 0));
  led.material = state.powerOn ? mat.ledOn : mat.ledOff;
  powerSwitch.rotation.x = state.powerOn ? -0.35 : 0.35;
  // Drehknopf: 0 A links unten (−135°), I_MAX rechts unten (+135°)
  const angle = (-0.75 + 1.5 * state.current / I_MAX) * Math.PI;
  knob.rotation.y = -angle;
}

// ------------------------------------------------------------------
// Kabel vom Netzgerät zu den Schienenenden
// ------------------------------------------------------------------
function makeCable(points, material) {
  const rough = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
  // Kabel darf nicht in den Tisch eintauchen
  const samples = rough.getSpacedPoints(200).map(p => { p.y = Math.max(p.y, 0.35); return p; });
  const curve = new THREE.CatmullRomCurve3(samples);
  return addMesh(new THREE.TubeGeometry(curve, 240, 0.35, 12, false), material, scene);
}
const plusWorld = SOCKET_PLUS.clone().add(supply.position).add(new THREE.Vector3(0, 0, 1.2));
const minusWorld = SOCKET_MINUS.clone().add(supply.position).add(new THREE.Vector3(0, 0, 1.2));
const railEndX = -RAIL_LEN / 2 - 1.6;
const nearZ = -RAIL_GAP / 2;   // hintere Schiene (näher am Netzgerät)
const farZ = RAIL_GAP / 2;     // vordere Schiene

// Polung +1: Plus (rot) an vorderer, Minus (blau) an hinterer Schiene.
// Polung −1: Kabel an den Schienen vertauscht, das blaue Kabel liegt dabei über dem roten.
const cableRoutes = railY => ({
  [1]: {
    red: [
      [-48, 0.4, -5],
      [-40, 0.4, farZ],
      [railEndX - 2, 0.4, farZ],
      [railEndX - 1.2, railY - 4, farZ],
      [railEndX, railY, farZ],
    ],
    blue: [
      [-37, 0.4, nearZ - 4],
      [railEndX - 2, 0.4, nearZ],
      [railEndX - 1.2, railY - 4, nearZ],
      [railEndX, railY, nearZ],
    ],
  },
  [-1]: {
    red: [
      [-42, 0.4, -18],
      [railEndX - 2, 0.4, nearZ],
      [railEndX - 1.2, railY - 4, nearZ],
      [railEndX, railY, nearZ],
    ],
    blue: [
      [-45.3, 1.3, -25],
      [-49, 0.4, -12],
      [-46, 0.4, 4],
      [-40, 0.4, farZ],
      [railEndX - 2, 0.4, farZ],
      [railEndX - 1.2, railY - 4, farZ],
      [railEndX, railY, farZ],
    ],
  },
});

let cables = [];
export function buildCables() {
  for (const cable of cables) {
    scene.remove(cable);
    cable.geometry.dispose();
  }
  const route = cableRoutes(currentSetup().railY)[state.polarity];
  const start = socket => [
    socket.toArray(),
    [socket.x, socket.y - 0.5, socket.z + 3],
    [socket.x + 1, 0.4, socket.z + 7],
  ];
  cables = [
    makeCable([...start(plusWorld), ...route.red], mat.cableRed),
    makeCable([...start(minusWorld), ...route.blue], mat.cableBlue),
  ];
}
