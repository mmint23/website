// ------------------------------------------------------------------
// Erklärmodus: Elektronen in der (durchsichtigen) Schleife und Pfeile an beiden Längsseiten: Geschwindigkeit v
// der Leiterseite (grün) und Lorentzkraft F_L auf die Elektronen (rot). Die Feldlinien B zeichnet modell.js.
// „viele e⁻“: Elektronen und ortsfeste Atomrümpfe über die ganze Schleife; an den Enden (bzw. an den
// Schleifringen) zeigen „−“ und „+“ Elektronenüberschuss und -mangel. Alles einzeln schaltbar, zu Beginn aus.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { EXPLAIN, RINGS, LOOP } from './config.js';
import { state } from './state.js';
import {
  electrons, sidePosition, sideVelocity, electronForce, pathPoint, SINGLE_REST, manyRestPositions, manyPositions,
  manyShiftLimit,
} from './physik.js';
import { rotorGroup, ringsAttached } from './modell.js';
import { scene, camera } from './szene.js';

const COLOR_V = '#2e7d32', COLOR_F = '#c62828';

// ---------------- Beschriftung der Pfeile (Schild, das immer zur Kamera zeigt)

function makeTag(text, color, height = 1.4) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = 'bold 64px system-ui, sans-serif';
  ctx.font = font;
  canvas.width = Math.max(128, Math.ceil(ctx.measureText(text).width) + 56);
  canvas.height = 128;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(4, 4, canvas.width - 8, 120, 60);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, 68);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  sprite.scale.set(height * canvas.width / 128, height, 1);
  sprite.renderOrder = 12;
  return sprite;
}

// ---------------- Elektronen: Kugeln mit „−“ (wie bei der Leiterschaukel), in den Längsseiten

// ring: weißer Rand (hebt das einzelne, beobachtete Elektron hervor); sign '+' mit roten Farben (Atomrumpf, Pluspol)
function chargeTexture(ring = false, sign = '−') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(46, 42, 6, 64, 64, 62);
  gradient.addColorStop(0, sign === '+' ? '#ff8a80' : '#90caf9');
  gradient.addColorStop(1, sign === '+' ? '#b71c1c' : '#1565c0');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();
  if (ring) {
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(34, 57, 60, 14);
  if (sign === '+') ctx.fillRect(57, 34, 14, 60);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
// Das einzelne Elektron (Knopf „e⁻“) sitzt in der Mitte der vorderen Längsseite A.
const singleMaterial = new THREE.SpriteMaterial({ map: chargeTexture(true), depthTest: false });
const plainMaterial = new THREE.SpriteMaterial({ map: chargeTexture(), depthTest: false });
const ionMaterial = new THREE.SpriteMaterial({ map: chargeTexture(false, '+'), depthTest: false });
const sprite = (material, radius, order, parent = rotorGroup) => {
  const s = new THREE.Sprite(material);
  s.scale.setScalar(2 * radius);
  s.renderOrder = order;
  parent.add(s);
  return s;
};
const single = sprite(singleMaterial, EXPLAIN.ELECTRON_R * 1.25, 10);

// Viele Elektronen (etwas unterhalb der Drahtmitte) und Atomrümpfe (etwas oberhalb, fest an ihrem Platz);
// das Elektron nahe der Mitte von Seite A ist das hervorgehobene, wenn auch „e⁻“ an ist
const MANY_Y = 0.28;
const rest = manyRestPositions();
const highlighted = rest.reduce((best, s, i) => (Math.abs(s - SINGLE_REST) < Math.abs(rest[best] - SINGLE_REST) ? i : best), 0);
const manyElectrons = rest.map(() => sprite(plainMaterial, EXPLAIN.ELECTRON_R * 0.8, 9));
const ions = rest.map(s => {
  const ion = sprite(ionMaterial, EXPLAIN.ELECTRON_R * 0.65, 8);
  const p = pathPoint(s);
  ion.position.set(p.x, MANY_Y, p.z);
  return ion;
});

// Pole: „−“ am Ende mit Elektronenüberschuss, „+“ am Ende mit Elektronenmangel – an den offenen Enden
// (drehen mit) bzw. mit Schleifringen über den Ringen (fest, Ring 1 links, Ring 2 rechts)
const minusMaterial = new THREE.SpriteMaterial({ map: chargeTexture(false, '−'), depthTest: false });
const plusMaterial = new THREE.SpriteMaterial({ map: chargeTexture(false, '+'), depthTest: false });
const POLE_R = 1;
const endPoles = [0, 1].map(() => sprite(plusMaterial, POLE_R, 11));
endPoles[0].position.set(LOOP.LENGTH / 2 + 1.6, 0, EXPLAIN.OPEN_END + 0.6);    // Ende A
endPoles[1].position.set(LOOP.LENGTH / 2 + 1.6, 0, -EXPLAIN.OPEN_END - 0.6);   // Ende B
const ringPoles = RINGS.X.map(x => {
  const pole = sprite(plusMaterial, POLE_R, 11, scene);
  pole.position.set(x, RINGS.R + 1.6, 0);
  return pole;
});
const POLE_SHIFT = 1;          // ab dieser Verschiebung der Elektronen (cm) erscheinen die Pole

// ---------------- Pfeile (Weltkoordinaten), je Längsseite einer für v und einer für F_L

function makeArrow(color, label) {
  const material = new THREE.MeshBasicMaterial({ color, depthTest: false });
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 10), material);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1, 16), material);
  for (const part of [shaft, head]) {
    part.renderOrder = 10;
    group.add(part);
  }
  const tag = makeTag(label, color);
  group.add(tag);
  group.visible = false;
  scene.add(group);
  return { group, shaft, head, tag };
}
const arrows = [0, 1].map(() => ({ v: makeArrow(COLOR_V, 'v'), F: makeArrow(COLOR_F, 'F_L') }));

