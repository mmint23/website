// ------------------------------------------------------------------
// Raum im Dorf (eigene Szene, Maße in m): ein Wohnzimmer, in das man aus dem Windpark kommt, wenn man das Haus mit
// dem Schild „Hineinschauen“ antippt (uebergang.js). Durchs Fenster sieht man die Windräder drehen – so schnell wie
// im Windpark und mit dem Himmel zur eingestellten Uhrzeit. Abends brennt die Stehlampe, die an der Steckdose
// hängt. Am Fenster steht jemand und fragt sich, wie aus der Energie der Windräder elektrische Energie wird –
// der Einstieg in die Energiekette Wind → Rotor → Generator → Leitung → Steckdose → Lampe.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { state } from './state.js';
import { park } from './physik.js';
import { himmelsfarben, dunkelheit } from './tageszeit.js';

export const raumScene = new THREE.Scene();
raumScene.background = new THREE.Color(0x1d2733);

const add = (geometry, material, parent = raumScene) => {
  const mesh = new THREE.Mesh(geometry, material);
  parent.add(mesh);
  return mesh;
};
const stoff = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });

// ---------------- Raum: Boden, drei Wände, Decke (vorne offen, dort steht die Kamera)

const B = 6, T = 5, H = 2.6;   // Breite (x), Tiefe (z), Höhe
const boden = add(new THREE.PlaneGeometry(B, T), stoff(0xa77b52));
boden.rotation.x = -Math.PI / 2;
const decke = add(new THREE.PlaneGeometry(B, T), stoff(0xf4f1ea));
decke.rotation.x = Math.PI / 2;
decke.position.y = H;
const wand = stoff(0xe9dfcc);
const links = add(new THREE.PlaneGeometry(T, H), wand);
links.position.set(-B / 2, H / 2, 0);
links.rotation.y = Math.PI / 2;
const rechts = add(new THREE.PlaneGeometry(T, H), wand);
rechts.position.set(B / 2, H / 2, 0);
rechts.rotation.y = -Math.PI / 2;

// Rückwand mit Fensteröffnung (Fenster 2,4 × 1,4 m, Unterkante 0,9 m, etwas links der Mitte)
const FENSTER = { x: -0.6, y: 1.6, b: 2.4, h: 1.4 };
{
  const form = new THREE.Shape();
  form.moveTo(-B / 2, 0);
  form.lineTo(B / 2, 0);
  form.lineTo(B / 2, H);
  form.lineTo(-B / 2, H);
  form.closePath();
  const loch = new THREE.Path();
  loch.moveTo(FENSTER.x - FENSTER.b / 2, FENSTER.y - FENSTER.h / 2);
  loch.lineTo(FENSTER.x + FENSTER.b / 2, FENSTER.y - FENSTER.h / 2);
  loch.lineTo(FENSTER.x + FENSTER.b / 2, FENSTER.y + FENSTER.h / 2);
  loch.lineTo(FENSTER.x - FENSTER.b / 2, FENSTER.y + FENSTER.h / 2);
  loch.closePath();
  form.holes.push(loch);
  add(new THREE.ShapeGeometry(form), wand).position.z = -T / 2;
  // Fensterrahmen und Sprosse
  const holz = stoff(0xffffff);
  for (const [w, h, x, y] of [[FENSTER.b + 0.12, 0.08, 0, FENSTER.h / 2], [FENSTER.b + 0.12, 0.12, 0, -FENSTER.h / 2],
    [0.08, FENSTER.h, -FENSTER.b / 2, 0], [0.08, FENSTER.h, FENSTER.b / 2, 0], [0.06, FENSTER.h, 0, 0]]) {
    add(new THREE.BoxGeometry(w, h, 0.1), holz).position.set(FENSTER.x + x, FENSTER.y + y, -T / 2 + 0.02);
  }
  // Fensterbank
  add(new THREE.BoxGeometry(FENSTER.b + 0.3, 0.05, 0.3), holz).position.set(FENSTER.x, FENSTER.y - FENSTER.h / 2 - 0.06, -T / 2 + 0.12);
}

// ---------------- Blick aus dem Fenster: Himmel, Hügel und drei Windräder (Canvas, jedes Bild neu gezeichnet)

const aussen = document.createElement('canvas');
aussen.width = 960;
aussen.height = 560;
const aussenTextur = new THREE.CanvasTexture(aussen);
aussenTextur.colorSpace = THREE.SRGBColorSpace;
const ausblick = add(new THREE.PlaneGeometry(FENSTER.b, FENSTER.h), new THREE.MeshBasicMaterial({ map: aussenTextur }));
ausblick.position.set(FENSTER.x, FENSTER.y, -T / 2 - 0.05);

