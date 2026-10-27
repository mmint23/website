// ------------------------------------------------------------------
// Messgeräte hinter der Achse (sie verdecken Magnet und Spule nicht) – wahlweise aufgestellt (state.meter):
//  · Zeigermessgerät mit Nullpunkt in der Mitte (wie bei Leiterschaukel und Generator), Messbereich umschaltbar
//    (±1 mV für die Leiterschleife bis ±1 V), Buchsen + und −
//  · Zeigermessgerät ohne Skala (qualitativ, empfindlich): nur Bogen und Nullmarke; der Ausschlag wächst
//    logarithmisch (physik.js), so schlägt es bei der Leiterschleife wie bei der Spule sichtbar aus; Buchsen + und −
//  · kleines Multimeter mit Drehschalter (aus, V⎓, V~, mA⎓, A⎓; Antippen dreht weiter) und vier Buchsen
//    COM, V, mA, 10 A – zeigt dreimal pro Sekunde einen neuen Messwert; Spannungen unter 0,2 V in mV
// Eingesteckt wird mit den Kabeln (kabel.js); sockets() liefert dafür die Buchsen des aufgestellten Geräts.
// Alle Geräte lassen sich am Gehäuse greifen und in ihrer Ebene (parallel zur Bildebene) verschieben (ziehen.js);
// eingesteckte Stecker und Kabel gehen mit.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { METER, MULTI_MODES, rangeText } from './config.js';
import { state } from './state.js';
import { needle, multimeter } from './physik.js';
import { addMesh, makeLabel, makeTextSprite, formatNumber } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';

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

// Teilung je Messbereich: Abstand der beschrifteten und der kleinen Striche (in V)
const DIVISIONS = { 0.001: [0.0005, 0.0001], 0.1: [0.05, 0.01], 0.3: [0.1, 0.02], 1: [0.5, 0.1] };

function drawDial() {
  const ctx = dialCanvas.getContext('2d');
  const cx = dialCanvas.width / 2, cy = dialCanvas.height - PX;
  const full = THREE.MathUtils.degToRad(METER.FULL_ANGLE);
  const range = state.range;
  const [major, minor] = DIVISIONS[range];
  const milli = range < 0.01, faktor = milli ? 1000 : 1;   // kleiner Messbereich: Skala in mV
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
      const text = formatNumber(Math.abs(value) * faktor, major * faktor < 0.1 ? 2 : 1).replace(/,0+$/, '');
      ctx.fillText(value < 0 ? '−' + text : text, cx + rt * Math.sin(a), cy - rt * Math.cos(a));
    }
  }
  ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.fillText(milli ? 'mV' : 'V', cx, cy - 5.6 * PX);
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
const POINTER_SOCKETS = { minus: new THREE.Vector3(-10, 5, FRONT), plus: new THREE.Vector3(-5, 5, FRONT) };
for (const [pos, material, text] of [[POINTER_SOCKETS.minus, mat.cableBlack, '−'], [POINTER_SOCKETS.plus, mat.cableRed, '+']]) {
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
const KNOB_ANGLES = { 0.001: -66, 0.1: -22, 0.3: 22, 1: 66 };
function drawRangeLabels() {
  const ctx = rangeCanvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 256);
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const range of METER.RANGES) {
    const a = THREE.MathUtils.degToRad(KNOB_ANGLES[range]);
    ctx.fillStyle = range === state.range ? '#ffd54f' : '#e8edf2';
    const text = range < 0.01 ? rangeText(range) : '±' + formatNumber(range, range < 1 ? 1 : 0);
    ctx.fillText(text, 256 + 165 * Math.sin(a), 200 - 150 * Math.cos(a));
  }
  rangeTexture.needsUpdate = true;
}
const rangeLabels = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshBasicMaterial({ map: rangeTexture, transparent: true }));
rangeLabels.position.set(7, 6.7, FRONT + 0.02);
pointerMeter.add(rangeLabels);