const up = new THREE.Vector3(0, 1, 0);
const dir = new THREE.Vector3();
function setArrow({ group, shaft, head, tag }, origin, vector, length) {
  group.visible = length > 0.4;
  if (!group.visible) return;
  const headLength = Math.min(0.9, length * 0.45);
  group.position.copy(origin);
  group.quaternion.setFromUnitVectors(up, dir.set(vector.x, vector.y, vector.z).normalize());
  shaft.scale.y = length - headLength;
  shaft.position.y = (length - headLength) / 2;
  head.scale.y = headLength;
  head.position.y = length - headLength / 2;
  tag.position.y = length + 1;
}

// ---------------- Abgleich (jedes Bild)

const origin = new THREE.Vector3();
export function syncExplain() {
  const on = state.explain;
  // einzelnes Elektron: auf dem Weg entlang der Schleife um die Verschiebung versetzt
  const many = on && state.showManyElectrons;
  if (many) {
    const p = manyPositions();
    manyElectrons.forEach((e, i) => {
      const q = pathPoint(p[i]);
      e.position.set(q.x, -MANY_Y, q.z);
      e.visible = !(state.showElectron && i === highlighted);
    });
    const q = pathPoint(p[highlighted]);
    single.position.set(q.x, -MANY_Y, q.z);
  } else {
    for (const e of manyElectrons) e.visible = false;
    const q = pathPoint(SINGLE_REST + electrons.shift);
    single.position.set(q.x, 0, q.z);
  }
  single.visible = on && state.showElectron;
  for (const ion of ions) ion.visible = many;
  // Pole: Verschiebung in Laufrichtung (> 0) ⇒ Elektronen bei Ende B / Ring 2 ⇒ dort „−“, bei A / Ring 1 „+“
  const shown = many && Math.abs(electrons.shift) > POLE_SHIFT;
  const bMinus = electrons.shift > 0;
  const size = 2 * POLE_R * (0.75 + 0.25 * Math.min(1, Math.abs(electrons.shift) / manyShiftLimit()));
  const poles = state.showRings && ringsAttached() ? ringPoles : endPoles;
  for (const pole of [...endPoles, ...ringPoles]) pole.visible = false;
  poles.forEach((pole, i) => {
    pole.visible = shown;
    pole.material = (i === 1) === bMinus ? minusMaterial : plusMaterial;
    pole.scale.setScalar(size);
  });
  for (const side of [0, 1]) {
    const p = sidePosition(side);
    origin.set(0, p.y, p.z);
    const v = sideVelocity(side), F = electronForce(side);
    const len = (vec, scale) => Math.min(EXPLAIN.ARROW_MAX, Math.hypot(vec.x, vec.y, vec.z) * scale);
    setArrow(arrows[side].v, origin, v, on && state.showV ? len(v, EXPLAIN.ARROW_V) : 0);
    setArrow(arrows[side].F, origin, F, on && state.showF ? len(F, EXPLAIN.ARROW_F) : 0);
  }
}

// Kamera für den Erklärmodus: näher an der Schleife, schräg von links vorne (so sind auch v-Pfeile nach vorne gut zu sehen)
export function explainView(controls) {
  camera.position.set(-42, 14, 46);
  controls.target.set(2, -2, 0);
}
