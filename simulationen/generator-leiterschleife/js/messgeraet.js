// ------------------------------------------------------------------
// Großes Demonstrations-Zeigermessgerät (Nullpunkt in der Mitte, wie bei der Leiterschaukel; Messbereiche in mV und
// in V) und Kabel von den Bürsten des Generators – statt des Messgeräts wahlweise LED oder Glühlampe (state.display,
// led.js, gluehlampe.js): Sie stehen an derselben Stelle, die Kabel führen dann in ihre Buchsen. Zur Glühlampe lässt
// sich das Messgerät parallel anschließen (state.meterToo): Die Bürstenkabel gehen dann ins Messgerät, die Lampe steht
// direkt davor und hängt mit zwei kurzen Kabeln an dessen Buchsen.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { METER, TABLE_TOP, inVolt } from './config.js';
import { state } from './state.js';
import { needle } from './physik.js';
import { addMesh, makeLabel, formatNumber } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';
import { brushTerminals } from './modell.js';
import { ledSocket, setLedVisible } from './led.js';
import { lampSocket, setLampVisible, setLampPlacement } from './gluehlampe.js';

// Das Messgerät schwebt rechts neben dem Modell (verkleinert), leicht zum Betrachter gedreht
const meter = new THREE.Group();
meter.position.set(27, TABLE_TOP - 0.8 * 0.55, 3);   // steht auf dem Tisch (Gehäuse beginnt 0,8 über dem Ursprung)
meter.rotation.y = -0.3;
meter.scale.setScalar(0.55);
scene.add(meter);

const W = 30, H = 27, D = 12, FRONT = D / 2;
const housing = addMesh(new THREE.BoxGeometry(W, H, D), mat.housing, meter);
housing.position.y = H / 2 + 0.8;

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

// Teilung je Messbereich (in mV): Abstand der beschrifteten und der kleinen Striche
const DIVISIONS = { 3: [1, 0.2], 10: [2, 0.5], 15: [5, 1], 30: [10, 2], 300: [100, 20], 1000: [500, 100], 3000: [1000, 200] };

function drawDial() {
  const ctx = dialCanvas.getContext('2d');
  const cx = dialCanvas.width / 2, cy = dialCanvas.height - PX;
  const full = THREE.MathUtils.degToRad(METER.FULL_ANGLE);
  const range = state.range;
  const [major, minor] = DIVISIONS[range];
  const unit = inVolt(range) ? 'V' : 'mV', faktor = inVolt(range) ? 1000 : 1;   // Beschriftung in dieser Einheit
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
      const text = formatNumber(Math.abs(value) / faktor, major / faktor < 1 ? 1 : 0).replace(',0', '');
      ctx.fillText(value < 0 ? '−' + text : text, cx + rt * Math.sin(a), cy - rt * Math.cos(a));
    }
  }
  // Einheit und Messgröße
  ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.fillText(unit, cx, cy - 5.6 * PX);
  ctx.font = '36px system-ui, sans-serif';
  ctx.fillStyle = '#4a5866';
  ctx.fillText('Spannung', cx, cy - 4 * PX);
  dialTexture.needsUpdate = true;
}

const dial = new THREE.Mesh(new THREE.PlaneGeometry(DIAL_W, DIAL_H), new THREE.MeshBasicMaterial({ map: dialTexture }));
dial.position.set(0, DIAL_Y, FRONT + 0.02);
meter.add(dial);
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
// Stellung des Drehschalters in Grad (positiv = nach rechts); beschriftet sind die Stellungen der gewählten Einheit
const KNOB_ANGLES = { 3: -60, 10: -20, 15: 20, 30: 60, 300: -45, 1000: 0, 3000: 45 };
function drawRangeLabels() {
  const ctx = rangeCanvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 256);
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const volt = inVolt(state.range);
  for (const range of METER.RANGES.filter(r => inVolt(r) === volt)) {
    const a = THREE.MathUtils.degToRad(KNOB_ANGLES[range]);
    ctx.fillStyle = range === state.range ? '#ffd54f' : '#e8edf2';
    ctx.fillText('±' + formatNumber(volt ? range / 1000 : range, volt && range < 1000 ? 1 : 0), 256 + 150 * Math.sin(a), 200 - 150 * Math.cos(a));
  }
  ctx.fillStyle = '#ffd54f';
  ctx.fillText(volt ? 'V' : 'mV', 256, 232);
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
  needleGroup.rotation.z = -needle.pos * THREE.MathUtils.degToRad(METER.FULL_ANGLE);
}

