// ------------------------------------------------------------------
// Großes Demonstrations-Zeigermessgerät (Nullpunkt in der Mitte) und Kabel zur Leiterschaukel
// ------------------------------------------------------------------
import * as THREE from 'three';
import { METER } from './config.js';
import { state } from './state.js';
import { needle } from './physik.js';
import { addMesh, makeLabel, formatNumber } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';
import { socketPoint } from './aufbau.js';
import { ledSocket, setLedVisible } from './led.js';
import { lampSocket, setLampVisible } from './gluehlampe.js';

// Das Messgerät steht auf dem Tisch und lässt sich um die senkrechte Achse drehen (Ziehen oder Knopf)
const meter = new THREE.Group();
meter.position.set(40, 0, 8);
meter.rotation.y = state.meterAngle;
scene.add(meter);
const CABLE_CLEARANCE = 20;         // Kabel laufen in diesem Abstand um das Gerät herum (Gehäuseecken: 16,2 cm)

const W = 30, H = 27, D = 12, FRONT = D / 2;
const housing = addMesh(new THREE.BoxGeometry(W, H, D), mat.housing, meter);
housing.position.y = H / 2 + 0.8;
// Flächen, an denen man das Messgerät zum Drehen greifen kann
export const meterTargets = [housing];
for (const x of [-12, 12]) for (const z of [-4, 4]) {
  const foot = addMesh(new THREE.CylinderGeometry(1, 1, 0.8, 16), mat.knob, meter);
  foot.position.set(x, 0.4, z);
}

// ---------------- Skala (Canvas), Drehpunkt des Zeigers 1 cm über der Unterkante der Skala

const DIAL_W = 27, DIAL_H = 16, DIAL_Y = 18.5, PX = 40;          // PX: Pixel pro cm
const PIVOT_Y = DIAL_Y - DIAL_H / 2 + 1;
const ARC_R = 12;                                                // Radius des Skalenbogens in cm
const dialCanvas = document.createElement('canvas');
dialCanvas.width = DIAL_W * PX;
dialCanvas.height = DIAL_H * PX;
const dialTexture = new THREE.CanvasTexture(dialCanvas);
dialTexture.colorSpace = THREE.SRGBColorSpace;
dialTexture.anisotropy = 8;

// Teilung je Messbereich: Abstand der beschrifteten und der kleinen Striche
const DIVISIONS = { 1: [0.5, 0.1], 3: [1, 0.2], 10: [2, 0.5] };

function drawDial() {
  const ctx = dialCanvas.getContext('2d');
  const cx = dialCanvas.width / 2, cy = dialCanvas.height - PX;
  const full = THREE.MathUtils.degToRad(METER.FULL_ANGLE);
  const range = state.range;
  const [major, minor] = DIVISIONS[range];
  const unit = state.meterMode === 'U' ? 'mV' : 'mA';
  ctx.fillStyle = '#fbfaf5';
  ctx.fillRect(0, 0, dialCanvas.width, dialCanvas.height);
  ctx.strokeStyle = ctx.fillStyle = '#1d2733';
  // Skalenbogen
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, ARC_R * PX, -Math.PI / 2 - full, -Math.PI / 2 + full);
  ctx.stroke();
  // Striche und Zahlen
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const steps = Math.round(range / minor);
  for (let i = -steps; i <= steps; i++) {
    const value = i * minor;
    const a = full * value / range;
    const isMajor = Math.abs(value / major - Math.round(value / major)) < 1e-6;
    const r0 = ARC_R * PX, r1 = r0 - (isMajor ? 1.2 : 0.6) * PX;
    ctx.lineWidth = isMajor ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(cx + r0 * Math.sin(a), cy - r0 * Math.cos(a));
    ctx.lineTo(cx + r1 * Math.sin(a), cy - r1 * Math.cos(a));
    ctx.stroke();
    if (isMajor) {
      const rt = r0 - 2 * PX;
      const text = formatNumber(Math.abs(value), major < 1 ? 1 : 0).replace(',0', '');
      ctx.fillText(value < 0 ? '−' + text : text, cx + rt * Math.sin(a), cy - rt * Math.cos(a));
    }
  }
  // Einheit und Messgröße
  ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.fillText(unit, cx, cy - 5.6 * PX);
  ctx.font = '36px system-ui, sans-serif';
  ctx.fillStyle = '#4a5866';
  ctx.fillText(state.meterMode === 'U' ? 'Spannung' : 'Stromstärke', cx, cy - 4 * PX);
  dialTexture.needsUpdate = true;
}

const dial = new THREE.Mesh(new THREE.PlaneGeometry(DIAL_W, DIAL_H), new THREE.MeshBasicMaterial({ map: dialTexture }));
dial.position.set(0, DIAL_Y, FRONT + 0.02);
meter.add(dial);
meterTargets.push(dial);
// Rahmen um die Skala
for (const [w, h, x, y] of [[DIAL_W + 1, 0.5, 0, DIAL_Y + DIAL_H / 2 + 0.25], [DIAL_W + 1, 0.5, 0, DIAL_Y - DIAL_H / 2 - 0.25],
  [0.5, DIAL_H, -DIAL_W / 2 - 0.25, DIAL_Y], [0.5, DIAL_H, DIAL_W / 2 + 0.25, DIAL_Y]]) {
  const frame = addMesh(new THREE.BoxGeometry(w, h, 0.6), mat.knob, meter);
  frame.position.set(x, y, FRONT + 0.3);
}

