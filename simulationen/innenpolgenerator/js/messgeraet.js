// ------------------------------------------------------------------
// Großes Demonstrations-Zeigermessgerät (Nullpunkt in der Mitte, wie bei Leiterschaukel und Generator) und
// Kabel von den Anschlüssen der Spulen. Bei zwei Spulen verbindet ein Kabel die beiden Spulen (Reihenschaltung);
// „vertauscht“ ist Spule 2 andersherum angeschlossen – die Kabel liegen dann sichtbar anders. Alle Kabel sind
// schwarz (Wechselspannung: kein fester Plus- und Minuspol); die Kabel von Spule 2 zum Messgerät liegen auf dem Tisch.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { METER, TABLE_TOP } from './config.js';
import { state } from './state.js';
import { needle } from './physik.js';
import { addMesh, makeLabel, formatNumber } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';
import { terminals } from './modell.js';
import { ledSocket, setLedVisible } from './led.js';
import { lampSocket, setLampVisible } from './gluehlampe.js';

// Das Messgerät schwebt rechts neben dem Modell (verkleinert), leicht zum Betrachter gedreht
const meter = new THREE.Group();
meter.position.set(30, TABLE_TOP - 0.8 * 0.55, 3);   // steht auf dem Tisch (Gehäuse beginnt 0,8 über dem Ursprung)
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

// Teilung je Messbereich: Abstand der beschrifteten und der kleinen Striche
const DIVISIONS = { 0.3: [0.1, 0.02], 1: [0.2, 0.05], 3: [1, 0.2] };

function drawDial() {
  const ctx = dialCanvas.getContext('2d');
  const cx = dialCanvas.width / 2, cy = dialCanvas.height - PX;
  const full = THREE.MathUtils.degToRad(METER.FULL_ANGLE);
  const range = state.range;
  const [major, minor] = DIVISIONS[range];
  const unit = 'V';
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
const KNOB_ANGLES = { 0.3: -45, 1: 0, 3: 45 };     // Stellung des Drehschalters in Grad (positiv = nach rechts)
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

// ---------------- Kabel: Plus-Buchse an A₁; Minus-Buchse an E₁ (eine Spule) bzw. an A₂ oder E₂ (zwei Spulen)

function makeCable(points, material) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
  return addMesh(new THREE.TubeGeometry(curve, 200, 0.3, 12, false), material, scene);
}

// Buchse in Weltkoordinaten und ein Punkt d cm davor
function socketPoint(socketLocal, d = 0) {
  meter.updateMatrixWorld();
  const front = new THREE.Vector3(0, 0, 1).applyQuaternion(meter.quaternion);
  return meter.localToWorld(socketLocal.clone()).addScaledVector(front, 1.2 + d).toArray();
}
const sag = (p, dy) => [p[0], p[1] + dy, p[2]];
const TISCH = TABLE_TOP + 0.3;   // Höhe der Kabelmitte, wenn das Kabel auf dem Tisch liegt

// Erstes Stück vom Anschluss: nach außen (rechts bzw. links) und nach oben (A) bzw. unten (E), etwas nach vorne
function weg(terminal) {
  const t = terminal.toArray();
  return [t, [t[0] + Math.sign(t[0]) * 2, t[1] + Math.sign(t[1]) * 2, t[2] + 1]];
}

// Letztes Stück zur Buchse (pol: 'plus' an A₁, 'minus' an Spule 2): von vorne in die Buchse des Messgeräts bzw.
// von oben in die Buchse der Steckplatte von LED oder Glühlampe (state.display)
function anschluss(pol) {
  if (state.display === 'meter') {
    const socket = pol === 'plus' ? SOCKET_PLUS : SOCKET_COM;
    return [sag(socketPoint(socket, 5), -1.2), socketPoint(socket, 2), socketPoint(socket)];
  }
  const s = (state.display === 'led' ? ledSocket : lampSocket)(pol === 'plus' ? 1 : -1);
  return [[s.x - 3, s.y + 4, s.z], [s.x, s.y + 2.5, s.z], s.toArray()];
}

// Vom Anschluss in weitem Bogen zur Buchse
function toMeter(terminal, pol, via) {
  return [...weg(terminal), ...via, ...anschluss(pol)];
}

// Verbindung zwischen den Spulen: von E₁ (rechts unten) vorne unten um das Joch herum nach links, zu E₂ (links
// unten) bzw. außen links hoch zu A₂ (links oben)
function bridge(from, to) {
  const unten = [[12, -14.5, 5.5], [0, -18.6, 5.5], [-12, -14.5, 5.5]];
  const ende = weg(to).reverse();
  return to.y < 0 ? [...weg(from), ...unten, ...ende] : [...weg(from), ...unten, [-20, -4, 5], ...ende];
}

let cables = [];
let verlegt = null;   // Schaltung, für die die Kabel gerade liegen

function layCables() {
  for (const cable of cables) {
    cable.geometry.dispose();
    scene.remove(cable);
  }
  const [s1, s2] = terminals;
  cables = [makeCable(toMeter(s1.a, 'plus', [[21, 5, 6], [27, 0, 7]]), mat.cableBlack)];
  if (state.coils === 1) {
    cables.push(makeCable(toMeter(s1.e, 'minus', [[20, -7, 6]]), mat.cableBlack));
  } else if (!state.reversed) {
    cables.push(makeCable(bridge(s1.e, s2.e), mat.cableBlack));
    // A₂ (links oben) außen links neben dem Joch hinunter auf den Tisch, vorne auf dem Tisch nach rechts zum Messgerät
    cables.push(makeCable(toMeter(s2.a, 'minus', [[-20.5, 0, 6], [-21.5, -12, 8], [-19, TISCH, 11],
      [-8, TISCH, 13], [8, TISCH, 13], [18, TISCH, 12]]), mat.cableBlack));
  } else {
    cables.push(makeCable(bridge(s1.e, s2.a), mat.cableBlack));
    // E₂ (links unten) hinunter auf den Tisch, vor der Verbindung auf dem Tisch nach rechts zum Messgerät
    cables.push(makeCable(toMeter(s2.e, 'minus', [[-19.5, -10, 7.5], [-15, TISCH, 11],
      [-4, TISCH, 13], [8, TISCH, 13], [18, TISCH, 12]]), mat.cableBlack));
  }
}

// Kabel neu verlegen und Messgerät bzw. LED oder Glühlampe zeigen, wenn sich Schaltung oder Anzeige geändert haben
// (jedes Bild aufgerufen)
export function syncCables() {
  const schaltung = (state.coils === 1 ? 'eine' : state.reversed ? 'vertauscht' : 'richtig') + '/' + state.display;
  if (schaltung === verlegt) return;
  verlegt = schaltung;
  meter.visible = state.display === 'meter';
  setLedVisible(state.display === 'led');
  setLampVisible(state.display === 'lamp');
  layCables();
}