// ================= Zeigermessgerät ohne Skala (kleiner, ohne Messbereichsschalter)

const qualMeter = new THREE.Group();
qualMeter.position.set(0, 5, -16);
qualMeter.scale.setScalar(0.5);
scene.add(qualMeter);
const QW = 24, QH = 22, QD = 10, QFRONT = QD / 2;
addMesh(new THREE.BoxGeometry(QW, QH, QD), mat.housing, qualMeter).position.y = QH / 2 + 0.8;
const Q_DIAL_W = 21, Q_DIAL_H = 13, Q_DIAL_Y = 15.5, Q_ARC = 10;
const Q_PIVOT_Y = Q_DIAL_Y - Q_DIAL_H / 2 + 1;
{
  // Skala: nur Bogen, Nullmarke in der Mitte und kurze Striche an den Enden
  const canvas = document.createElement('canvas');
  canvas.width = Q_DIAL_W * PX;
  canvas.height = Q_DIAL_H * PX;
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2, cy = canvas.height - PX, full = THREE.MathUtils.degToRad(METER.FULL_ANGLE), r = Q_ARC * PX;
  ctx.fillStyle = '#fbfaf5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#1d2733';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2 - full, -Math.PI / 2 + full);
  ctx.stroke();
  for (const [a, laenge, breite] of [[0, 1.6, 7], [-full, 0.9, 5], [full, 0.9, 5]]) {
    ctx.lineWidth = breite;
    ctx.beginPath();
    ctx.moveTo(cx + r * Math.sin(a), cy - r * Math.cos(a));
    ctx.lineTo(cx + (r - laenge * PX) * Math.sin(a), cy - (r - laenge * PX) * Math.cos(a));
    ctx.stroke();
  }
  ctx.fillStyle = '#1d2733';
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('0', cx, cy - r + 2.4 * PX);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const qualDial = new THREE.Mesh(new THREE.PlaneGeometry(Q_DIAL_W, Q_DIAL_H), new THREE.MeshBasicMaterial({ map: texture }));
  qualDial.position.set(0, Q_DIAL_Y, QFRONT + 0.02);
  qualMeter.add(qualDial);
  for (const [w, h, x, y] of [[Q_DIAL_W + 1, 0.5, 0, Q_DIAL_Y + Q_DIAL_H / 2 + 0.25], [Q_DIAL_W + 1, 0.5, 0, Q_DIAL_Y - Q_DIAL_H / 2 - 0.25],
    [0.5, Q_DIAL_H, -Q_DIAL_W / 2 - 0.25, Q_DIAL_Y], [0.5, Q_DIAL_H, Q_DIAL_W / 2 + 0.25, Q_DIAL_Y]]) {
    addMesh(new THREE.BoxGeometry(w, h, 0.6), mat.knob, qualMeter).position.set(x, y, QFRONT + 0.3);
  }
}
const qualNeedle = new THREE.Group();
qualNeedle.position.set(0, Q_PIVOT_Y, QFRONT + 0.25);
qualMeter.add(qualNeedle);
addMesh(new THREE.BoxGeometry(0.16, Q_ARC + 0.3, 0.06), mat.needle, qualNeedle).position.y = (Q_ARC + 0.3) / 2;
addMesh(new THREE.BoxGeometry(0.6, 1.4, 0.1), mat.needle, qualNeedle).position.y = -0.5;
const qualCap = addMesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 20), mat.knob, qualNeedle);
qualCap.rotation.x = Math.PI / 2;
const QUAL_SOCKETS = { minus: new THREE.Vector3(-3, 4.5, QFRONT), plus: new THREE.Vector3(3, 4.5, QFRONT) };
for (const [pos, material, text] of [[QUAL_SOCKETS.minus, mat.cableBlack, '−'], [QUAL_SOCKETS.plus, mat.cableRed, '+']]) {
  const socket = addMesh(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 20), material, qualMeter);
  socket.rotation.x = Math.PI / 2;
  socket.position.copy(pos).add(new THREE.Vector3(0, 0, 0.6));
  const label = makeLabel(text, 2.4);
  label.position.set(pos.x, pos.y + 2.2, QFRONT + 0.02);
  qualMeter.add(label);
}

