// ------------------------------------------------------------------
// Messgeräte hinter der Achse (sie verdecken Magnet und Spule nicht) – wahlweise angeschlossen (state.meter):
//  · Zeigermessgerät mit Nullpunkt in der Mitte (wie bei Leiterschaukel und Generator), Messbereich umschaltbar
//  · kleines Multimeter (Gleichspannung), zeigt dreimal pro Sekunde einen neuen Messwert
// Kabel: rot vom Anschluss A der Spule an Plus bzw. V, schwarz von E an Minus bzw. COM. Sie folgen der Spule.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { METER } from './config.js';
import { state } from './state.js';
import { bodies, needle, multimeter } from './physik.js';
import { addMesh, makeLabel, makeTextSprite, formatNumber } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';
import { coilGroup, terminalLocal } from './modell.js';

// ================= Zeigermessgerät

const pointerMeter = new THREE.Group();
pointerMeter.position.set(0, 5, -16);
pointerMeter.scale.setScalar(0.5);
scene.add(pointerMeter);

const W = 30, H = 27, D = 12, FRONT = D / 2;
addMesh(new THREE.BoxGeometry(W, H, D), mat.housing, pointerMeter).position.y = H / 2 + 0.8;

const DIAL_W = 27, DIAL_H = 16, DIAL_Y = 18.5, PX = 40;          // PX: Pixel pro cm
const PIVOT_Y = DIAL_Y - DIAL_H / 2 + 1;
const ARC_R = 12;
const dialCanvas = document.createElement('canvas');
dialCanvas.width = DIAL_W * PX;
dialCanvas.height = DIAL_H * PX;
const dialTexture = new THREE.CanvasTexture(dialCanvas);
dialTexture.colorSpace = THREE.SRGBColorSpace;
dialTexture.anisotropy = 8;

// Teilung je Messbereich: Abstand der beschrifteten und der kleinen Striche
const DIVISIONS = { 0.1: [0.05, 0.01], 0.3: [0.1, 0.02], 1: [0.5, 0.1] };

function drawDial() {
  const ctx = dialCanvas.getContext('2d');
  const cx = dialCanvas.width / 2, cy = dialCanvas.height - PX;
  const full = THREE.MathUtils.degToRad(METER.FULL_ANGLE);
  const range = state.range;
  const [major, minor] = DIVISIONS[range];
  ctx.fillStyle = '#fbfaf5';
  ctx.fillRect(0, 0, dialCanvas.width, dialCanvas.height);
  ctx.strokeStyle = ctx.fillStyle = '#1d2733';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, ARC_R * PX, -Math.PI / 2 - full, -Math.PI / 2 + full);
  ctx.stroke();
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
      const text = formatNumber(Math.abs(value), major < 0.1 ? 2 : 1).replace(/,0+$/, '');
      ctx.fillText(value < 0 ? '−' + text : text, cx + rt * Math.sin(a), cy - rt * Math.cos(a));
    }
  }
  ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.fillText('V', cx, cy - 5.6 * PX);
  ctx.font = '36px system-ui, sans-serif';
  ctx.fillStyle = '#4a5866';
  ctx.fillText('Spannung', cx, cy - 4 * PX);
  dialTexture.needsUpdate = true;
}

const dial = new THREE.Mesh(new THREE.PlaneGeometry(DIAL_W, DIAL_H), new THREE.MeshBasicMaterial({ map: dialTexture }));
dial.position.set(0, DIAL_Y, FRONT + 0.02);
pointerMeter.add(dial);
for (const [w, h, x, y] of [[DIAL_W + 1, 0.5, 0, DIAL_Y + DIAL_H / 2 + 0.25], [DIAL_W + 1, 0.5, 0, DIAL_Y - DIAL_H / 2 - 0.25],
  [0.5, DIAL_H, -DIAL_W / 2 - 0.25, DIAL_Y], [0.5, DIAL_H, DIAL_W / 2 + 0.25, DIAL_Y]]) {
  addMesh(new THREE.BoxGeometry(w, h, 0.6), mat.knob, pointerMeter).position.set(x, y, FRONT + 0.3);
}