// Zeiger mit Gegengewicht, dreht sich um eine Achse senkrecht zur Skala
const needleGroup = new THREE.Group();
needleGroup.position.set(0, PIVOT_Y, FRONT + 0.25);
meter.add(needleGroup);
const pointer = addMesh(new THREE.BoxGeometry(0.16, ARC_R + 0.3, 0.06), mat.needle, needleGroup);
pointer.position.y = (ARC_R + 0.3) / 2;
const counterweight = addMesh(new THREE.BoxGeometry(0.6, 1.4, 0.1), mat.needle, needleGroup);
counterweight.position.y = -0.5;
const cap = addMesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 20), mat.knob, needleGroup);
cap.rotation.x = Math.PI / 2;

// ---------------- Bedienfeld unter der Skala: Buchsen und Messbereichsschalter

const SOCKET_COM = new THREE.Vector3(-10, 5, FRONT);
const SOCKET_PLUS = new THREE.Vector3(-5, 5, FRONT);
for (const [pos, material, text, color] of [[SOCKET_COM, mat.cableBlack, '−', '#ffffff'], [SOCKET_PLUS, mat.cableRed, '+', '#ffffff']]) {
  const socket = addMesh(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 20), material, meter);
  socket.rotation.x = Math.PI / 2;
  socket.position.copy(pos).add(new THREE.Vector3(0, 0, 0.6));
  const label = makeLabel(text, 2.4, color);
  label.position.set(pos.x, pos.y + 2.2, FRONT + 0.02);
  meter.add(label);
}

const knob = addMesh(new THREE.CylinderGeometry(2, 2, 1.4, 32), mat.knob, meter);
knob.rotation.x = Math.PI / 2;
knob.position.set(7, 5, FRONT + 0.7);
const knobMark = addMesh(new THREE.BoxGeometry(0.3, 0.1, 1.4), mat.insulator, knob);
knobMark.position.set(0, 0.72, -1.2);

// Beschriftung der Schalterstellungen
const rangeCanvas = document.createElement('canvas');
rangeCanvas.width = 512;
rangeCanvas.height = 256;
const rangeTexture = new THREE.CanvasTexture(rangeCanvas);
rangeTexture.colorSpace = THREE.SRGBColorSpace;
const KNOB_ANGLES = { 1: -45, 3: 0, 10: 45 };     // Stellung des Drehschalters in Grad (positiv = nach rechts)
function drawRangeLabels() {
  const ctx = rangeCanvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 256);
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const range of METER.RANGES) {
    const a = THREE.MathUtils.degToRad(KNOB_ANGLES[range]);
    ctx.fillStyle = range === state.range ? '#ffd54f' : '#e8edf2';
    ctx.fillText('±' + range, 256 + 150 * Math.sin(a), 200 - 150 * Math.cos(a));
  }
  rangeTexture.needsUpdate = true;
}
const rangeLabels = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshBasicMaterial({ map: rangeTexture, transparent: true }));
rangeLabels.position.set(7, 5 + 1.7, FRONT + 0.02);   // Mittelpunkt des Bogens liegt auf der Knopfachse
meter.add(rangeLabels);

// Skala, Schalter und Beschriftung nach Messgröße und Messbereich
export function updateMeterFace() {
  drawDial();
  drawRangeLabels();
  knob.rotation.y = -THREE.MathUtils.degToRad(KNOB_ANGLES[state.range]);
}

export function syncMeter() {
  meter.rotation.y = state.meterAngle;
  needleGroup.rotation.z = -needle.pos * THREE.MathUtils.degToRad(METER.FULL_ANGLE);
}

// ---------------- Kabel von den Buchsen der Aufhängung zum Messgerät

function makeCable(points, material) {
  const rough = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
  // Kabel darf nicht in den Tisch eintauchen
  const samples = rough.getSpacedPoints(240).map(p => { p.y = Math.max(p.y, 0.35); return p; });
  return addMesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(samples), 300, 0.35, 12, false), material, scene);
}

