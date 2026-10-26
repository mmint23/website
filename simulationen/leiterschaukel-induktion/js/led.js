// ------------------------------------------------------------------
// LED statt Messgerät (Gedankenexperiment): LED auf einer Steckplatte mit zwei Buchsen
// (rot: Anode, schwarz: Kathode). Sie leuchtet nur in Durchlassrichtung und erst oberhalb der Schwellspannung.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { LED } from './config.js';
import { ledBrightness } from './physik.js';
import { addMesh, makeLabel } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';

const board = new THREE.Group();
board.position.set(...LED.POS);
board.visible = false;
scene.add(board);

const BASE_H = 1.2;
const base = addMesh(new THREE.BoxGeometry(13, BASE_H, 7), mat.wood, board);
base.position.y = BASE_H / 2;

// Buchsen links (Kathode, schwarz) und rechts (Anode, rot), Öffnung nach oben
const SOCKET_X = 4.5, SOCKET_Z = 1.5;
for (const [side, material, text, color] of [[-1, mat.cableBlack, '−', '#26292d'], [1, mat.cableRed, '+', '#c62828']]) {
  const socket = addMesh(new THREE.CylinderGeometry(0.9, 0.9, 1.4, 20), material, board);
  socket.position.set(side * SOCKET_X, BASE_H + 0.7, SOCKET_Z);
  const label = makeLabel(text, 2, color);
  label.rotation.x = -Math.PI / 2;
  label.position.set(side * SOCKET_X, BASE_H + 0.02, SOCKET_Z - 2.3);
  board.add(label);
}
// Steckerpunkte in Weltkoordinaten (für die Kabel)
export const ledSocket = side => new THREE.Vector3(side * SOCKET_X, BASE_H + 1.4, SOCKET_Z).add(board.position);

// Leiterbahnen von den Buchsen zu den LED-Beinchen
for (const side of [-1, 1]) {
  const track = addMesh(new THREE.BoxGeometry(SOCKET_X - 0.6, 0.06, 0.4), mat.brass, board);
  track.position.set(side * (SOCKET_X + 0.6) / 2, BASE_H + 0.03, SOCKET_Z);
}

// LED (stark vergrößert): zwei Beinchen, Kragen, Gehäuse mit runder Kuppel
const R = 1.5, BODY = 2.2, LEGS = 2.4;
for (const side of [-1, 1]) {
  const leg = addMesh(new THREE.CylinderGeometry(0.1, 0.1, LEGS, 8), mat.rod, board);
  leg.position.set(side * 0.6, BASE_H + LEGS / 2, SOCKET_Z);
}
const ledMat = new THREE.MeshStandardMaterial({
  color: 0xd32f2f, emissive: 0xff1a1a, emissiveIntensity: 0, transparent: true, opacity: 0.85, roughness: 0.2,
});
const top = BASE_H + LEGS;
const collar = addMesh(new THREE.CylinderGeometry(R + 0.2, R + 0.2, 0.3, 32), ledMat, board);
collar.position.set(0, top + 0.15, SOCKET_Z);
const body = addMesh(new THREE.CylinderGeometry(R, R, BODY, 32), ledMat, board);
body.position.set(0, top + 0.3 + BODY / 2, SOCKET_Z);
const dome = addMesh(new THREE.SphereGeometry(R, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), ledMat, board);
dome.position.set(0, top + 0.3 + BODY, SOCKET_Z);

// Lichtschein: Punktlicht und ein weicher Leuchthof
const glowCenter = new THREE.Vector3(0, top + 0.3 + BODY * 0.7, SOCKET_Z);
const light = new THREE.PointLight(0xff3030, 0, 30, 1.5);
light.position.copy(glowCenter);
board.add(light);
const haloCanvas = document.createElement('canvas');
haloCanvas.width = haloCanvas.height = 128;
{
  const ctx = haloCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,90,70,1)');
  gradient.addColorStop(0.35, 'rgba(255,40,30,0.45)');
  gradient.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
}
const haloTexture = new THREE.CanvasTexture(haloCanvas);
const halo = new THREE.Sprite(new THREE.SpriteMaterial({
  map: haloTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0,
}));
halo.position.copy(glowCenter);
board.add(halo);

export function setLedVisible(visible) {
  board.visible = visible;
}

// Helligkeit aus der Induktionsspannung (jedes Bild)
export function syncLed() {
  if (!board.visible) return;
  const b = ledBrightness();
  ledMat.emissiveIntensity = 3 * b;
  light.intensity = 400 * b;
  halo.material.opacity = b;
  halo.scale.setScalar(6 + 10 * b);
}
