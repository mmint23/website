// ------------------------------------------------------------------
// Glühlampe selbst anschließen: Von den beiden Buchsen der Lampen-Steckplatte gehen zwei schwarze Kabel mit
// Bananensteckern ab. Zu Beginn liegen die Stecker vor der Lampe auf dem Tisch; man zieht sie mit Finger oder Maus an
// die Anschlüsse der Spulen (A bzw. E von Spule 1 und 2). In der Nähe eines Anschlusses rastet der Stecker ein (der
// Anschluss leuchtet auf); lässt man ihn daneben los, fällt er zurück auf den Tisch. Ein steckender Stecker lässt sich
// wieder abziehen. Wo die Stecker stecken, steht in state.lampPlugs (die Physik rechnet damit die Lampenspannung,
// physik.js). Die Verbindung zwischen den Spulen bleibt dabei bestehen (messgeraet.js).
// ------------------------------------------------------------------
import * as THREE from 'three';
import { TABLE_TOP } from './config.js';
import { state } from './state.js';
import { addMesh } from './hilfen.js';
import { mat } from './materialien.js';
import { scene, renderer, camera, controls } from './szene.js';
import { terminals } from './modell.js';
import { lampSocket } from './gluehlampe.js';

const canvas = renderer.domElement;
const TISCH = TABLE_TOP + 0.3;           // Höhe der Kabelmitte auf dem Tisch
const PIN = 1.2, GRIFF = 2.4;           // Länge von Stift und Griff des Steckers (cm)
const FANG = 2.8;                        // so nah (cm, in der Ebene der Anschlüsse) rastet ein Stecker ein
const EBENE_Z = 4.2;                     // gezogene Stecker bewegen sich in dieser Ebene vor den Anschlüssen

// Anschlüsse: Kennung → Lage ('a0': A von Spule 1 usw.)
const ANSCHLUESSE = ['a0', 'e0', 'a1', 'e1'];
const anschlussPunkt = id => terminals[Number(id[1])]?.[id[0]];
const vorhanden = id => Boolean(anschlussPunkt(id)) && (state.coils === 2 || id[1] === '0');

// ---------------- Stecker (Ursprung: Spitze des Stifts, Stift entlang +y nach vorne)

const stecker = [mat.cableBlack, mat.cableBlack].map((farbe, i) => {
  const gruppe = new THREE.Group();
  gruppe.visible = false;
  scene.add(gruppe);
  const stift = addMesh(new THREE.CylinderGeometry(0.2, 0.2, PIN, 12), mat.brass, gruppe);
  stift.position.y = -PIN / 2;
  const griff = addMesh(new THREE.CylinderGeometry(0.5, 0.45, GRIFF, 20), farbe, gruppe);
  griff.position.y = -PIN - GRIFF / 2;
  const kragen = addMesh(new THREE.CylinderGeometry(0.62, 0.62, 0.35, 20), farbe, gruppe);
  kragen.position.y = -PIN - 0.15;
  // unsichtbare, größere Grifffläche für den Finger
  const ziel = new THREE.Mesh(new THREE.BoxGeometry(2.6, GRIFF + PIN + 1.5, 2.6), new THREE.MeshBasicMaterial({ visible: false }));
  ziel.position.y = -(GRIFF + PIN) / 2;
  gruppe.add(ziel);
  return { gruppe, ziel, farbe, seite: i === 0 ? 1 : -1, kabel: null, schluessel: '' };
});

// Ruhelage auf dem Tisch vor der Lampe: liegend, Spitze zum Generator
function ruhe(i) {
  return { spitze: new THREE.Vector3(18.5, TABLE_TOP + 0.5, i === 0 ? 5 : 9.5), richtung: new THREE.Vector3(-1, 0, 0) };
}
// Steckt im Anschluss: von vorne hineingesteckt (der zweite Stecker am selben Anschluss steckt hinten im ersten)
function steckt(i, id) {
  const p = anschlussPunkt(id);
  const gestapelt = i === 1 && state.lampPlugs[0] === id;
  return { spitze: new THREE.Vector3(p.x, p.y, p.z + 0.45 + (gestapelt ? PIN + GRIFF - 0.3 : 0)), richtung: new THREE.Vector3(0, 0, -1) };
}

