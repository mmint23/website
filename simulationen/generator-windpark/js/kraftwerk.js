// ------------------------------------------------------------------
// Kohlekraftwerk (per Knopf „Kohlekraftwerk zeigen“ einblendbar): Kohlehalde mit Förderband, Kesselhaus mit
// Schornstein, Maschinenhaus, Kühlturm und eine eigene Stromleitung ins Dorf. Antippen (uebergang.js): Kamerafahrt
// davor, die Wände werden durchsichtig, und man sieht die Energiekette im Inneren:
//   Kohle verbrennt (Feuer) → Hitze → Wasser in den Kesselrohren wird zu Dampf → Dampf strömt durch die Turbine und
//   dreht sie → auf derselben Welle dreht sich der Generator (Polrad wie im Windrad, feste Spulen) → Kabel zur Leitung.
//   Im Kondensator wird der Dampf wieder zu Wasser und zurück in den Kessel gepumpt.
// Feuer an/aus im Bedienfeld: Ohne Feuer kühlt der Kessel ab, es entsteht kein Dampf, die Turbine läuft aus (physik.js).
// Maße in m, in den Koordinaten der Anlage: x nach rechts (von der Startansicht aus gesehen), z zur Startansicht.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { KRAFTWERK } from './config.js';
import { state } from './state.js';
import { kraftwerk } from './physik.js';
import { parkScene, makeTag, START_BLICK, WIND_DIR, stromleitung, DORF } from './landschaft.js';
import { dunkelheit } from './tageszeit.js';

const add = (geometry, material, parent, shadow = true) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Die Anlage steht eben (Gelände dort: landschaft.js) und zeigt mit der Vorderseite zur Startansicht
export const anlage = new THREE.Group();
anlage.position.set(KRAFTWERK.X, KRAFTWERK.BODEN, KRAFTWERK.Z);
{
  const zurKamera = START_BLICK.position.clone().sub(anlage.position);
  anlage.rotation.y = Math.atan2(zurKamera.x, zurKamera.z);
}
parkScene.add(anlage);
anlage.updateMatrixWorld();

// ---------------- Von außen

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
const kesselWand = mat(0x9b8a7e), maschinenWand = mat(0xb9c0c7);   // werden beim Blick hinein durchsichtig
const beton = mat(0xd2cec6, { side: THREE.DoubleSide });
const rot = mat(0xc62828, { roughness: 0.6 });
const kohleMat = mat(0x24211e, { roughness: 1 });
const dunkelgrau = mat(0x4b5258, { roughness: 0.6 });

add(new THREE.BoxGeometry(250, 1, 150), mat(0x9d9b92, { roughness: 1 }), anlage, false).position.set(0, 0, -15);
const kesselhaus = add(new THREE.BoxGeometry(34, 48, 34), kesselWand, anlage);
kesselhaus.position.set(-30, 24, 0);
const maschinenhaus = add(new THREE.BoxGeometry(65, 28, 30), maschinenWand, anlage);
maschinenhaus.position.set(19.5, 14, 0);
// Schornstein mit roten Ringen
add(new THREE.CylinderGeometry(2.6, 4, 140, 20), beton, anlage).position.set(-30, 70, -30);
for (const y of [116, 128]) add(new THREE.CylinderGeometry(2.8, 2.85, 6, 20), rot, anlage).position.set(-30, y, -30);
// Kühlturm: Hyperboloid, an der Taille bei 80 m am schmalsten
{
  const punkte = [];
  for (let i = 0; i <= 22; i++) {
    const y = i * 5;
    punkte.push(new THREE.Vector2(24 * Math.sqrt(1 + ((y - 80) / 60) ** 2), y));
  }
  add(new THREE.LatheGeometry(punkte, 48), beton, anlage).position.set(80, 0, -65);
}
// Kohlehalde und Förderband zum Kesselhaus
add(new THREE.ConeGeometry(20, 11, 18), kohleMat, anlage).position.set(-84, 5.5, 14);
const BAND = [V(-72, 6, 14), V(-47, 18, 14)];
{
  const mitte = BAND[0].clone().lerp(BAND[1], 0.5), richtung = BAND[1].clone().sub(BAND[0]);
  const band = add(new THREE.BoxGeometry(richtung.length(), 0.8, 2.6), dunkelgrau, anlage);
  band.position.copy(mitte).y -= 0.6;
  band.rotation.z = Math.atan2(richtung.y, richtung.x);
  for (const t of [0.35, 0.75]) {
    const p = BAND[0].clone().lerp(BAND[1], t), stuetze = add(new THREE.BoxGeometry(0.6, p.y, 0.6), dunkelgrau, anlage);
    stuetze.position.set(p.x, p.y / 2 - 0.6, p.z);
  }
}
// Umspannwerk (Transformator) neben dem Maschinenhaus; von hier geht die Leitung ins Dorf
add(new THREE.BoxGeometry(6, 5, 4.5), dunkelgrau, anlage).position.set(60, 2.5, 22);
export const leitung = new THREE.Group();
parkScene.add(leitung);
{
  const start = anlage.localToWorld(V(66, 0, 30));
  stromleitung(new THREE.Vector2(start.x, start.z), new THREE.Vector2(DORF.x + 15, DORF.y - 80), 5, leitung);
}

