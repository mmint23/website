// ------------------------------------------------------------------
// Glühlampe statt Messgerät (Gedankenexperiment): Lämpchen in einer Fassung auf einer Steckplatte mit zwei
// Buchsen. Der Glühdraht glüht erst dunkelrot, dann orange, bei voller Leistung warmweiß – in beiden
// Stromrichtungen.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { LAMP } from './config.js';
import { lampGlow } from './physik.js';
import { addMesh } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';

const board = new THREE.Group();
board.position.set(...LAMP.POS);
board.visible = false;
scene.add(board);

const BASE_H = 1.2;
const base = addMesh(new THREE.BoxGeometry(13, BASE_H, 7), mat.wood, board);
base.position.y = BASE_H / 2;

// Buchsen links (schwarz) und rechts (rot), Öffnung nach oben – wie bei der LED-Platte
const SOCKET_X = 4.5, SOCKET_Z = 1.5;
for (const [side, material] of [[-1, mat.cableBlack], [1, mat.cableRed]]) {
  const socket = addMesh(new THREE.CylinderGeometry(0.9, 0.9, 1.4, 20), material, board);
  socket.position.set(side * SOCKET_X, BASE_H + 0.7, SOCKET_Z);
  const track = addMesh(new THREE.BoxGeometry(SOCKET_X - 1.4, 0.06, 0.4), mat.brass, board);
  track.position.set(side * (SOCKET_X + 1.4) / 2, BASE_H + 0.03, SOCKET_Z);
}
// Steckerpunkte in Weltkoordinaten (für die Kabel)
export const lampSocket = side => new THREE.Vector3(side * SOCKET_X, BASE_H + 1.4, SOCKET_Z).add(board.position);

// Fassung, Gewindesockel und Glaskolben (stark vergrößert)
const holder = addMesh(new THREE.CylinderGeometry(1.5, 1.7, 2.2, 32), mat.knob, board);
holder.position.set(0, BASE_H + 1.1, SOCKET_Z);
const thread = addMesh(new THREE.CylinderGeometry(1.0, 1.0, 1.2, 24), mat.brass, board);
thread.position.set(0, BASE_H + 2.8, SOCKET_Z);
const BULB_R = 2.2;
const bulbCenter = new THREE.Vector3(0, BASE_H + 3.4 + BULB_R * 0.85, SOCKET_Z);
const glass = new THREE.MeshStandardMaterial({
  color: 0xf4f7fa, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, depthWrite: false,
});
const bulb = addMesh(new THREE.SphereGeometry(BULB_R, 40, 24), glass, board);
bulb.position.copy(bulbCenter);
bulb.castShadow = false;

// Haltedrähte und Glühwendel (Wendel als Schraubenlinie zwischen den Drahtenden)
const WIRE_TOP = bulbCenter.y + 0.2;
for (const side of [-1, 1]) {
  const wire = addMesh(new THREE.CylinderGeometry(0.05, 0.05, WIRE_TOP - (BASE_H + 3.3), 6), mat.rod, board);
  wire.position.set(side * 0.9, (WIRE_TOP + BASE_H + 3.3) / 2, SOCKET_Z);
}
class Helix extends THREE.Curve {
  getPoint(t, target = new THREE.Vector3()) {
    const turns = 7, a = 2 * Math.PI * turns * t;
    return target.set(-0.9 + 1.8 * t, WIRE_TOP + 0.12 * Math.sin(a), SOCKET_Z + 0.12 * Math.cos(a));
  }
}
const filamentMat = new THREE.MeshBasicMaterial({ color: 0x4a3a30 });
addMesh(new THREE.TubeGeometry(new Helix(), 200, 0.035, 6, false), filamentMat, board).castShadow = false;

// Farbe des Glühdrahts je nach Helligkeit: kalt, dunkelrot, orange, warmweiß
const COLORS = [[0, 0x4a3a30], [0.15, 0x8b1a00], [0.5, 0xff7a1a], [1, 0xfff1c4]].map(([g, c]) => [g, new THREE.Color(c)]);
function filamentColor(glow, target) {
  for (let i = 1; i < COLORS.length; i++) {
    const [g1, c1] = COLORS[i], [g0, c0] = COLORS[i - 1];
    if (glow <= g1) return target.copy(c0).lerp(c1, (glow - g0) / (g1 - g0));
  }
  return target.copy(COLORS.at(-1)[1]);
}

// Lichtschein: warmes Punktlicht und ein weicher Leuchthof
const light = new THREE.PointLight(0xffb060, 0, 40, 1.5);
light.position.copy(bulbCenter);
board.add(light);
const haloCanvas = document.createElement('canvas');
haloCanvas.width = haloCanvas.height = 128;
{
  const ctx = haloCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,240,200,1)');
  gradient.addColorStop(0.3, 'rgba(255,180,90,0.5)');
  gradient.addColorStop(1, 'rgba(255,120,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
}
const halo = new THREE.Sprite(new THREE.SpriteMaterial({
  map: new THREE.CanvasTexture(haloCanvas), transparent: true, depthWrite: false,
  blending: THREE.AdditiveBlending, opacity: 0,
}));
halo.position.copy(bulbCenter);
board.add(halo);

export function setLampVisible(visible) {
  board.visible = visible;
}

// Glühen aus der Temperatur des Glühdrahts (jedes Bild)
export function syncLamp() {
  if (!board.visible) return;
  const g = lampGlow();
  filamentColor(g, filamentMat.color);
  light.intensity = 250 * g * g;
  halo.material.opacity = Math.min(0.85, 1.2 * g);
  halo.scale.setScalar(5 + 10 * g);
}