// Letztes Stück: auf dem Tisch im Bogen um das Messgerät herum bis vor die Buchse, dann von vorne hinein.
// Die Kabel kommen von links (vom Stativ). Zwischen Messgerät und Stativ (links, um 180°) ist kein Platz;
// deshalb laufen sie entweder vorne (Eintritt bei 150°) oder hinten (−150°) herum – je nachdem, was kürzer ist.
// Winkel um die Gerätemitte: 0° rechts, 90° vorne, ±180° links (Richtung Stativ), −90° hinten.
function intoSocket(local) {
  meter.updateMatrixWorld();
  const front = new THREE.Vector3(0, 0, 1).applyQuaternion(meter.quaternion);
  const socket = meter.localToWorld(local.clone()).addScaledVector(front, 1.2);
  const at = d => socket.clone().addScaledVector(front, d);
  const center = meter.position, deg = THREE.MathUtils.degToRad;
  const approach = at(6);
  const target = Math.atan2(approach.z - center.z, approach.x - center.x);
  const tail = [[...approach.setY(0.4).toArray()], [...at(3).setY(socket.y - 2.5).toArray()], socket.toArray()];
  if (Math.abs(target) > deg(150)) return tail;   // Buchsen zeigen zum Stativ: direkt hinein
  const viaFront = deg(150) - (target > deg(150) ? target - 2 * Math.PI : target);   // im Uhrzeigersinn
  const viaBack = (target < deg(-150) ? target + 2 * Math.PI : target) + deg(150);   // gegen den Uhrzeigersinn
  const [start, delta] = viaFront <= viaBack ? [deg(150), -viaFront] : [deg(-150), viaBack];
  const point = a => [center.x + CABLE_CLEARANCE * Math.cos(a), 0.4, center.z + CABLE_CLEARANCE * Math.sin(a)];
  const steps = Math.max(0, Math.ceil(Math.abs(delta) / deg(25)) - 1);
  const arc = [point(start)];
  for (let i = 1; i <= steps; i++) arc.push(point(start + delta * i / (steps + 1)));
  return [...arc, ...tail];
}

const from = p => [p.toArray(), [p.x * 1.05, p.y + 2.2, 0.4]];

// Verlauf der Kabel (P: Höhe der Querstange). Rechts (rot): vor dem Stativ schräg nach unten zum Messgerät.
// Links (schwarz): hinter dem Stativ herunter und hinten über den Tisch – beim Magneten auf dem Tisch weiter
// hinten, damit der verschobene Magnet nicht darüber liegt.
const ROUTES = {
  drehbar: P => ({
    red: [[12.5, P + 3.5, 2], [20, P - 8, 7], [22, 12, 13]],
    black: [[-13, P + 3, -2], [-21, P - 10, -7], [-23, 8, -10], [-18, 0.4, -15], [2, 0.4, -18], [22.8, 0.4, -12]],
  }),
  tisch: P => ({
    red: [[12.5, P + 3.5, 2], [20, P - 8, 7], [22, 8, 13]],
    black: [[-13, P + 3, -2], [-21, P - 10, -7], [-23, 6, -14], [-20, 0.4, -30], [0, 0.4, -44], [22.8, 0.4, -36]],
  }),
};

let cables = [];
export function buildCables() {
  for (const cable of cables) {
    scene.remove(cable);
    cable.geometry.dispose();
  }
  if (state.explain) {   // im Erklärmodus gibt es weder Messgerät noch Kabel
    cables = [];
    return;
  }
  const right = socketPoint(1), left = socketPoint(-1);
  const route = ROUTES[state.setup](right.y - 2.2);
  cables = [
    makeCable([...from(right), ...route.red, ...toDevice(state.cablesSwapped ? -1 : 1, true)], mat.cableRed),
    makeCable([...from(left), ...route.black, ...toDevice(state.cablesSwapped ? 1 : -1, false)], mat.cableBlack),
  ];
}

// Ende eines Kabels am Messgerät bzw. an der LED: Plus-Buchse/Anode (+1) oder Minus-Buchse/Kathode (−1);
// fromFront: das Kabel kommt von vorne (rot) bzw. von hinten (schwarz) an die LED-Platte
const toDevice = (pole, fromFront) => {
  if (state.display === 'led') return intoBoard(ledSocket(pole), fromFront);
  if (state.display === 'lamp') return intoBoard(lampSocket(pole), fromFront);
  return intoSocket(pole > 0 ? SOCKET_PLUS : SOCKET_COM);
};

// Letztes Stück zur LED- bzw. Lampenplatte: über den Tisch heran (von vorne bzw. hinten), von oben in die Buchse
function intoBoard(socket, fromFront) {
  const dz = fromFront ? 1 : -1;
  return [[socket.x - 2, 0.4, socket.z + dz * 6], [socket.x, socket.y + 3, socket.z + dz * 1.5], socket.toArray()];
}

// Messgerät oder LED zeigen; im Erklärmodus keins von beiden (die Kabel lässt buildCables dann weg)
export function applyDisplay() {
  meter.visible = !state.explain && state.display === 'meter';
  setLedVisible(!state.explain && state.display === 'led');
  setLampVisible(!state.explain && state.display === 'lamp');
}

// ---------------- Messgerät drehen

export const meterAngle = () => state.meterAngle;

export function setMeterAngle(angle) {
  state.meterAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
  meter.rotation.y = state.meterAngle;
  buildCables();
}

// Skala zur Kamera ausrichten (nur die Drehung um die senkrechte Achse)
export function turnMeterTowards(point) {
  setMeterAngle(Math.atan2(point.x - meter.position.x, point.z - meter.position.z));
}