// Schild über dem Kesselhaus (bleibt wie die Schilder der Häuser auf dem Bildschirm gleich groß)
const schild = makeTag('Kohlekraftwerk');
schild.position.set(-30, 68, 0);
anlage.add(schild);

// ---------------- Innen (nur beim Blick hinein sichtbar)

const innen = new THREE.Group();
innen.visible = false;
anlage.add(innen);
// Hallenbeleuchtung: abends und nachts, damit man Turbine und Generator auch dann erkennt
const hallenlicht = new THREE.PointLight(0xfff2dd, 0, 140, 0);
hallenlicht.position.set(10, 40, 40);
innen.add(hallenlicht);
const glas = (color, opacity) => new THREE.MeshStandardMaterial({ color, transparent: true, opacity, depthWrite: false, roughness: 0.2, side: THREE.DoubleSide });
const metall = mat(0xc4cad1, { metalness: 0.8, roughness: 0.35 });
const copperMat = new THREE.MeshStandardMaterial({ color: 0xc46a2b, metalness: 0.8, roughness: 0.35 });
const turnMat = new THREE.MeshStandardMaterial({ color: 0x8a4318, metalness: 0.7, roughness: 0.4 });
const statorMat = new THREE.MeshStandardMaterial({ color: 0x6b7480, metalness: 0.6, roughness: 0.4 });
const kabelMat = new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.7 });
const northMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.45 });
const southMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.45 });
const tube = (punkte, radius, material, parent = innen) =>
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(punkte), 64, radius, 10, false), material, parent, false);