const WINDRAEDER = [[0.2, 0.62, 0.9, 0.0], [0.5, 0.66, 0.7, 1.3], [0.8, 0.6, 1.0, 2.5]];   // x, Fuß, Größe, Phase
let rotor = 0;
function draussenZeichnen() {
  const ctx = aussen.getContext('2d'), W = aussen.width, Hh = aussen.height;
  const [oben, mitte, unten] = himmelsfarben(state.time);
  const g = ctx.createLinearGradient(0, 0, 0, Hh * 0.7);
  g.addColorStop(0, '#' + oben.getHexString());
  g.addColorStop(0.6, '#' + mitte.getHexString());
  g.addColorStop(1, '#' + unten.getHexString());
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, Hh);
  const dunkel = dunkelheit(state.time);
  // Hügel
  const huegel = (y, farbeTag, farbeNacht) => {
    ctx.fillStyle = '#' + new THREE.Color(farbeTag).lerp(new THREE.Color(farbeNacht), dunkel).getHexString();
    ctx.beginPath();
    ctx.moveTo(0, Hh);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, y + 18 * Math.sin(x / 130) + 10 * Math.sin(x / 47));
    ctx.lineTo(W, Hh);
    ctx.fill();
  };
  huegel(Hh * 0.62, '#8fb06a', '#1c2a26');
  // Windräder: Turm, Gondel, drei Blätter; nachts dunkel mit rotem Licht
  const weiss = '#' + new THREE.Color('#f4f6f8').lerp(new THREE.Color('#3a4352'), dunkel).getHexString();
  for (const [x, fuss, groesse, phase] of WINDRAEDER) {
    const px = x * W, py = fuss * Hh, turm = 210 * groesse, blatt = 105 * groesse;
    ctx.strokeStyle = ctx.fillStyle = weiss;
    ctx.lineCap = 'round';
    ctx.lineWidth = 7 * groesse;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - turm);
    ctx.stroke();
    ctx.lineWidth = 5 * groesse;
    for (let k = 0; k < 3; k++) {
      const a = rotor + phase + k * 2 * Math.PI / 3;
      ctx.beginPath();
      ctx.moveTo(px, py - turm);
      ctx.lineTo(px + blatt * Math.sin(a), py - turm - blatt * Math.cos(a));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(px, py - turm, 7 * groesse, 0, 2 * Math.PI);
    ctx.fill();
    if (dunkel > 0.4 && (performance.now() / 1000) % 1.5 < 1) {
      ctx.fillStyle = '#ff3a2a';
      ctx.beginPath();
      ctx.arc(px, py - turm - 9 * groesse, 6 * groesse, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  huegel(Hh * 0.82, '#6f9a4f', '#141f1b');
  aussenTextur.needsUpdate = true;
}

// ---------------- Möbel: Sofa, Tisch, Teppich, Bild

{
  const sofa = new THREE.Group();
  sofa.position.set(-1.9, 0, -0.2);
  sofa.rotation.y = Math.PI / 2;
  raumScene.add(sofa);
  const bezug = stoff(0x4f6d8a);
  add(new THREE.BoxGeometry(2.2, 0.42, 0.9), bezug, sofa).position.y = 0.21;
  add(new THREE.BoxGeometry(2.2, 0.5, 0.2), bezug, sofa).position.set(0, 0.67, -0.35);
  for (const x of [-1.05, 1.05]) add(new THREE.BoxGeometry(0.18, 0.3, 0.9), bezug, sofa).position.set(x, 0.57, 0);
  const tisch = stoff(0x7a5534);
  add(new THREE.BoxGeometry(1.1, 0.05, 0.6), tisch).position.set(-0.6, 0.45, 0.1);
  for (const [x, z] of [[-1.1, -0.15], [-0.1, -0.15], [-1.1, 0.35], [-0.1, 0.35]]) add(new THREE.BoxGeometry(0.05, 0.45, 0.05), tisch).position.set(x, 0.22, z);
  const tasse = add(new THREE.CylinderGeometry(0.045, 0.04, 0.09, 16), stoff(0xc0392b));
  tasse.position.set(-0.8, 0.52, 0.15);
  const teppich = add(new THREE.PlaneGeometry(2.6, 1.8), stoff(0xb5543c));
  teppich.rotation.x = -Math.PI / 2;
  teppich.position.set(-0.8, 0.005, 0.1);
  const bild = add(new THREE.PlaneGeometry(1.0, 0.7), stoff(0x2e7d32));
  bild.position.set(-B / 2 + 0.02, 1.6, -0.2);
  bild.rotation.y = Math.PI / 2;
}

// ---------------- Stehlampe an der Steckdose (abends an)

const lampe = new THREE.Group();
lampe.position.set(2.2, 0, -1.3);
raumScene.add(lampe);
const metall = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 });
add(new THREE.CylinderGeometry(0.18, 0.2, 0.04, 24), metall, lampe).position.y = 0.02;
add(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 12), metall, lampe).position.y = 0.77;
const schirmMaterial = new THREE.MeshStandardMaterial({ color: 0xf3e3c3, emissive: 0xffd28a, emissiveIntensity: 0, side: THREE.DoubleSide });
const schirm = add(new THREE.CylinderGeometry(0.16, 0.28, 0.32, 32, 1, true), schirmMaterial, lampe);
schirm.position.y = 1.6;
const gluehbirne = new THREE.PointLight(0xffc98a, 0, 7, 1.6);
gluehbirne.position.y = 1.55;
lampe.add(gluehbirne);
// Steckdose an der rechten Wand und Kabel von der Lampe dorthin
const dose = add(new THREE.BoxGeometry(0.03, 0.12, 0.12), stoff(0xffffff));
dose.position.set(B / 2 - 0.015, 0.3, -1.9);
for (const dz of [-0.025, 0.025]) {
  add(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 8), stoff(0x222222)).position.set(B / 2 - 0.035, 0.3, -1.9 + dz);
}
{
  const kurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.2, 0.02, -1.3), new THREE.Vector3(2.5, 0.01, -1.5), new THREE.Vector3(2.85, 0.02, -1.85),
    new THREE.Vector3(2.95, 0.2, -1.9), new THREE.Vector3(B / 2 - 0.04, 0.3, -1.9),
  ]);
  add(new THREE.TubeGeometry(kurve, 40, 0.008, 6, false), stoff(0x222222));
}