// ---------------- Kabel von den Bürsten zum Messgerät (Ring 1 → Plus-Buchse, Ring 2 → Minus-Buchse)

function makeCable(points, material) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
  return addMesh(new THREE.TubeGeometry(curve, 200, 0.3, 12, false), material, scene);
}

// Die Bürsten sitzen hinter dem Magneten (der Aufbau ist gedreht, config.js DREHUNG): Die Kabel laufen vom
// Bürstenanschluss nach unten auf den Tisch, hinter dem Magneten nach rechts und im Gang zwischen Südpol und Messgerät
// (x = GANG_X) nach vorne
const GANG_X = 16.5, AUF_DEM_TISCH = TABLE_TOP + 0.8;
const hintenHerum = t => [t.toArray(), [t.x, t.y - 3, t.z - 0.5], [t.x + 3, AUF_DEM_TISCH, t.z - 2.5], [GANG_X, AUF_DEM_TISCH, t.z - 2]];

// Zum Messgerät: hinten herum und von vorne in die Buchse
function cablePoints(terminal, socketLocal) {
  meter.updateMatrixWorld();
  const front = new THREE.Vector3(0, 0, 1).applyQuaternion(meter.quaternion);
  const socket = meter.localToWorld(socketLocal.clone()).addScaledVector(front, 1.2);
  const at = d => socket.clone().addScaledVector(front, d).toArray();
  return [...hintenHerum(terminal), [GANG_X, AUF_DEM_TISCH, 6], at(5).map((v, i) => (i === 1 ? v - 1.5 : v)), at(2), socket.toArray()];
}

// Zu LED bzw. Glühlampe: hinten herum und von oben in die Buchse der Steckplatte
function boardCablePoints(terminal, socket) {
  const s = socket;
  return [...hintenHerum(terminal), [GANG_X, AUF_DEM_TISCH, s.z], [(GANG_X + s.x) / 2, s.y + 3, s.z], [s.x, s.y + 2, s.z], s.toArray()];
}

// Zum Messgerät, wenn die Glühlampe davor steht: hinten herum und dicht an der Front des Messgeräts von unten in die
// Buchse – so bleibt der Platz vor den Buchsen frei für die Kabel zur Lampe
function nahCablePoints(terminal, socketLocal) {
  meter.updateMatrixWorld();
  const front = new THREE.Vector3(0, 0, 1).applyQuaternion(meter.quaternion);
  const socket = meter.localToWorld(socketLocal.clone()).addScaledVector(front, 1.2);
  const unten = socket.clone().addScaledVector(front, 0.6).add(new THREE.Vector3(0, -2.6, 0));
  return [...hintenHerum(terminal), [GANG_X, AUF_DEM_TISCH, 4], [unten.x, AUF_DEM_TISCH, unten.z], unten.toArray(),
    socket.clone().add(new THREE.Vector3(0, -0.9, 0)).addScaledVector(front, 0.3).toArray(), socket.toArray()];
}