// Feuerraum unten im Kessel: glühendes Kohlebett und Flammen (flackern; Größe und Helligkeit mit der Hitze)
const KESSEL = V(-30, 0, 0);
const glutMat = new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, depthWrite: false });
const glut = add(new THREE.CircleGeometry(7, 24), glutMat, innen, false);
glut.rotation.x = -Math.PI / 2;
glut.position.set(KESSEL.x, 1.3, 0);
for (let i = 0; i < 14; i++) {
  const a = i * 2.4, r = 1.5 + (i % 4) * 1.3;
  add(new THREE.BoxGeometry(1.6, 0.9, 1.4), kohleMat, innen, false).position.set(KESSEL.x + r * Math.cos(a), 1.1, r * Math.sin(a));
}
const flammenGeo = new THREE.ConeGeometry(1.9, 10, 10);
flammenGeo.translate(0, 5, 0);
const flammen = [];
for (let i = 0; i < 9; i++) {
  const a = i * 2.1, r = i === 0 ? 0 : 2.2 + (i % 3) * 1.4;
  const material = new THREE.MeshBasicMaterial({ color: i % 3 ? 0xff8a1e : 0xffd34d, transparent: true, opacity: 0.85,
    depthWrite: false, blending: THREE.AdditiveBlending });
  const flamme = add(flammenGeo, material, innen, false);
  flamme.position.set(KESSEL.x + r * Math.cos(a), 1.2, r * Math.sin(a));
  flammen.push({ flamme, groesse: 0.8 + 0.5 * ((i * 7) % 5) / 4, takt: 5 + i * 1.7 });
}
// Kesselrohre rund um den Feuerraum: Darin wird Wasser zu Dampf; sie glühen mit der Hitze. Oben die Dampftrommel.
const rohrMat = mat(0x7a5f55, { metalness: 0.5, roughness: 0.5, emissive: 0xff3d00, emissiveIntensity: 0 });
for (let i = 0; i < 16; i++) {
  const a = i / 16 * Math.PI * 2;
  add(new THREE.CylinderGeometry(0.45, 0.45, 36, 8), rohrMat, innen, false).position.set(KESSEL.x + 8 * Math.cos(a), 22, 8 * Math.sin(a));
}
for (const y of [4, 40]) {
  const ring = add(new THREE.TorusGeometry(8, 0.7, 8, 40), rohrMat, innen, false);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(KESSEL.x, y, 0);
}
const trommel = add(new THREE.CylinderGeometry(2.6, 2.6, 18, 20), metall, innen, false);
trommel.rotation.x = Math.PI / 2;
trommel.position.set(KESSEL.x, 42.5, 0);

// Turbine und Generator auf einer Welle (Achse entlang x, 14 m über dem Boden): Die Laufräder der Turbine werden
// nach hinten größer (der Dampf dehnt sich aus); der Generator ist gebaut wie im Windrad: ein Stabmagnet als Polrad
// (Nordpol rot, Südpol grün) dreht sich zwischen zwei festen Spulen mit Eisenkern. Die Maschinen sind im Maßstab
// GROSS vergrößert (Koordinaten der Welle: Boden bei y = −BODEN_W), damit man sie gut erkennt.
const WELLE_Y = 14, GEN_X = 28, GROSS = 1.35, BODEN_W = WELLE_Y / GROSS;
const welle = new THREE.Group();
welle.position.set(0, WELLE_Y, 0);
welle.scale.setScalar(GROSS);
innen.add(welle);
const w = (x, y, z) => V(x * GROSS, WELLE_Y + y * GROSS, z * GROSS);   // Punkt der Welle in Koordinaten der Anlage
const laeufer = new THREE.Group();   // dreht sich (Welle, Laufräder, Polrad)
welle.add(laeufer);
{
  const achse = add(new THREE.CylinderGeometry(0.5, 0.5, 38, 12), metall, laeufer, false);
  achse.rotation.z = Math.PI / 2;
  achse.position.x = 17;
}
for (let i = 0; i < 6; i++) {
  const x = 3.5 + i * 2.8, spitze = 3.4 + i * 0.7;
  const nabe = add(new THREE.CylinderGeometry(1.4, 1.4, 0.6, 16), metall, laeufer, false);
  nabe.rotation.z = Math.PI / 2;
  nabe.position.x = x;
  for (let k = 0; k < 16; k++) {
    const halter = new THREE.Group();
    halter.position.x = x;
    halter.rotation.x = k / 16 * Math.PI * 2 + i * 0.2;
    laeufer.add(halter);
    const schaufel = add(new THREE.BoxGeometry(0.25, spitze - 1.3, 0.9), metall, halter, false);
    schaufel.position.y = (spitze + 1.3) / 2;
    schaufel.rotation.y = 0.55;
  }
}
// Turbinengehäuse (durchsichtig, damit man die Laufräder sieht)
{
  const profil = [[4.3, 0], [5.1, 6], [6.3, 12], [7.4, 17]].map(([r, h]) => new THREE.Vector2(r, h));
  const gehaeuse = add(new THREE.LatheGeometry(profil, 40), glas(0xaab4bf, 0.22), welle, false);
  gehaeuse.rotation.z = -Math.PI / 2;
  gehaeuse.position.x = 2;
}
for (const [material, y] of [[northMat, 1.35], [southMat, -1.35]]) {
  add(new THREE.BoxGeometry(1.8, 2.7, 1.8), material, laeufer, false).position.set(GEN_X, y, 0);
}
for (const seite of [1, -1]) {
  const kern = add(new THREE.CylinderGeometry(0.7, 0.7, 2.8, 16), statorMat, welle, false);
  kern.position.set(GEN_X, seite * 4.5, 0);
  add(new THREE.BoxGeometry(2.4, 0.3, 2.2), statorMat, welle, false).position.set(GEN_X, seite * 3.15, 0);
  add(new THREE.CylinderGeometry(1.2, 1.2, 1.9, 20), copperMat, welle, false).position.set(GEN_X, seite * 4.7, 0);
  for (let w = 0; w < 5; w++) {
    const windung = add(new THREE.TorusGeometry(1.24, 0.11, 8, 28), turnMat, welle, false);
    windung.rotation.x = Math.PI / 2;
    windung.position.set(GEN_X, seite * (3.9 + w * 0.4), 0);
  }
}
// Lagerböcke unter der Welle
for (const x of [-1, 22, 34]) {
  add(new THREE.BoxGeometry(1.6, BODEN_W - 0.5, 2.2), dunkelgrau, welle, false).position.set(x, -(BODEN_W + 0.5) / 2, 0);
}
// Kabel von den Spulen nach draußen zum Transformator
const G = GEN_X * GROSS;
for (const punkte of [
  [w(GEN_X, 5.9, 0), V(G, 25, 0.5), V(50, 25, 9), V(58, 7, 20), V(59, 5, 21)],
  [w(GEN_X, -5.9, 0), V(G + 3, 2.5, 4), V(50, 1.2, 12), V(57, 1.5, 20), V(58.5, 2, 21)],
]) {
  for (const dz of [-0.3, 0.3]) tube(punkte.map(p => p.clone().add(V(0, 0, dz))), 0.22, kabelMat);
}
// Kondensator unter dem Ende der Turbine: Dort wird der Dampf abgekühlt und wieder zu Wasser
add(new THREE.BoxGeometry(6, 3.2, 6.6), mat(0x5b7186, { metalness: 0.4 }), welle, false).position.set(16, -BODEN_W + 1.6, 0);