const needleGroup = new THREE.Group();
needleGroup.position.set(0, PIVOT_Y, FRONT + 0.25);
pointerMeter.add(needleGroup);
addMesh(new THREE.BoxGeometry(0.16, ARC_R + 0.3, 0.06), mat.needle, needleGroup).position.y = (ARC_R + 0.3) / 2;
addMesh(new THREE.BoxGeometry(0.6, 1.4, 0.1), mat.needle, needleGroup).position.y = -0.5;
const cap = addMesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 20), mat.knob, needleGroup);
cap.rotation.x = Math.PI / 2;

// Buchsen und Messbereichsschalter
const POINTER_COM = new THREE.Vector3(-10, 5, FRONT);
const POINTER_PLUS = new THREE.Vector3(-5, 5, FRONT);
for (const [pos, material, text] of [[POINTER_COM, mat.cableBlack, '−'], [POINTER_PLUS, mat.cableRed, '+']]) {
  const socket = addMesh(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 20), material, pointerMeter);
  socket.rotation.x = Math.PI / 2;
  socket.position.copy(pos).add(new THREE.Vector3(0, 0, 0.6));
  const label = makeLabel(text, 2.4);
  label.position.set(pos.x, pos.y + 2.2, FRONT + 0.02);
  pointerMeter.add(label);
}
const knob = addMesh(new THREE.CylinderGeometry(2, 2, 1.4, 32), mat.knob, pointerMeter);
knob.rotation.x = Math.PI / 2;
knob.position.set(7, 5, FRONT + 0.7);
addMesh(new THREE.BoxGeometry(0.3, 0.1, 1.4), mat.insulator, knob).position.set(0, 0.72, -1.2);

const rangeCanvas = document.createElement('canvas');
rangeCanvas.width = 512;
rangeCanvas.height = 256;
const rangeTexture = new THREE.CanvasTexture(rangeCanvas);
rangeTexture.colorSpace = THREE.SRGBColorSpace;
const KNOB_ANGLES = { 0.1: -45, 0.3: 0, 1: 45 };
function drawRangeLabels() {
  const ctx = rangeCanvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 256);
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const range of METER.RANGES) {
    const a = THREE.MathUtils.degToRad(KNOB_ANGLES[range]);
    ctx.fillStyle = range === state.range ? '#ffd54f' : '#e8edf2';
    ctx.fillText('±' + formatNumber(range, range < 1 ? 1 : 0), 256 + 150 * Math.sin(a), 200 - 150 * Math.cos(a));
  }
  rangeTexture.needsUpdate = true;
}
const rangeLabels = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshBasicMaterial({ map: rangeTexture, transparent: true }));
rangeLabels.position.set(7, 6.7, FRONT + 0.02);
pointerMeter.add(rangeLabels);

// ================= Multimeter (Handgerät, steht leicht nach hinten geneigt)

const multi = new THREE.Group();
multi.position.set(0, 5.5, -13);
multi.rotation.x = -0.15;
multi.scale.setScalar(0.75);
scene.add(multi);
const MW = 8, MH = 14, MD = 2.4, MF = MD / 2;
const multiMat = new THREE.MeshStandardMaterial({ color: 0xf2b705, roughness: 0.6 });
addMesh(new THREE.BoxGeometry(MW, MH, MD), multiMat, multi).position.y = MH / 2;
addMesh(new THREE.BoxGeometry(MW - 1.2, MH - 1.2, 0.3), mat.carbon, multi).position.set(0, MH / 2, MF + 0.1);

// Anzeige (LCD) als Canvas
const LCD_W = 6, LCD_H = 2.6, LCD_Y = MH - 2.6;
const lcdCanvas = document.createElement('canvas');
lcdCanvas.width = 600;
lcdCanvas.height = 260;
const lcdTexture = new THREE.CanvasTexture(lcdCanvas);
lcdTexture.colorSpace = THREE.SRGBColorSpace;
const lcd = new THREE.Mesh(new THREE.PlaneGeometry(LCD_W, LCD_H), new THREE.MeshBasicMaterial({ map: lcdTexture }));
lcd.position.set(0, LCD_Y, MF + 0.27);
multi.add(lcd);
let angezeigt = null;
function drawLcd(text) {
  if (text === angezeigt) return;
  angezeigt = text;
  const ctx = lcdCanvas.getContext('2d');
  ctx.fillStyle = '#b9c7a5';
  ctx.fillRect(0, 0, 600, 260);
  ctx.fillStyle = '#1b2414';
  ctx.font = 'bold 150px ui-monospace, "DejaVu Sans Mono", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 470, 140);
  ctx.font = 'bold 70px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('V', 490, 150);
  ctx.font = '40px system-ui, sans-serif';
  ctx.fillText('DC', 24, 40);
  lcdTexture.needsUpdate = true;
}