// ================= Multimeter (Handgerät, steht leicht nach hinten geneigt)

const multi = new THREE.Group();
multi.position.set(0, 4.5, -13);
multi.rotation.x = -0.15;
multi.scale.setScalar(1.05);
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
function drawLcd(zahl, einheit, art) {
  const text = `${zahl}|${einheit}|${art}`;
  if (text === angezeigt) return;
  angezeigt = text;
  const ctx = lcdCanvas.getContext('2d');
  ctx.fillStyle = zahl === null ? '#9aa58c' : '#b9c7a5';   // ausgeschaltet: dunkler, leer
  ctx.fillRect(0, 0, 600, 260);
  if (zahl === null) {
    lcdTexture.needsUpdate = true;
    return;
  }
  ctx.fillStyle = '#1b2414';
  ctx.font = 'bold 150px ui-monospace, "DejaVu Sans Mono", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(zahl, 470, 140);
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(einheit, 482, 150);
  ctx.font = '40px system-ui, sans-serif';
  ctx.fillText(art, 24, 40);
  lcdTexture.needsUpdate = true;
}

// Drehschalter: Stellungen im Bogen darüber beschriftet; Antippen dreht zur nächsten Stellung (kabel.js/ziehen.js)
const MODE_TEXT = { off: 'OFF', vdc: 'V⎓', vac: 'V~', ma: 'mA⎓', a: 'A⎓' };
const MODE_ANGLE = { off: -80, vdc: -40, vac: 0, ma: 40, a: 80 };   // Grad, positiv nach rechts
const KNOB_Y = 6.2;
export const multiKnob = addMesh(new THREE.CylinderGeometry(1.7, 1.7, 0.6, 32), mat.knob, multi);
multiKnob.rotation.x = Math.PI / 2;
multiKnob.position.set(0, KNOB_Y, MF + 0.55);
addMesh(new THREE.BoxGeometry(0.35, 1.6, 0.2), mat.insulator, multiKnob).position.set(0, 0.35, -0.75);
const modeCanvas = document.createElement('canvas');
modeCanvas.width = 512;
modeCanvas.height = 300;
const modeTexture = new THREE.CanvasTexture(modeCanvas);
modeTexture.colorSpace = THREE.SRGBColorSpace;
function drawModes() {
  const ctx = modeCanvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 300);
  ctx.font = 'bold 46px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const mode of MULTI_MODES) {
    const a = THREE.MathUtils.degToRad(MODE_ANGLE[mode]);
    ctx.fillStyle = mode === state.multiMode ? '#ffd54f' : '#e8edf2';
    ctx.fillText(MODE_TEXT[mode], 256 + 190 * Math.sin(a), 250 - 190 * Math.cos(a));
  }
  modeTexture.needsUpdate = true;
}
const modeLabels = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.75), new THREE.MeshBasicMaterial({ map: modeTexture, transparent: true }));
modeLabels.position.set(0, KNOB_Y + 1.25, MF + 0.27);   // Mittelpunkt des Bogens auf der Knopfachse
multi.add(modeLabels);