// ---------------- Person am Fenster (einfache Formen) mit Gedankenblase

{
  const person = new THREE.Group();
  person.position.set(0.7, 0, -1.55);
  person.rotation.y = 0.45;   // blickt halb zum Fenster, halb in den Raum
  raumScene.add(person);
  const hose = stoff(0x2f3e55), pulli = stoff(0xe0803a), haut = stoff(0xe6b894), haar = stoff(0x4a3324);
  for (const x of [-0.1, 0.1]) add(new THREE.CylinderGeometry(0.07, 0.06, 0.85, 12), hose, person).position.set(x, 0.43, 0);
  add(new THREE.CapsuleGeometry(0.2, 0.42, 6, 16), pulli, person).position.y = 1.18;
  for (const x of [-0.26, 0.26]) {
    const arm = add(new THREE.CapsuleGeometry(0.06, 0.48, 4, 10), pulli, person);
    arm.position.set(x, 1.15, 0.02);
    arm.rotation.z = x > 0 ? 0.12 : -0.12;
  }
  const kopf = add(new THREE.SphereGeometry(0.13, 24, 16), haut, person);
  kopf.position.y = 1.62;
  const haube = add(new THREE.SphereGeometry(0.135, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), haar, person);
  haube.position.y = 1.64;
  // Hand am Kinn: nachdenklich
  const hand = add(new THREE.SphereGeometry(0.05, 12, 10), haut, person);
  hand.position.set(0.07, 1.48, 0.12);
}

// Gedankenblase als Bild (Sprite, zeigt immer zur Kamera)
const FRAGE = ['Wie wird aus der Energie', 'der Windräder eigentlich', 'elektrische Energie?'];
{
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 520;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1d2733';
  ctx.lineWidth = 6;
  // abgerundete Blase, unten rechts kleine Gedankenkreise zur Person hin
  ctx.beginPath();
  ctx.roundRect(60, 40, 780, 320, 150);
  ctx.fill();
  ctx.stroke();
  for (const [x, y, r] of [[730, 415, 34], [790, 480, 20]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#1d2733';
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  FRAGE.forEach((zeile, i) => ctx.fillText(zeile, 450, 120 + i * 82));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const blase = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
  blase.scale.set(1.3, 1.3 * 520 / 900, 1);
  blase.position.set(-0.15, 2.0, -1.45);   // links über der Person, vor dem Fenster
  blase.renderOrder = 10;
  raumScene.add(blase);
}

// ---------------- Licht: Tageslicht durchs Fenster, abends die Lampe

const tageslicht = new THREE.HemisphereLight(0xfff6e8, 0x8a7a66, 1);
raumScene.add(tageslicht);
const fensterlicht = new THREE.DirectionalLight(0xfff1dc, 1.2);
fensterlicht.position.set(FENSTER.x, 3, -6);
raumScene.add(fensterlicht);

// Jedes Bild (dt in s Echtzeit): Windräder im Fenster drehen wie im Windpark; Licht nach Uhrzeit
export function syncRaum(dt) {
  rotor += park.rpm * 2 * Math.PI / 60 * dt;
  draussenZeichnen();
  const dunkel = dunkelheit(state.time);
  const an = dunkel > 0.3 ? 1 : 0;   // abends Licht an
  schirmMaterial.emissiveIntensity = 0.9 * an;
  gluehbirne.intensity = 6 * an;
  tageslicht.intensity = 0.25 + 0.9 * (1 - dunkel);
  fensterlicht.intensity = 1.4 * (1 - dunkel);
}

// Startansicht im Raum: vom Eingang aus auf Fenster, Person und Lampe
export function raumView(camera, controls) {
  camera.position.set(0.75, 1.6, 2.6);
  controls.target.set(0.75, 1.35, -1.2);
}