// Dampfweg: aus der Trommel durch die Leitung (durchsichtig) in die Turbine, durch die Turbine in den Kondensator
const DAMPF_LEITUNG = [V(KESSEL.x, 45, 0), V(-24, 48, 0), V(-14, 48, 0), V(-6, 43, 0), V(-4, 32, 0), V(-4, 22, 0), V(-1, 15.5, 0), w(2.5, 0, 0)];
const dampfWeg = new THREE.CatmullRomCurve3([...DAMPF_LEITUNG, w(10, 0, 0), w(16.5, -1, 0), w(17, -5.5, 0), w(16, -8.5, 0)]);
tube(DAMPF_LEITUNG, 1.4, glas(0xdfe6ec, 0.3));
// Wasserweg zurück: vom Kondensator mit der Speisewasserpumpe in den unteren Ring der Kesselrohre
const wasserWeg = new THREE.CatmullRomCurve3([V(21.6, 1.5, 4.8), V(10, 1, 8), V(-12, 1, 8), V(-21, 2, 7), V(-24.5, 4, 5.5)]);
tube(wasserWeg.points, 0.7, glas(0x4f8fd6, 0.35));
add(new THREE.CylinderGeometry(1.1, 1.1, 2.4, 16), mat(0x2f6fb5, { metalness: 0.4 }), innen, false).position.set(-4, 1.2, 8);

// Wölkchen (weiche runde Flecken) für Dampf in den Leitungen und Rauch bzw. Dampfwolken draußen
const wolkenTextur = (() => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
})();
const wolke = (color, fog = true) => new THREE.SpriteMaterial({ map: wolkenTextur, color, transparent: true, depthWrite: false, fog });