// ---------------- Kabel von der Buchse der Lampe zum Stecker

const sag = (p, dy) => new THREE.Vector3(p.x, p.y + dy, p.z);
// Ende des Steckers, an dem das Kabel hängt, und ein Punkt dahinter
const hinten = (lage, d = 0) => lage.spitze.clone().addScaledVector(lage.richtung, -(PIN + GRIFF + d));

function kabelPunkte(s, lage, eingesteckt) {
  const buchse = lampSocket(s.seite);
  const anfang = [buchse, sag(buchse, 2.5), new THREE.Vector3(buchse.x - 3, buchse.y + 4, buchse.z)];
  const ende = [hinten(lage, 1.6), hinten(lage)];
  if (eingesteckt) {
    // ordentlich verlegt: rechte Spule direkt nach rechts zur Lampe; linke Spule außen am Joch hinunter auf den Tisch
    // und vorne über den Tisch nach rechts
    const h = hinten(lage, 1.2), rechts = h.x > 0, z = 9 + 0.8 * s.seite;   // zwei Kabel nebeneinander
    const weg = rechts
      ? [new THREE.Vector3(h.x + 2.5, h.y - 1, h.z + 0.6), new THREE.Vector3(21, h.y / 2 + 2, 8)]
      : [new THREE.Vector3(h.x - 2.5, h.y - 1, h.z + 0.6), new THREE.Vector3(-20.5, -6, 8), new THREE.Vector3(-20, -14, 8.5),
          new THREE.Vector3(-16, TISCH, z), new THREE.Vector3(-4, TISCH, z), new THREE.Vector3(10, TISCH, z), new THREE.Vector3(19, TISCH, z - 0.5)];
    return [...anfang, ...weg.reverse(), h, ...ende];   // weg ist vom Stecker aus angegeben
  }
  // lose: hängt zwischen Lampe und Stecker durch (höchstens bis auf den Tisch)
  const a = anfang[2], b = ende[0];
  const durchhang = 0.18 * a.distanceTo(b);
  const mitte = a.clone().lerp(b, 0.5);
  mitte.y = Math.max(TISCH, Math.min(a.y, b.y) - durchhang);
  return [...anfang, mitte, ...ende];
}

function kabelLegen(s, punkte) {
  if (s.kabel) {
    s.kabel.geometry.dispose();
    scene.remove(s.kabel);
  }
  const kurve = new THREE.CatmullRomCurve3(punkte, false, 'centripetal');
  s.kabel = addMesh(new THREE.TubeGeometry(kurve, 160, 0.3, 10, false), s.farbe, scene);
}

// ---------------- Markierung der Anschlüsse beim Ziehen

const markeMat = new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.35, depthWrite: false });
const marken = Object.fromEntries(ANSCHLUESSE.map(id => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1.3, 20, 14), markeMat.clone());
  m.visible = false;
  m.renderOrder = 5;
  scene.add(m);
  return [id, m];
}));

// ---------------- Ziehen

const raycaster = new THREE.Raycaster();
const zeiger = new THREE.Vector2();
const ebene = new THREE.Plane(new THREE.Vector3(0, 0, 1), -EBENE_Z);
const treffer = new THREE.Vector3();
const zug = { id: null, index: -1, spitze: new THREE.Vector3(), ziel: null };
let geaendert = () => {};

function strahl(event) {
  const rect = canvas.getBoundingClientRect();
  zeiger.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(zeiger, camera);
}
const aktiv = () => state.display === 'lamp';

// Welcher Stecker liegt unter dem Zeiger? (Index oder −1); braucht einen gesetzten Strahl
function steckerUnter() {
  if (!aktiv()) return -1;
  let best = -1, abstand = Infinity;
  stecker.forEach((s, i) => {
    const t = raycaster.intersectObject(s.ziel, false)[0];
    if (t && t.distance < abstand) { best = i; abstand = t.distance; }
  });
  return best;
}
// Für ziehen.js (Mauszeiger als Hand über einem Stecker)
export const zeigerAufStecker = () => steckerUnter() >= 0;

