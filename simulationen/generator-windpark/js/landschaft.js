// ------------------------------------------------------------------
// Windpark: stilisierte Hügellandschaft (Maße in m) mit Windrädern, einem Dorf und einer Stromleitung
// vom Windpark zum Dorf. Wind kommt von links vorne; Windstreifen zeigen Richtung und Stärke.
// Eigene Szene (parkScene); Kamera und Steuerung teilt sie sich mit dem Generator-Modell.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { TURBINE, WIND_MAX } from './config.js';
import { state } from './state.js';
import { park } from './physik.js';
import { syncTageszeit } from './tageszeit.js';

export const parkScene = new THREE.Scene();

const add = (geometry, material, parent = parkScene, shadow = true) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};

// Zufallszahlen mit festem Startwert: das Dorf sieht bei jedem Laden gleich aus
let seed = 7;
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

// Windrichtung (wohin der Wind weht): von links vorne nach rechts hinten
export const WIND_DIR = new THREE.Vector3(1, 0, -1).normalize();

// ---------------- Himmel, Licht, Dunst (Farben und Sonnenstand je nach Uhrzeit: tageszeit.js)

// Himmel als senkrechter Farbverlauf auf einem schmalen Canvas
export const skyCanvas = document.createElement('canvas');
skyCanvas.width = 4;
skyCanvas.height = 256;
export const skyTexture = new THREE.CanvasTexture(skyCanvas);
skyTexture.colorSpace = THREE.SRGBColorSpace;
parkScene.background = skyTexture;
parkScene.fog = new THREE.Fog(0xdde9f2, 700, 2600);
export const hemi = new THREE.HemisphereLight(0xdfefff, 0x7d8f5a, 1.0);
parkScene.add(hemi);
export const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
sun.position.set(-500, 700, 300);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -800, right: 800, top: 800, bottom: -800, near: 100, far: 2200 });
sun.shadow.bias = -0.0008;
parkScene.add(sun);
parkScene.add(sun.target);   // Sonne zielt auf den Ursprung (Mitte der Landschaft)

// ---------------- Gelände: sanfte Hügel, flach beim Dorf; Wiesen und Felder als Vertex-Farben

const VILLAGE = new THREE.Vector2(170, 90);
export function terrainHeight(x, z) {
  let h = 38 * Math.sin(x / 260 + 0.6) * Math.cos(z / 310 - 0.4)
    + 22 * Math.sin(x / 140 - z / 190 + 1.3)
    + 12 * Math.cos(x / 75 + z / 95);
  h += 25;
  // beim Dorf eben auslaufen lassen
  const d = Math.hypot(x - VILLAGE.x, z - VILLAGE.y);
  const flat = Math.min(1, Math.max(0, (d - 90) / 160));
  return h * flat + 8 * (1 - flat);
}

{
  const SIZE = 3200, SEG = 200;
  const geometry = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const meadow = new THREE.Color(0x7fae4f), meadowDark = new THREE.Color(0x5f8f3a);
  const field = new THREE.Color(0xd9c46a), fieldGreen = new THREE.Color(0x9cc25a);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    pos.setY(i, terrainHeight(x, z));
    // Felder: Rechtecke im Raster, manche gelb (Getreide), manche hellgrün
    const fx = Math.floor((x + 40) / 160), fz = Math.floor((z + 15) / 110);
    const kind = Math.abs(Math.sin(fx * 12.9898 + fz * 78.233) * 43758.5453) % 1;
    if (kind < 0.18) c.copy(field);
    else if (kind < 0.36) c.copy(fieldGreen);
    else c.copy(meadow).lerp(meadowDark, 0.5 + 0.5 * Math.sin(x / 90) * Math.cos(z / 70));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const ground = add(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), parkScene, false);
  ground.receiveShadow = true;
}

// ---------------- Windräder: Turm, Gondel, Nabe, drei Rotorblätter; Rotor zeigt in den Wind

const white = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.45 });
const grey = new THREE.MeshStandardMaterial({ color: 0xd5dade, roughness: 0.5 });
const redMark = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.5 });