// Glühlampe parallel zum Messgerät: Die Bürstenkabel gehen wie sonst ins Messgerät; von dessen Buchsen (Stecker auf
// Stecker) führt je ein kurzes Kabel nach vorne und von oben in die Buchse der Steckplatte, die direkt davor steht –
// Minus (blau) links, Plus (rot) rechts, ohne Kreuzung
function parallelCablePoints(socketLocal, ziel) {
  meter.updateMatrixWorld();
  const front = new THREE.Vector3(0, 0, 1).applyQuaternion(meter.quaternion);
  const stecker = meter.localToWorld(socketLocal.clone()).addScaledVector(front, 1.2);
  const vor = stecker.clone().addScaledVector(front, 2);
  const s = ziel;
  return [stecker.toArray(), vor.toArray(), [(vor.x + s.x) / 2, Math.max(vor.y, s.y) + 1.5, (vor.z + s.z) / 2],
    [s.x, s.y + 2, s.z], s.toArray()];
}

// Kabel für Glühlampe und Messgerät zusammen: Lampe dafür kurz an ihren Platz vor dem Messgerät stellen
setLampPlacement(true);
const lampMeterCables = [
  makeCable(nahCablePoints(brushTerminals[0], SOCKET_PLUS), mat.cableRed),
  makeCable(nahCablePoints(brushTerminals[1], SOCKET_COM), mat.cableBlue),
  makeCable(parallelCablePoints(SOCKET_PLUS, lampSocket(1)), mat.cableRed),
  makeCable(parallelCablePoints(SOCKET_COM, lampSocket(-1)), mat.cableBlue),
];
setLampPlacement(false);

// Kabel je Anzeige: Ring 1 (rot) an Plus bzw. Anode, Ring 2 (blau) an Minus bzw. Kathode (schwarze Buchse)
const cables = {
  lampMeter: lampMeterCables,
  meter: [
    makeCable(cablePoints(brushTerminals[0], SOCKET_PLUS), mat.cableRed),
    makeCable(cablePoints(brushTerminals[1], SOCKET_COM), mat.cableBlue),
  ],
  led: [
    makeCable(boardCablePoints(brushTerminals[0], ledSocket(1)), mat.cableRed),
    makeCable(boardCablePoints(brushTerminals[1], ledSocket(-1)), mat.cableBlue),
  ],
  lamp: [
    makeCable(boardCablePoints(brushTerminals[0], lampSocket(1)), mat.cableRed),
    makeCable(boardCablePoints(brushTerminals[1], lampSocket(-1)), mat.cableBlue),
  ],
};

// Was angeschlossen ist: 'meter', 'led', 'lamp' oder 'lampMeter' (Glühlampe mit Messgerät parallel)
export const anschluss = () => (state.display === 'lamp' && state.meterToo ? 'lampMeter' : state.display);
export const messgeraetAngeschlossen = () => ['meter', 'lampMeter'].includes(anschluss());

// Anzeige (Messgerät, LED oder Glühlampe) mit ihren Kabeln zeigen; im Erklärmodus alles ausgeblendet
let anzeigeSichtbar = true;
function anzeigeAbgleichen() {
  const jetzt = anschluss();
  meter.visible = anzeigeSichtbar && messgeraetAngeschlossen();
  setLedVisible(anzeigeSichtbar && jetzt === 'led');
  setLampPlacement(jetzt === 'lampMeter');
  setLampVisible(anzeigeSichtbar && (jetzt === 'lamp' || jetzt === 'lampMeter'));
  for (const [display, kabel] of Object.entries(cables)) {
    for (const cable of kabel) cable.visible = anzeigeSichtbar && jetzt === display;
  }
}
export function setMeterVisible(visible) {
  anzeigeSichtbar = visible;
  anzeigeAbgleichen();
}
export const setDisplay = display => {
  state.display = display;
  anzeigeAbgleichen();
};
export const setMeterToo = an => {
  state.meterToo = an;
  anzeigeAbgleichen();
};
// Nach einer Übernahme (Live-Steuerung) nachziehen
export const anzeigeNachziehen = anzeigeAbgleichen;
anzeigeAbgleichen();