// Nächster Anschluss in Fangweite der Zeigerposition (in der Ebene der Anschlüsse) oder null
function naechsterAnschluss(p) {
  let best = null, abstand = FANG;
  for (const id of ANSCHLUESSE) {
    if (!vorhanden(id)) continue;
    const a = anschlussPunkt(id), d = Math.hypot(a.x - p.x, a.y - p.y);
    if (d < abstand) { best = id; abstand = d; }
  }
  return best;
}

// Erfassungsphase: vor Kurbel (ziehen.js) und Ansichtssteuerung, die für diesen Zug nichts mitbekommen
canvas.addEventListener('pointerdown', event => {
  if (zug.id !== null) return;
  strahl(event);
  const i = steckerUnter();
  if (i < 0) return;
  event.stopImmediatePropagation();
  event.preventDefault();
  Object.assign(zug, { id: event.pointerId, index: i, ziel: null });
  zug.spitze.copy(stecker[i].gruppe.position);
  controls.enabled = false;
  canvas.setPointerCapture(event.pointerId);
  canvas.style.cursor = 'grabbing';
  if (state.lampPlugs[i]) {   // abziehen: der Stromkreis ist sofort offen
    state.lampPlugs[i] = null;
    geaendert();
  }
}, { capture: true });

canvas.addEventListener('pointermove', event => {
  if (event.pointerId !== zug.id) return;
  strahl(event);
  if (!raycaster.ray.intersectPlane(ebene, treffer)) return;
  treffer.y = Math.max(treffer.y, TABLE_TOP + 1.5);
  zug.ziel = naechsterAnschluss(treffer);
  zug.spitze.copy(treffer);
});

function loslassen(event) {
  if (event.pointerId !== zug.id) return;
  if (zug.ziel) {
    state.lampPlugs[zug.index] = zug.ziel;
    geaendert();
  }
  Object.assign(zug, { id: null, index: -1, ziel: null });
  controls.enabled = true;
  canvas.style.cursor = '';
}
canvas.addEventListener('pointerup', loslassen);
canvas.addEventListener('pointercancel', loslassen);

// Rückmeldung an das Bedienfeld (Anzeige, wo die Lampe angeschlossen ist)
export function onPlugChange(callback) {
  geaendert = callback;
}

// ---------------- Abgleich (jedes Bild)

const oben = new THREE.Vector3(0, 1, 0);
export function syncStecker() {
  const sichtbar = state.display === 'lamp';
  if (!sichtbar && zug.id !== null) Object.assign(zug, { id: null, index: -1, ziel: null });
  for (const m of Object.values(marken)) m.visible = false;
  stecker.forEach((s, i) => {
    s.gruppe.visible = sichtbar;
    if (s.kabel) s.kabel.visible = sichtbar;
    if (!sichtbar) return;
    const id = state.lampPlugs[i];
    let lage, eingesteckt = false;
    if (i === zug.index) {
      // gezogen: rastet in der Nähe eines Anschlusses ein, sonst hängt er am Finger (Spitze schräg nach hinten unten)
      lage = zug.ziel ? steckt(i, zug.ziel) : { spitze: zug.spitze.clone(), richtung: new THREE.Vector3(0, -0.55, -0.83) };
    } else if (id && vorhanden(id)) {
      lage = steckt(i, id);
      eingesteckt = true;
    } else {
      lage = ruhe(i);
    }
    s.gruppe.position.copy(lage.spitze);
    s.gruppe.quaternion.setFromUnitVectors(oben, lage.richtung.clone().normalize());
    const schluessel = [lage.spitze, lage.richtung].map(v => v.toArray().map(x => x.toFixed(2)).join()).join('|') + eingesteckt;
    if (schluessel !== s.schluessel) {
      s.schluessel = schluessel;
      kabelLegen(s, kabelPunkte(s, lage, eingesteckt));
    }
  });
  // beim Ziehen: alle Anschlüsse schwach, den in Fangweite kräftig markieren
  if (sichtbar && zug.id !== null) {
    for (const id of ANSCHLUESSE) {
      if (!vorhanden(id)) continue;
      const m = marken[id];
      m.position.copy(anschlussPunkt(id));
      m.material.opacity = id === zug.ziel ? 0.7 : 0.25;
      m.visible = true;
    }
  }
}