// Teilchen, die einen Weg entlangziehen (Dampf, Wasser, Kohle auf dem Band)
function teilchen(anzahl, machen) {
  return Array.from({ length: anzahl }, (_, i) => ({ objekt: machen(i), u: i / anzahl }));
}
const dampfMat = wolke(0xffffff, false);
const dampf = teilchen(46, () => {
  const s = new THREE.Sprite(dampfMat);
  s.scale.setScalar(2.4);
  s.renderOrder = 3;
  innen.add(s);
  return s;
});
const wasserMat = new THREE.MeshStandardMaterial({ color: 0x5fb4ff, roughness: 0.3, transparent: true });
const tropfenGeo = new THREE.SphereGeometry(0.55, 10, 8);
const wasser = teilchen(18, () => add(tropfenGeo, wasserMat, innen, false));
// Kohle: vom Förderband (draußen) bis ins Feuer (drinnen)
const kohleWeg = new THREE.CatmullRomCurve3([V(-72, 6.6, 14), ...[0.5, 1].map(t => BAND[0].clone().lerp(BAND[1], t).add(V(0, 0.6, 0))),
  V(-38, 18, 8), V(-33, 9, 3), V(KESSEL.x, 1.6, 1)]);
const brockenGeo = new THREE.BoxGeometry(1.2, 0.9, 1.1);
const kohle = teilchen(16, () => add(brockenGeo, kohleMat, anlage, false));

// Rauch aus dem Schornstein (mit dem Feuer) und Dampfwolke über dem Kühlturm (mit dem Dampf); ziehen mit dem Wind.
// Eigene Gruppe in der Szene, damit Antippen des Himmels nicht als Antippen des Kraftwerks zählt.
export const wolken = new THREE.Group();
parkScene.add(wolken);
function schwaden(quelle, anzahl, groesse, farbe, steigen, dauer) {
  return {
    quelle: anlage.localToWorld(quelle), groesse, steigen, dauer,
    teile: Array.from({ length: anzahl }, (_, i) => {
      const s = new THREE.Sprite(wolke(farbe));
      wolken.add(s);
      return { s, alter: i / anzahl };
    }),
  };
}
const rauch = schwaden(V(-30, 142, -30), 14, 14, 0x8a8a8a, 60, 9);
const kuehldampf = schwaden(V(72, 112, -50), 16, 46, 0xf4f6f8, 70, 12);
function syncSchwaden(sw, menge, dt) {
  const abdrift = 6 + 3 * state.wind;   // m/s mit dem Wind
  for (const t of sw.teile) {
    t.alter = (t.alter + dt / sw.dauer) % 1;
    const a = t.alter;
    t.s.position.copy(sw.quelle).addScaledVector(WIND_DIR, a * abdrift * sw.dauer * 0.5);
    t.s.position.y += a * sw.steigen;
    t.s.scale.setScalar(sw.groesse * (0.5 + 1.3 * a));
    t.s.material.opacity = 0.85 * menge * Math.sin(Math.PI * Math.min(1, a * 1.4));
    t.s.visible = menge > 0.01;
  }
}

// Beschriftungen innen (gleich groß auf dem Bildschirm)
const beschriftungen = [
  ['Kohle verbrennt: Hitze', V(KESSEL.x, 15, 18)],
  ['Wasser wird zu Dampf', V(KESSEL.x, 33, 18)],
  ['Dampfturbine', V(14, 30, 8)],
  ['Generator', V(G, 30, 8)],
  ['Kondensator', V(21.6, 9, 10)],
].map(([text, ort]) => {
  const tag = makeTag(text);
  tag.position.copy(ort);
  innen.add(tag);
  return tag;
});

// ---------------- Abgleich (jedes Bild)

const SCHILD_HOEHE = 0.024, BESCHRIFTUNG_HOEHE = 0.028;   // Anteil der Bildhöhe
const punkt = new THREE.Vector3();
function bildschirmGroesse(sprite, anteil, camera) {
  const seiten = sprite.userData.seiten ??= sprite.scale.x / sprite.scale.y;
  const h = anteil * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.distanceTo(sprite.getWorldPosition(punkt));
  sprite.scale.set(h * seiten, h, 1);
}