// Buchsen unten: COM (schwarz), V, mA, 10 A (rot)
const MULTI_SOCKETS = {
  com: new THREE.Vector3(-2.7, 2, MF + 0.25), v: new THREE.Vector3(-0.9, 2, MF + 0.25),
  ma: new THREE.Vector3(0.9, 2, MF + 0.25), a: new THREE.Vector3(2.7, 2, MF + 0.25),
};
for (const [name, text] of [['com', 'COM'], ['v', 'V'], ['ma', 'mA'], ['a', '10A']]) {
  const pos = MULTI_SOCKETS[name];
  const socket = addMesh(new THREE.CylinderGeometry(0.55, 0.55, 0.6, 20), name === 'com' ? mat.cableBlack : mat.cableRed, multi);
  socket.rotation.x = Math.PI / 2;
  socket.position.copy(pos).add(new THREE.Vector3(0, 0, 0.3));
  const label = makeTextSprite(text, 0.7, '#e8edf2');
  label.position.set(pos.x, pos.y + 1.25, MF + 0.4);
  multi.add(label);
}

// ================= Anzeige

export function updateMeterFace() {
  drawDial();
  drawRangeLabels();
  knob.rotation.y = -THREE.MathUtils.degToRad(KNOB_ANGLES[state.range]);
  drawModes();
  multiKnob.rotation.y = -THREE.MathUtils.degToRad(MODE_ANGLE[state.multiMode]);
}

// Multimeter: Zahl mit Vorzeichen (bzw. „OL“ über dem Messbereich), Einheit und Messart je Schalterstellung.
// Spannungen unter 0,2 V zeigt es (wie ein Multimeter mit automatischer Bereichswahl) in mV mit einer Nachkommastelle.
const FORMAT = { vdc: [3, 1.999, 'V', 'DC'], vac: [3, 1.999, 'V', 'AC'], ma: [1, 199.9, 'mA', 'DC'], a: [3, 9.999, 'A', 'DC'] };
const MILLIVOLT = 0.2;
function multiText(wert) {
  if (wert === null) return [null, '', ''];
  let [stellen, grenze, einheit, art] = FORMAT[state.multiMode];
  if (einheit === 'V' && Math.abs(wert) < MILLIVOLT) {
    [stellen, grenze, einheit] = [1, 199.9, 'mV'];
    wert *= 1000;
  }
  if (Math.abs(wert) > grenze) return [' OL', einheit, art];
  const zahl = Math.abs(wert).toFixed(stellen);
  return [(wert < 0 && Number(zahl) !== 0 ? '-' : ' ') + zahl, einheit, art];
}

export function syncMeter() {
  pointerMeter.visible = state.meter === 'pointer';
  qualMeter.visible = state.meter === 'qual';
  multi.visible = state.meter === 'multi';
  needleGroup.rotation.z = qualNeedle.rotation.z = -needle.pos * THREE.MathUtils.degToRad(METER.FULL_ANGLE);
  drawLcd(...multiText(state.multiMode === 'off' ? null : multimeter.reading));
}

// ================= Buchsen des aufgestellten Messgeräts (Weltkoordinaten, dazu die Richtung aus der Buchse heraus)

// ================= Verschieben

const GRENZEN = { x: [-32, 32], y: [-16, 14] };   // Lage des Geräts (Unterkante Mitte) in cm
const clamp = (v, [lo, hi]) => Math.max(lo, Math.min(hi, v));
// Gruppe, Buchsen und Überstand der Buchsen (cm, Welt) je Gerät
const GERAETE = {
  pointer: () => [pointerMeter, POINTER_SOCKETS, 0.6],
  qual: () => [qualMeter, QUAL_SOCKETS, 0.6],
  multi: () => [multi, MULTI_SOCKETS, 0.4],
};
export const meterGroup = () => GERAETE[state.meter]()[0];
export function moveMeter(x, y) {
  const group = meterGroup();
  group.position.x = clamp(x, GRENZEN.x);
  group.position.y = clamp(y, GRENZEN.y);
}

export function sockets() {
  const [group, liste, rand] = GERAETE[state.meter]();
  group.updateMatrixWorld();
  const heraus = new THREE.Vector3(0, 0, 1).applyQuaternion(group.quaternion);
  return Object.entries(liste).map(([name, lokal]) => ({
    name, position: group.localToWorld(lokal.clone()).addScaledVector(heraus, rand), heraus,
  }));
}