// Blatt: flaches, sich verjüngendes Profil entlang +y (Wurzel bei y = 0)
function bladeGeometry() {
  const L = TURBINE.BLADE;
  const shape = new THREE.Shape();
  shape.moveTo(-0.9, 0);
  shape.lineTo(-1.6, 0.18 * L);
  shape.quadraticCurveTo(-0.9, 0.7 * L, -0.25, L);
  shape.lineTo(0.35, L);
  shape.quadraticCurveTo(0.9, 0.5 * L, 1.1, 0.12 * L);
  shape.lineTo(0.9, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false });
  geometry.translate(0, 0, -0.3);
  return geometry;
}
const BLADE = bladeGeometry();

// Schild „Generator“ (zeigt immer zur Kamera), erscheint beim Blick in die Gondel
function makeTag(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = 'bold 64px system-ui, sans-serif';
  ctx.font = font;
  canvas.width = Math.ceil(ctx.measureText(text).width) + 64;
  canvas.height = 112;
  ctx.fillStyle = '#1d4f91';
  ctx.beginPath();
  ctx.roundRect(4, 4, canvas.width - 8, 104, 52);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, 60);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, fog: false }));
  sprite.scale.set(1.3 * canvas.width / 112, 1.3, 1);
  sprite.renderOrder = 20;
  return sprite;
}

// Innenleben der Gondel (nur beim Blick hinein sichtbar): Rotorwelle und Ringgenerator direkt dahinter
// (Generator ohne Getriebe). Läufer und Welle drehen mit dem Rotor, der Ständer ist fest.
const copperMat = new THREE.MeshStandardMaterial({ color: 0xc46a2b, metalness: 0.8, roughness: 0.35 });
const statorMat = new THREE.MeshStandardMaterial({ color: 0x6b7480, metalness: 0.6, roughness: 0.4 });
const shaftMat = new THREE.MeshStandardMaterial({ color: 0xb9c0c8, metalness: 1, roughness: 0.3 });
function buildInterior(nacelle, rotor) {
  const inside = new THREE.Group();
  inside.visible = false;
  nacelle.add(inside);
  // Ständer als oben offener Ring, damit man den drehenden Läufer darin sieht
  const stator = add(new THREE.CylinderGeometry(1.95, 1.95, 1.4, 40, 1, true, 0.75 * Math.PI, 1.5 * Math.PI), statorMat, inside, false);
  stator.rotation.x = Math.PI / 2;
  stator.position.set(0, 1.6, 1.4);
  stator.material.side = THREE.DoubleSide;
  const spin = new THREE.Group();          // dreht mit dem Rotor
  spin.visible = false;
  rotor.add(spin);
  const shaft = add(new THREE.CylinderGeometry(0.35, 0.35, 9, 16), shaftMat, spin, false);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -5;
  const runner = add(new THREE.CylinderGeometry(1.65, 1.65, 1.2, 40), copperMat, spin, false);
  runner.rotation.x = Math.PI / 2;
  runner.position.z = -2.8;
  for (let k = 0; k < 6; k++) {            // Speichen, damit man die Drehung sieht
    const spoke = add(new THREE.BoxGeometry(0.25, 2.9, 0.3), statorMat, spin, false);
    spoke.rotation.z = k * Math.PI / 3;
    spoke.position.z = -2.1;
  }
  const tag = makeTag('Generator');
  tag.position.set(0, 4.3, 1.4);
  inside.add(tag);
  return { inside, spin };
}

// Lichtschein (runder, weicher Fleck) für Fenster und Warnlichter – auch aus der Ferne gut zu sehen
function scheinTextur(farbe) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, farbe);
  g.addColorStop(0.25, farbe);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const glow = (farbe, opacity) => new THREE.SpriteMaterial({
  map: scheinTextur(farbe), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
});
const warnMaterial = glow('rgba(255,40,30,1)', 1);