let zeit = 0, zufuhr = 1;
export function syncKraftwerk(dt, camera) {
  anlage.visible = leitung.visible = wolken.visible = state.kraftwerk;
  if (!state.kraftwerk) return;
  zeit += dt;
  const { hitze, drehzahl, feuer } = kraftwerk;
  zufuhr += ((feuer ? 1 : 0) - zufuhr) * Math.min(1, dt / 0.6);   // Förderband hält kurz nach dem Löschen an
  // Turbine, Generator: verlangsamt dargestellt (bei voller Drehzahl 0,6 Umdrehungen pro Sekunde statt 50)
  laeufer.rotation.x -= drehzahl * 2 * Math.PI * 0.6 * dt;
  // Feuer und Hitze
  for (const { flamme, groesse, takt } of flammen) {
    const flackern = 0.75 + 0.25 * Math.sin(zeit * takt) * Math.sin(zeit * takt * 0.37 + 1);
    flamme.scale.set(1, Math.max(0.01, hitze * groesse * flackern), 1);
    flamme.visible = feuer || hitze > 0.15;
    flamme.material.opacity = 0.85 * Math.min(1, hitze * 1.5);
  }
  glutMat.opacity = 0.9 * hitze;
  hallenlicht.intensity = 1.6 * dunkelheit(state.time);
  rohrMat.emissiveIntensity = 0.9 * hitze;
  // Dampf, Wasser, Kohle ziehen ihre Wege entlang
  dampfMat.opacity = 0.9 * kraftwerk.dampf;
  for (const t of dampf) {
    t.u = (t.u + dt * 0.1 * kraftwerk.dampf) % 1;
    t.objekt.position.copy(dampfWeg.getPointAt(t.u));
  }
  wasserMat.opacity = Math.min(1, 1.5 * kraftwerk.dampf);
  for (const t of wasser) {
    t.u = (t.u + dt * 0.07 * kraftwerk.dampf) % 1;
    t.objekt.position.copy(wasserWeg.getPointAt(t.u));
  }
  for (const t of kohle) {
    t.u = (t.u + dt * 0.06 * zufuhr) % 1;
    t.objekt.position.copy(kohleWeg.getPointAt(t.u));
  }
  syncSchwaden(rauch, hitze, dt);
  syncSchwaden(kuehldampf, kraftwerk.dampf, dt);
  bildschirmGroesse(schild, SCHILD_HOEHE, camera);
  for (const tag of beschriftungen) bildschirmGroesse(tag, BESCHRIFTUNG_HOEHE, camera);
}

// Hervorheben (Maus darüber)
export function highlightKraftwerk(an) {
  for (const m of [kesselWand, maschinenWand]) m.emissive.setHex(an ? 0x2a5d8f : 0x000000);
}

// Blick hinein: amount 0 … 1 macht Kesselhaus und Maschinenhaus durchsichtig und zeigt das Innere
export function revealKraftwerk(amount) {
  for (const m of [kesselWand, maschinenWand]) {
    m.transparent = amount > 0;
    m.opacity = 1 - 0.86 * amount;
    m.depthWrite = amount < 0.5;
    m.needsUpdate = true;
  }
  kesselhaus.castShadow = maschinenhaus.castShadow = amount === 0;
  innen.visible = amount > 0;
  schild.visible = amount === 0;
  for (const tag of beschriftungen) tag.visible = amount > 0.6;
}

// Kamera vor dem Kraftwerk: schräg von oben, das Innere links vom Bedienfeld
export function kraftwerkBlick() {
  return { position: anlage.localToWorld(V(2, 66, 140)), ziel: anlage.localToWorld(V(6, 18, 0)) };
}
export function kraftwerkView(camera, controls) {
  const { position, ziel } = kraftwerkBlick();
  camera.position.copy(position);
  controls.target.copy(ziel);
}
