// ------------------------------------------------------------------
// Versuchsaufbau: Schienen, Stange, Magnet und Kraftmesser
// Wird beim Wechsel des Versuchs komplett neu erzeugt.
// ------------------------------------------------------------------
import * as THREE from 'three';
import {
  RAIL_GAP, RAIL_LEN, RAIL_R, BAR_LEN, BAR_R, BAR_START_X, SMALL, LARGE, LUKAS, barHeight, barLimits,
} from './config.js';
import { state, currentSetup } from './state.js';
import { barMotion, lukasMotion } from './physik.js';
import { addMesh, makeLabel, textTexture, disposeObject } from './hilfen.js';
import { mat } from './materialien.js';
import { scene } from './szene.js';

// { group, bar, lukas, magnet, upperArm, lowerArm, upperLabels, lowerLabels }
let apparatus = null;

export function buildApparatus() {
  if (apparatus) {
    scene.remove(apparatus.group);
    disposeObject(apparatus.group);
  }
  const setup = currentSetup();
  const group = new THREE.Group();
  scene.add(group);

  // Schienen (Messing, nicht magnetisch) mit Klemmen an beiden Enden
  for (const z of [-RAIL_GAP / 2, RAIL_GAP / 2]) {
    const rail = addMesh(new THREE.CylinderGeometry(RAIL_R, RAIL_R, RAIL_LEN, 24), mat.brass, group);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, setup.railY, z);
    for (const side of [-1, 1]) {
      const clamp = addMesh(new THREE.BoxGeometry(2, 2, 2), mat.clamp, group);
      clamp.position.set(side * (RAIL_LEN / 2 + 0.6), setup.railY, z);
    }
  }
  // Holzklötze unter den Schienenenden
  const blockHeight = setup.railY - RAIL_R;
  for (const x of [-RAIL_LEN / 2 + 3, RAIL_LEN / 2 - 3]) {
    const block = addMesh(new THREE.BoxGeometry(4, blockHeight, RAIL_GAP + 8), mat.wood, group);
    block.position.set(x, blockHeight / 2, 0);
  }

  // Aluminiumstange quer über den Schienen
  const barGeometry = new THREE.CylinderGeometry(BAR_R, BAR_R, BAR_LEN, 32);
  barGeometry.rotateX(Math.PI / 2);
  const bar = addMesh(barGeometry, mat.aluminium, group);
  bar.position.set(BAR_START_X, barHeight(setup), 0);
  // dunkler Längsstreifen, damit man das Rollen sieht
  const barStripe = addMesh(new THREE.BoxGeometry(0.2, 0.08, BAR_LEN - 0.4), mat.stripe, bar);
  barStripe.position.y = BAR_R - 0.02;

  // Kraftmesser an beiden Anschlägen
  const lukas = barLimits(setup).map(x => buildLukas(group, x, barHeight(setup)));

  const magnetParts = setup.rotatable ? buildLargeMagnet(group, barHeight(setup)) : buildSmallMagnet(group);
  apparatus = { group, bar, lukas, ...magnetParts };
  applyMagnetPoles();
  syncApparatus();
}

// Darstellung an den Zustand der Physik anpassen (Stange, Kraftmesser, Drehwinkel des Magneten)
export function syncApparatus() {
  apparatus.bar.position.x = barMotion.x;
  apparatus.bar.rotation.z = -barMotion.x / BAR_R;     // Rollen ohne Gleiten
  apparatus.lukas.forEach((lukas, i) => {
    lukas.tower.visible = state.showLukas;
    const { h, max } = lukasMotion[i];
    lukas.puck.position.y = lukas.zeroY + h;
    lukas.marker.position.y = lukas.zeroY + max;
    lukas.marker.visible = max > 0.2;
  });
  // α = 90°: Schenkel oben/unten; α = 180°: Bogen unten, Schenkel hinten/vorne
  if (currentSetup().rotatable) apparatus.magnet.rotation.x = THREE.MathUtils.degToRad(90 - state.magnetAngle);
}

// Farben und Beschriftungen passend zur Polung des Magneten
export function applyMagnetPoles() {
  const upperPole = state.northUp ? 'N' : 'S';
  const lowerPole = state.northUp ? 'S' : 'N';
  apparatus.upperArm.material = state.northUp ? mat.north : mat.south;
  apparatus.lowerArm.material = state.northUp ? mat.south : mat.north;
  for (const label of apparatus.upperLabels) label.material.map = textTexture(upperPole);
  for (const label of apparatus.lowerLabels) label.material.map = textTexture(lowerPole);
}

// Überblenden beim Umdrehen des Magneten
export function setMagnetOpacity(opacity) {
  apparatus.magnet.traverse(obj => {
    if (!obj.isMesh) return;
    const transparent = opacity < 1 || obj.material.isMeshBasicMaterial;
    if (obj.material.transparent !== transparent) {
      obj.material.transparent = transparent;
      obj.material.needsUpdate = true;
    }
    obj.material.opacity = opacity;
    obj.castShadow = opacity > 0.5;
  });
}