export const turbines = [];      // [{ group, rotor, nacelle, housing, inside, spin, materials, phase, factor }]
function buildTurbine(x, z, phase) {
  const group = new THREE.Group();
  group.position.set(x, terrainHeight(x, z) - 1, z);
  // Gondel zeigt mit der Nabe gegen den Wind (lokale +z-Achse = Rotorachse nach vorne)
  group.rotation.y = Math.atan2(-WIND_DIR.x, -WIND_DIR.z);
  parkScene.add(group);
  // eigene Materialien je Windrad: Hervorheben beim Zeigen, durchsichtige Gondel beim Blick hinein
  const body = white.clone(), shell = white.clone();
  const H = TURBINE.HUB_HEIGHT;
  add(new THREE.CylinderGeometry(4, 4.5, 1.5, 24), grey, group).position.y = 0.75;        // Fundament
  const tower = add(new THREE.CylinderGeometry(1.6, 2.8, H, 24), body, group);
  tower.position.y = H / 2;
  const nacelle = new THREE.Group();
  nacelle.position.y = H;
  group.add(nacelle);
  const housing = add(new THREE.BoxGeometry(4.2, 4.2, 12), shell, nacelle);
  housing.position.set(0, 1.6, -2.5);
  const rotor = new THREE.Group();
  rotor.position.set(0, 1.6, 4.2);
  nacelle.add(rotor);
  const hub = add(new THREE.SphereGeometry(2.1, 24, 16), body, rotor);
  hub.scale.z = 1.4;
  for (let k = 0; k < 3; k++) {
    const blade = add(BLADE, body, rotor);
    blade.rotation.z = k * 2 * Math.PI / 3;
    blade.position.z = 0.4;
    // rote Warnmarkierung an den Blattspitzen
    const tip = add(new THREE.BoxGeometry(0.9, 3, 0.7), redMark, blade);
    tip.position.set(0.05, TURBINE.BLADE - 2.5, 0);
  }
  const { inside, spin } = buildInterior(nacelle, rotor);
  // Flugsicherungsbefeuerung auf dem Dach der Gondel: rotes Licht, nachts blinkend (tageszeit.js)
  const warn = new THREE.Sprite(warnMaterial);
  warn.position.set(0, 4.6, -5.5);
  warn.scale.setScalar(14);
  warn.visible = false;
  nacelle.add(warn);
  turbines.push({ group, rotor, nacelle, housing, inside, spin, warn, materials: [body, shell], phase, factor: 0.96 + 0.08 * random() });
}
for (const [x, z, phase] of [[-260, -210, 0.0], [-60, -330, 1.1], [150, -250, 2.3], [-420, -60, 0.7], [420, -170, 1.7]]) {
  buildTurbine(x, z, phase);
}

// ---------------- Dorf: Häuser mit Satteldach und eine Kirche