// Drehschalter (steht auf V⎓) und Beschriftung
const dreh = addMesh(new THREE.CylinderGeometry(1.7, 1.7, 0.6, 32), mat.knob, multi);
dreh.rotation.x = Math.PI / 2;
dreh.position.set(0, 6.6, MF + 0.55);
addMesh(new THREE.BoxGeometry(0.35, 1.6, 0.2), mat.insulator, dreh).position.set(0, 0.35, -0.75);
{
  const label = makeLabel('V', 1.3, '#e8edf2');
  label.position.set(0, 8.9, MF + 0.27);
  multi.add(label);
}
// Buchsen unten: COM (schwarz) links, V (rot) rechts
const MULTI_COM = new THREE.Vector3(-1.9, 2.2, MF + 0.25);
const MULTI_V = new THREE.Vector3(1.9, 2.2, MF + 0.25);
for (const [pos, material, text] of [[MULTI_COM, mat.cableBlack, 'COM'], [MULTI_V, mat.cableRed, 'V']]) {
  const socket = addMesh(new THREE.CylinderGeometry(0.55, 0.55, 0.6, 20), material, multi);
  socket.rotation.x = Math.PI / 2;
  socket.position.copy(pos).add(new THREE.Vector3(0, 0, 0.3));
  const label = makeTextSprite(text, 0.75, '#e8edf2');
  label.position.set(pos.x, pos.y + 1.3, MF + 0.4);
  multi.add(label);
}

// ================= Anzeige

export function updateMeterFace() {
  drawDial();
  drawRangeLabels();
  knob.rotation.y = -THREE.MathUtils.degToRad(KNOB_ANGLES[state.range]);
}

// Multimeter im Bereich 2 V: drei Nachkommastellen, Minuszeichen vorne
const multiText = u => (u < -0.0005 ? '-' : ' ') + Math.min(Math.abs(u), 1.999).toFixed(3);

export function syncMeter() {
  pointerMeter.visible = state.meter === 'pointer';
  multi.visible = state.meter === 'multi';
  needleGroup.rotation.z = -needle.pos * THREE.MathUtils.degToRad(METER.FULL_ANGLE);
  drawLcd(multiText(multimeter.reading));
}

// ================= Kabel

function makeCable(points, material) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
  return addMesh(new THREE.TubeGeometry(curve, 160, 0.25, 10, false), material, scene);
}

// Buchse in Weltkoordinaten und ein Punkt d cm davor
function socketPoint(group, local, d = 0) {
  group.updateMatrixWorld();
  const front = new THREE.Vector3(0, 0, 1).applyQuaternion(group.quaternion);
  return group.localToWorld(local.clone()).addScaledVector(front, d).toArray();
}

// Vom Anschluss nach oben, dann nach hinten und leicht durchhängend zur Buchse
function cablePoints(terminal, group, socket) {
  const t = terminal.toArray();
  const s0 = socketPoint(group, socket, 0.5), s1 = socketPoint(group, socket, 2.5), s2 = socketPoint(group, socket, 5);
  const mitte = [(t[0] + s2[0]) / 2, Math.min(t[1], s2[1]) - 1, (t[2] + s2[2]) / 2];
  return [t, [t[0], t[1] + 1.8, t[2] - 0.5], mitte, [s2[0], s2[1] - 1.5, s2[2]], s1, s0];
}

let cables = [];
let verlegt = null;
export function syncCables() {
  const schluessel = `${state.meter} ${bodies.coil.x.toFixed(2)}`;
  if (schluessel === verlegt) return;
  verlegt = schluessel;
  for (const cable of cables) {
    cable.geometry.dispose();
    scene.remove(cable);
  }
  coilGroup.updateMatrixWorld();
  const a = coilGroup.localToWorld(terminalLocal.a.clone()), e = coilGroup.localToWorld(terminalLocal.e.clone());
  const [group, plus, com] = state.meter === 'pointer' ? [pointerMeter, POINTER_PLUS, POINTER_COM] : [multi, MULTI_V, MULTI_COM];
  cables = [
    makeCable(cablePoints(a, group, plus), mat.cableRed),
    makeCable(cablePoints(e, group, com), mat.cableBlack),
  ];
}