// ------------------------------------------------------------------
// Kraftmesser („Hau den Lukas“)
// ------------------------------------------------------------------

// Skala 0 … 10 (1 cm Rand oben und unten)
let lukasScale = null;
function lukasScaleTexture() {
  if (lukasScale) return lukasScale;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fdfdfb';
  ctx.fillRect(0, 0, 128, 1024);
  ctx.fillStyle = ctx.strokeStyle = '#1d2733';
  ctx.font = 'bold 42px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const margin = 1024 / (LUKAS.HEIGHT + 2);
  for (let i = 0; i <= 20; i++) {
    const y = 1024 - margin - (1024 - 2 * margin) * i / 20;
    const major = i % 2 === 0;
    ctx.lineWidth = major ? 5 : 3;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(major ? 48 : 28, y);
    ctx.stroke();
    if (major) ctx.fillText(String(i / 2), 58, y + 2);
  }
  lukasScale = new THREE.CanvasTexture(canvas);
  lukasScale.colorSpace = THREE.SRGBColorSpace;
  lukasScale.anisotropy = 8;
  return lukasScale;
}

// Säule mit Skala, rotem Schieber, Schleppzeiger und Glocke
function buildLukas(parent, x, barY) {
  const tower = new THREE.Group();
  tower.position.set(x, 0, LUKAS.Z);
  parent.add(tower);
  const boardBottom = barY - 1;              // Skalennullpunkt liegt auf Höhe der Stange
  const boardHeight = LUKAS.HEIGHT + 2;

  const base = addMesh(new THREE.BoxGeometry(7, 1, 6), mat.wood, tower);
  base.position.y = 0.5;
  const column = addMesh(new THREE.BoxGeometry(2, boardBottom, 2), mat.wood, tower);
  column.position.y = boardBottom / 2;
  const board = addMesh(new THREE.BoxGeometry(4.4, boardHeight, 0.8), mat.panel, tower);
  board.position.y = boardBottom + boardHeight / 2;
  const scale = new THREE.Mesh(new THREE.PlaneGeometry(4, boardHeight), new THREE.MeshBasicMaterial({ map: lukasScaleTexture() }));
  scale.position.set(0, boardBottom + boardHeight / 2, 0.42);
  tower.add(scale);
  const bell = addMesh(new THREE.SphereGeometry(1.8, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat.brass, tower);
  bell.position.y = boardBottom + boardHeight;

  const puck = addMesh(new THREE.BoxGeometry(5.5, 1.4, 1.4), mat.puck, tower);
  puck.position.z = 1.1;
  const marker = addMesh(new THREE.BoxGeometry(6.2, 0.3, 0.3), mat.marker, tower);
  marker.position.z = 0.6;

  return { tower, puck, marker, zeroY: boardBottom + 1 };
}

// ------------------------------------------------------------------
// Magnete
// ------------------------------------------------------------------

// Kleiner Hufeisenmagnet für den Grundversuch (auf der Seite liegend, Feld senkrecht zum Tisch)
function buildSmallMagnet(parent) {
  const magnet = new THREE.Group();
  const armOffset = (SMALL.OUTER_R + SMALL.INNER_R) / 2;
  const armThickness = SMALL.OUTER_R - SMALL.INNER_R;
  magnet.position.set(SMALL.X, SMALL.OUTER_R, 0);
  parent.add(magnet);

  // Bogen als extrudierter Halbring
  const yokeShape = new THREE.Shape();
  yokeShape.moveTo(0, SMALL.OUTER_R);
  yokeShape.absarc(0, 0, SMALL.OUTER_R, Math.PI / 2, -Math.PI / 2, true);
  yokeShape.lineTo(0, -SMALL.INNER_R);
  yokeShape.absarc(0, 0, SMALL.INNER_R, -Math.PI / 2, Math.PI / 2, false);
  yokeShape.closePath();
  const yokeGeometry = new THREE.ExtrudeGeometry(yokeShape, { depth: SMALL.DEPTH, bevelEnabled: false, curveSegments: 32 });
  yokeGeometry.translate(0, 0, -SMALL.DEPTH / 2);
  addMesh(yokeGeometry, mat.yoke, magnet);

  // Schenkel: oben Nordpol (rot), unten Südpol (grün)
  const armGeometry = new THREE.BoxGeometry(SMALL.ARM_LEN, armThickness, SMALL.DEPTH);
  const upperArm = addMesh(armGeometry, mat.north, magnet);
  upperArm.position.set(-SMALL.ARM_LEN / 2, armOffset, 0);
  const lowerArm = addMesh(armGeometry, mat.south, magnet);
  lowerArm.position.set(-SMALL.ARM_LEN / 2, -armOffset, 0);

  // Polbeschriftungen vorne, hinten und auf der Oberseite
  const upperLabels = [];
  const lowerLabels = [];
  for (const side of [1, -1]) {
    for (const [list, sign] of [[upperLabels, 1], [lowerLabels, -1]]) {
      const label = makeLabel('N', 3.4);
      label.position.set(-SMALL.ARM_LEN + 3, sign * armOffset, side * (SMALL.DEPTH / 2 + 0.02));
      if (side < 0) label.rotation.y = Math.PI;
      magnet.add(label);
      list.push(label);
    }
  }
  const labelTop = makeLabel('N', 4.5);
  labelTop.rotation.x = -Math.PI / 2;
  labelTop.position.set(-SMALL.ARM_LEN + 4, armOffset + armThickness / 2 + 0.02, 0);
  magnet.add(labelTop);
  upperLabels.push(labelTop);

  return { magnet, upperArm, lowerArm, upperLabels, lowerLabels };
}

// Großer Hufeisenmagnet für den Versuch „Drehbarer Magnet“, drehbar um die Achse der Stangenbahn
function buildLargeMagnet(parent, axisY) {
  const magnet = new THREE.Group();
  magnet.position.set(0, axisY, 0);   // Drehachse verläuft entlang der Schienen durch die Stangenmitte
  parent.add(magnet);
  const legOffset = LARGE.GAP_HALF + LARGE.THICK / 2;
  const legLength = LARGE.LEG_Z_MAX - LARGE.LEG_Z_MIN;

  // Bogen als extrudierter Halbring hinter der hinteren Schiene
  // (Form in der z-y-Ebene, wird anschließend entlang der Schienen extrudiert)
  const outerR = LARGE.GAP_HALF + LARGE.THICK;
  const yokeShape = new THREE.Shape();
  yokeShape.moveTo(LARGE.LEG_Z_MIN, outerR);
  yokeShape.absarc(LARGE.LEG_Z_MIN, 0, outerR, Math.PI / 2, Math.PI * 1.5, false);
  yokeShape.lineTo(LARGE.LEG_Z_MIN, -LARGE.GAP_HALF);
  yokeShape.absarc(LARGE.LEG_Z_MIN, 0, LARGE.GAP_HALF, Math.PI * 1.5, Math.PI / 2, true);
  yokeShape.closePath();
  const yokeGeometry = new THREE.ExtrudeGeometry(yokeShape, { depth: LARGE.WIDTH, bevelEnabled: false, curveSegments: 48 });
  yokeGeometry.translate(0, 0, -LARGE.WIDTH / 2);
  yokeGeometry.rotateY(-Math.PI / 2);   // Formebene → z-y-Ebene, Extrusion → entlang x
  addMesh(yokeGeometry, mat.yoke, magnet);

  // Schenkel: in Grundstellung oben Nordpol (rot), unten Südpol (grün)
  const armGeometry = new THREE.BoxGeometry(LARGE.WIDTH, LARGE.THICK, legLength);
  const upperArm = addMesh(armGeometry, mat.north, magnet);
  upperArm.position.set(0, legOffset, (LARGE.LEG_Z_MIN + LARGE.LEG_Z_MAX) / 2);
  const lowerArm = addMesh(armGeometry, mat.south, magnet);
  lowerArm.position.set(0, -legOffset, (LARGE.LEG_Z_MIN + LARGE.LEG_Z_MAX) / 2);

  // Polbeschriftungen: Stirnseite, beide Seitenflächen und Außenfläche der Schenkel
  const upperLabels = [];
  const lowerLabels = [];
  for (const [list, sign] of [[upperLabels, 1], [lowerLabels, -1]]) {
    const front = makeLabel('N', 3.6);
    front.position.set(0, sign * legOffset, LARGE.LEG_Z_MAX + 0.02);
    const left = makeLabel('N', 3.6);
    left.rotation.y = -Math.PI / 2;
    left.position.set(-LARGE.WIDTH / 2 - 0.02, sign * legOffset, LARGE.LEG_Z_MAX - 3);
    const right = makeLabel('N', 3.6);
    right.rotation.y = Math.PI / 2;
    right.position.set(LARGE.WIDTH / 2 + 0.02, sign * legOffset, LARGE.LEG_Z_MAX - 3);
    const outer = makeLabel('N', 6);
    outer.rotation.x = -sign * Math.PI / 2;
    outer.position.set(0, sign * (legOffset + LARGE.THICK / 2 + 0.02), LARGE.LEG_Z_MAX - 5);
    for (const label of [front, left, right, outer]) {
      magnet.add(label);
      list.push(label);
    }
  }

  return { magnet, upperArm, lowerArm, upperLabels, lowerLabels };
}