const walls = [0xf3ead8, 0xefe2c4, 0xffffff, 0xe8d9c0, 0xf6efe6].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
const roofs = [0xa0402c, 0x8b3a2a, 0x6d4c41, 0xb5543c].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));
function roofGeometry(w, d, h) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.6, 0);
  shape.lineTo(0, h);
  shape.lineTo(w / 2 + 0.6, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: d + 1.2, bevelEnabled: false });
  geometry.translate(0, 0, -(d + 1.2) / 2);
  return geometry;
}
export const houses = [];
// Fenster: je Haus ein eigenes Material (Glas am Tag, warmes Licht am Abend) und vor jedem Fenster ein kleiner
// Lichtschein, damit man die erleuchteten Fenster auch aus der Ferne sieht. schwelle: ab welcher Dunkelheit
// (0 … 1) hier das Licht angeht – so gehen die Lichter nach und nach an.
export const lichter = [];   // [{ material, schein (Material der Lichtscheine), scheine, schwelle }]
const FENSTER = new THREE.PlaneGeometry(2.2, 1.9);
function fensterSetzen(gruppe, plaetze, groesse = 1) {
  const material = new THREE.MeshStandardMaterial({ color: 0x3b4a5a, roughness: 0.2, emissive: 0xffc861, emissiveIntensity: 0 });
  const schein = glow('rgba(255,200,110,1)', 0);
  const scheine = [];
  for (const [x, y, z, drehung] of plaetze) {
    const fenster = new THREE.Mesh(FENSTER, material);
    fenster.position.set(x, y, z);
    fenster.rotation.y = drehung;
    fenster.scale.setScalar(groesse);
    gruppe.add(fenster);
    const s = new THREE.Sprite(schein);   // etwas vor dem Fenster
    s.position.set(x + 0.8 * Math.sin(drehung), y, z + 0.8 * Math.cos(drehung));
    s.scale.setScalar(7 * groesse);
    s.visible = false;
    gruppe.add(s);
    scheine.push(s);
  }
  lichter.push({ material, schein, scheine, schwelle: 0.25 + 0.6 * random() });
}
function buildHouse(x, z, angle, w, d, h) {
  const house = new THREE.Group();
  house.position.set(x, terrainHeight(x, z), z);
  house.rotation.y = angle;
  parkScene.add(house);
  const body = add(new THREE.BoxGeometry(w, h, d), walls[Math.floor(random() * walls.length)], house);
  body.position.y = h / 2;
  const roof = add(roofGeometry(w, d, 0.55 * w), roofs[Math.floor(random() * roofs.length)], house);
  roof.position.y = h;
  // zwei Fenster auf den langen Seiten, eins auf den Giebelseiten
  const y = h * 0.5, aussen = 0.06;
  fensterSetzen(house, [
    [-w / 4, y, d / 2 + aussen, 0], [w / 4, y, d / 2 + aussen, 0],
    [-w / 4, y, -d / 2 - aussen, Math.PI], [w / 4, y, -d / 2 - aussen, Math.PI],
    [w / 2 + aussen, y, 0, Math.PI / 2], [-w / 2 - aussen, y, 0, -Math.PI / 2],
  ]);
  house.userData = { body, roof, w, d, h };
  houses.push(house);
}
for (let i = 0; i < 16; i++) {
  const a = random() * Math.PI * 2, r = 25 + random() * 75;
  buildHouse(VILLAGE.x + r * Math.cos(a), VILLAGE.y + r * Math.sin(a), Math.round(random() * 4) * Math.PI / 2 + 0.3,
    9 + random() * 5, 8 + random() * 4, 5 + random() * 2.5);
}
// Betretbare Häuser (uebergang.js): mit Tür, eigenem Material zum Hervorheben und einem Schild, das auch aus der
// Ferne lesbar bleibt. Das Haus, das der Startansicht am nächsten liegt, führt ins Wohnzimmer (raum.js); das
// nächstgelegene Haus, das von dort aus gesehen mindestens 45 m weiter rechts steht, ins Generator-Modell (sein
// Schild steht höher, damit sich die Schilder nicht überdecken).
const START_BLICK = { position: new THREE.Vector3(-860, 200, 760), ziel: new THREE.Vector3(150, 45, -40) };   // parkView
const BLICK = START_BLICK.position;
const RECHTS = START_BLICK.ziel.clone().sub(BLICK).cross(new THREE.Vector3(0, 1, 0)).normalize();   // im Bild nach rechts
const rechts = haus => haus.position.clone().sub(BLICK).dot(RECHTS);
function betretbar(haus, text, ziel, schildHoehe = 9) {
  const { body, roof, d, h } = haus.userData;
  body.material = body.material.clone();
  roof.material = roof.material.clone();
  // Tür auf der Seite zur Startansicht (lokale Seite mit der kleineren Entfernung)
  const vorne = haus.localToWorld(new THREE.Vector3(0, 0, d)).distanceTo(BLICK) < haus.localToWorld(new THREE.Vector3(0, 0, -d)).distanceTo(BLICK) ? 1 : -1;
  const tuer = add(new THREE.BoxGeometry(1.4, 2.3, 0.2), new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.7 }), haus);
  tuer.position.set(0, 1.15, vorne * (d / 2 + 0.05));
  const schild = makeTag(text);
  schild.position.y = h + schildHoehe;
  haus.add(schild);
  haus.userData.tuer = { lokal: new THREE.Vector3(0, 1.6, vorne * (d / 2)), vorne };
  return { haus, ziel, schild, seiten: schild.scale.x / schild.scale.y };
}

// Schilder jedes Bild so groß machen, dass sie auf dem Bildschirm gleich hoch bleiben (2,4 % der Bildhöhe), auch aus
// der Ferne. (Nicht über sizeAttenuation = false: Dann trifft das Antippen nicht die sichtbare Fläche.)
const SCHILD_HOEHE = 0.024;
const schildPunkt = new THREE.Vector3();
function syncSchilder(camera) {
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  for (const { schild, seiten } of eingaenge) {
    const h = SCHILD_HOEHE * 2 * tan * camera.position.distanceTo(schild.getWorldPosition(schildPunkt));
    schild.scale.set(h * seiten, h, 1);
  }
}
const naechstes = liste => liste.reduce((a, b) => (a.position.distanceTo(BLICK) < b.position.distanceTo(BLICK) ? a : b));
const wohnhaus = naechstes(houses);
const werkstatt = naechstes(houses.filter(h => rechts(h) > rechts(wohnhaus) + 45));
export const eingaenge = [betretbar(wohnhaus, 'Hineinschauen', 'room'), betretbar(werkstatt, 'Generator-Modell', 'model', 24)];

// Hervorheben (Maus darüber); null: keins
export function highlightHouse(eingang) {
  for (const e of eingaenge) {
    for (const teil of [e.haus.userData.body, e.haus.userData.roof]) teil.material.emissive.setHex(e === eingang ? 0x2a5d8f : 0x000000);
  }
}

// Kirche mit Turm in der Dorfmitte
{
  const church = new THREE.Group();
  church.position.set(VILLAGE.x, terrainHeight(VILLAGE.x, VILLAGE.y), VILLAGE.y);
  church.rotation.y = 0.3;
  parkScene.add(church);
  const nave = add(new THREE.BoxGeometry(11, 9, 20), walls[2], church);
  nave.position.y = 4.5;
  add(roofGeometry(11, 20, 6), roofs[0], church).position.y = 9;
  const tower = add(new THREE.BoxGeometry(5, 22, 5), walls[2], church);
  tower.position.set(0, 11, 12);
  const spire = add(new THREE.ConeGeometry(3.8, 10, 4), roofs[2], church);
  spire.position.set(0, 27, 12);
  spire.rotation.y = Math.PI / 4;
  // hohe Fenster an den Längsseiten des Kirchenschiffs
  fensterSetzen(church, [-6, 0, 6].flatMap(z => [[5.56, 4.5, z, Math.PI / 2], [-5.56, 4.5, z, -Math.PI / 2]]), 1.3);
}

// ---------------- Stromleitung: Masten vom Windpark zum Dorf, durchhängende Leiterseile

const steel = new THREE.MeshStandardMaterial({ color: 0x8d969e, metalness: 0.5, roughness: 0.5 });
const cableMat = new THREE.MeshBasicMaterial({ color: 0x3a3f44 });
const PYLON_H = 34;
// Querträger: oben ein kurzer, darunter ein langer; Aufhängepunkte der Seile relativ zum Mastfuß
const ARMS = [[-5, PYLON_H - 2], [5, PYLON_H - 2], [-9, PYLON_H - 9], [9, PYLON_H - 9]];
function buildPylon(x, z, angle) {
  const pylon = new THREE.Group();
  pylon.position.set(x, terrainHeight(x, z) - 0.5, z);
  pylon.rotation.y = angle;
  parkScene.add(pylon);
  // Gittermast vereinfacht: vier schräge Eckstiele und Querstreben
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const leg = add(new THREE.CylinderGeometry(0.18, 0.25, PYLON_H, 6), steel, pylon);
    leg.position.set(sx * 1.6, PYLON_H / 2, sz * 1.6);
    leg.rotation.set(sz * 0.07, 0, -sx * 0.07);
  }
  for (const y of [8, 16, 24]) {
    const w = 3.2 * (1 - y / PYLON_H * 0.55) + 0.6;
    for (const rot of [0, Math.PI / 2]) {
      const brace = add(new THREE.BoxGeometry(2 * w, 0.25, 0.25), steel, pylon);
      brace.position.y = y;
      brace.rotation.y = rot;
    }
  }
  for (const [w, y] of [[10, PYLON_H - 2], [18, PYLON_H - 9]]) {
    const arm = add(new THREE.BoxGeometry(w + 1, 0.5, 0.6), steel, pylon);
    arm.position.y = y;
  }
  const peak = add(new THREE.ConeGeometry(1.2, 4, 4), steel, pylon);
  peak.position.y = PYLON_H + 1.5;
  pylon.updateMatrixWorld();
  return ARMS.map(([ax, ay]) => pylon.localToWorld(new THREE.Vector3(ax, ay - 1.2, 0)));
}
{
  // Trasse vom Windpark (bei Windrad 3) zum Dorfrand
  const start = new THREE.Vector2(120, -200), end = new THREE.Vector2(VILLAGE.x - 30, VILLAGE.y - 75);
  const count = 4;
  const angle = Math.atan2(-(end.y - start.y), end.x - start.x) + Math.PI / 2;
  const hangs = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    hangs.push(buildPylon(start.x + (end.x - start.x) * t, start.y + (end.y - start.y) * t, angle));
  }
  // Seile zwischen benachbarten Masten mit Durchhang
  for (let i = 1; i < hangs.length; i++) {
    for (let k = 0; k < ARMS.length; k++) {
      const a = hangs[i - 1][k], b = hangs[i][k];
      const points = [];
      for (let s = 0; s <= 16; s++) {
        const t = s / 16;
        points.push(new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -6 * 4 * t * (1 - t), 0)));
      }
      add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, 0.12, 4, false), cableMat, parkScene, false);
    }
  }
}

// ---------------- Windstreifen: helle, dünne Streifen, die mit dem Wind ziehen (mehr und schneller bei mehr Wind)

const STREAKS = 70;
const streakTexture = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 2, 256, 4);
  return new THREE.CanvasTexture(canvas);
})();
export const streakMaterial = new THREE.MeshBasicMaterial({
  map: streakTexture, transparent: true, depthWrite: false, opacity: 0.75, side: THREE.DoubleSide, fog: false,
});
const AREA = 1100;              // Streifen ziehen in diesem Bereich um den Windpark
const streaks = [];
for (let i = 0; i < STREAKS; i++) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), streakMaterial);
  mesh.renderOrder = 2;
  parkScene.add(mesh);
  streaks.push({
    mesh, u: (random() - 0.5) * AREA, w: (random() - 0.5) * AREA, height: 15 + random() * 130,
    length: 50 + random() * 60, speed: 0.7 + random() * 0.6, visibleBelow: random(),
  });
}
const SIDE = new THREE.Vector3(-WIND_DIR.z, 0, WIND_DIR.x);   // quer zum Wind
const CENTER = new THREE.Vector3(-60, 0, -200);

// ---------------- Abgleich (jedes Bild, dt in s Echtzeit)

const rpmToRad = rpm => rpm * 2 * Math.PI / 60;
let laufzeit = 0;   // s, für das Blinken der Warnlichter
export function syncPark(dt, camera) {
  laufzeit += dt;
  syncTageszeit(state.time, laufzeit);
  syncSchilder(camera);
  for (const t of turbines) t.rotor.rotation.z -= rpmToRad(park.rpm * t.factor) * dt;
  // Windstreifen: Anzahl und Geschwindigkeit wachsen mit dem Wind
  const strength = Math.min(1, state.wind / WIND_MAX);
  for (const s of streaks) {
    s.u += s.speed * (6 + 4 * state.wind) * dt;
    if (s.u > AREA / 2) s.u -= AREA;
    const visible = state.wind > 0.5 && s.visibleBelow < 0.25 + 0.75 * strength;
    s.mesh.visible = visible;
    if (!visible) continue;
    const p = CENTER.clone().addScaledVector(WIND_DIR, s.u).addScaledVector(SIDE, s.w);
    p.y = terrainHeight(p.x, p.z) + s.height;
    s.mesh.position.copy(p);
    // Streifen liegt in Windrichtung und dreht sich zur Kamera
    const toCamera = camera.position.clone().sub(p);
    const normal = toCamera.sub(WIND_DIR.clone().multiplyScalar(toCamera.dot(WIND_DIR))).normalize();
    s.mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(WIND_DIR, normal.clone().cross(WIND_DIR), normal));
    s.mesh.scale.set(s.length, 2.6, 1);
  }
}

// Windrad hervorheben (Maus darüber bzw. angetippt)
export function highlightTurbine(turbine) {
  for (const t of turbines) for (const m of t.materials) m.emissive.setHex(t === turbine ? 0x2a5d8f : 0x000000);
}

// Blick in die Gondel: amount 0 … 1 macht das Gehäuse durchsichtig und zeigt Welle und Generator
export function revealNacelle(turbine, amount) {
  for (const t of turbines) {
    const a = t === turbine ? amount : 0;
    const shell = t.housing.material;
    shell.transparent = a > 0;
    shell.opacity = 1 - 0.82 * a;
    shell.depthWrite = a < 0.5;
    shell.needsUpdate = true;
    t.inside.visible = t.spin.visible = a > 0;
  }
}

// Startansicht des Windparks: von links vorne (gegen den Wind, Rotoren von vorne), Dorf rechts im Bild – noch links
// vom Bedienfeld, damit die Schilder der betretbaren Häuser zu sehen sind
export function parkView(camera, controls) {
  camera.position.copy(START_BLICK.position);
  controls.target.copy(START_BLICK.ziel);
}
