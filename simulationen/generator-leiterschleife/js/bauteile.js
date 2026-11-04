// ------------------------------------------------------------------
// Austauschbare Bauteile auf der Welle (wie die Rotoren in der Simulation Gleichstrommotor): Leiterschleife, Spule mit
// vielen Windungen (ANKER.TURNS) und dieselbe Spule mit Eisenkern. Die Bauteile, die nicht eingebaut sind, liegen links
// neben dem Nordpol in einer Ablage (je auf zwei Böcken, Schild auf dem Tisch) – erst mit dem Knopf „Spulen auf dem
// Tisch zeigen“ (state.bauteileZeigen), der auch die Auswahl einblendet. Gewählt wird im Bedienfeld; der Tausch ist
// animiert: Bürsten nach unten, die Welle steht still, das alte Bauteil wird nach oben aus dem Spalt des liegenden
// Magneten gezogen und abgelegt, das neue eingesetzt, Bürsten wieder hoch. Solange ist der Stromkreis offen
// (physik.js, umbau).
// Die Spulen sehen aus wie im Gleichstrommotor: einzelne Windungen (abgerundete Rechtecke) in zwei Lagen, abwechselnd
// hell und dunkel, in zwei Paketen mit einer Lücke für die Welle; der Eisenkern ist ein hellgrauer Block, um den sie
// gewickelt sind (Achse quer zur Spulenebene, also in Feldrichtung bei φ = 0).
// Die eingebaute Leiterschleife zeigt modell.js (mit Zuleitungen und der Spule mit 5 Windungen); hier gibt es von ihr
// nur die Kopie für Ablage und Tausch. Alle Bauteile liegen in denselben Koordinaten wie die Schleife in der Drehgruppe
// (Spulenebene x-z) und werden eingebaut wie sie um φ + LIEGEND gedreht.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { LOOP, RINGS, TABLE_TOP, ANKER, LIEGEND, DREHUNG } from './config.js';
import { state } from './state.js';
import { rotor, spule, umbau } from './physik.js';
import { buersten } from './modell.js';
import { addMesh } from './hilfen.js';
import { mat } from './materialien.js';
import { aufbau } from './szene.js';

export const BAUTEILE = ['schleife', 'spule', 'eisen'];
export const NAMEN = { schleife: 'Leiterschleife', spule: `Spule (${ANKER.TURNS} Windungen)`, eisen: 'Spule mit Eisenkern' };
const L2 = LOOP.LENGTH / 2, R = LOOP.RADIUS;
// Spule wie im Gleichstrommotor: Draht WIRE, Windungsabstand PITCH, LAGEN Lagen; Wickelbereich quer zur Spulenebene
// von LUECKE bis PAKET (oben und unten, dazwischen die Welle)
const WIRE = 0.13, PITCH = 2 * WIRE + 0.02, LAGEN = 2, LUECKE = 0.55, PAKET = 2.0;
const KERN = { X: L2 - 1, Y: 2.6, Z: R - 1 };   // halbe Maße des Eisenkerns (die Windungen liegen um ihn herum)
const HOEHE = { schleife: LOOP.WIRE_R, spule: PAKET + WIRE, eisen: KERN.Y };   // halbe Höhe (quer zur Spulenebene)

// Ablage links neben dem Nordpol: je Bauteil ein Platz, verkleinert, auf Böcken der Höhe BOCK
// Plätze in Weltkoordinaten (x, z): links neben dem Nordpol; umgerechnet in die Koordinaten des Aufbaus (dort liegen
// die Bauteile, damit Ein- und Ausbau in denselben Koordinaten laufen wie die Welle)
const PLATZ = { schleife: [-23, -18], spule: [-25, -2], eisen: [-23, 14] };
const imAufbau = (x, y, z) => aufbau.worldToLocal(new THREE.Vector3(x, y, z));
const ABLAGE_MASS = 0.6, BOCK = 1.2;
const ablageLage = art => imAufbau(PLATZ[art][0], TABLE_TOP + BOCK + HOEHE[art] * ABLAGE_MASS, PLATZ[art][1]);
const ZIEHEN_Y = 14;                         // so weit wird das Bauteil nach oben aus dem Spalt des Magneten gezogen
const umEins = a => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));   // Winkel auf −π … π

// ---------------- Bauteile bauen

const kupfer = new THREE.MeshStandardMaterial({ color: 0xc8733a, metalness: 0.85, roughness: 0.35 });
const kupferDunkel = new THREE.MeshStandardMaterial({ color: 0xa65a26, metalness: 0.8, roughness: 0.4 });
const eisenMat = new THREE.MeshStandardMaterial({ color: 0xdde3ea, metalness: 0.15, roughness: 0.45 });

// Windungen um den Kern (wie coil() in gleichstrommotor/js/bauteile.js, hier mit der Spulenachse quer zur Spulenebene):
// je Lage ein abgerundetes Rechteck in der x-z-Ebene, wiederholt im Abstand PITCH – oben und unten je ein Paket
function windungen(parent) {
  const gruppe = new THREE.Group();
  parent.add(gruppe);
  for (let lage = 0; lage < LAGEN; lage++) {
    const o = 0.2 + WIRE + lage * PITCH;              // Abstand der Windung vom Kern
    const r = 0.25 + lage * PITCH;                    // Eckenrundung
    const a = KERN.X + o - r, b = KERN.Z + o - r;
    const punkte = [];
    for (let k = 0; k < 4; k++) {
      const cx = k === 0 || k === 3 ? a : -a, cz = k < 2 ? b : -b;
      for (let j = 0; j <= 6; j++) {
        const t = (k * Math.PI) / 2 + (j / 6) * (Math.PI / 2);
        punkte.push(new THREE.Vector3(cx + r * Math.cos(t), 0, cz + r * Math.sin(t)));
      }
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(punkte, true, 'centripetal'), 64, WIRE, 8, true);
    for (const seite of [1, -1]) {
      for (let y = LUECKE + WIRE; y <= PAKET - WIRE + 1e-6; y += PITCH) {
        addMesh(geo, lage % 2 ? kupferDunkel : kupfer, gruppe).position.y = seite * y;
      }
    }
  }
  return gruppe;
}
const AUSSEN = { X: KERN.X + 0.2 + WIRE + (LAGEN - 1) * PITCH, Z: KERN.Z + 0.2 + WIRE + (LAGEN - 1) * PITCH };

function rohr(punkte, radius, material, parent) {
  const path = new THREE.CurvePath();
  for (let i = 1; i < punkte.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(...punkte[i - 1]), new THREE.Vector3(...punkte[i])));
  return addMesh(new THREE.TubeGeometry(path, 20 * punkte.length, radius, 10, false), material, parent);
}

// Zuleitungen von der Spule (Seite A → Ring 1, B → Ring 2) zur Welle und auf der Hülse an die Ringe;
// nur eingebaut sichtbar
function zuleitungen(parent) {
  const gruppe = new THREE.Group();
  parent.add(gruppe);
  for (const [sign, ring] of [[1, 0], [-1, 1]]) {
    const r = RINGS.LEAD_R, xEnd = RINGS.X[ring] - RINGS.WIDTH / 2;
    rohr([[AUSSEN.X - 0.5, sign * LUECKE, sign * AUSSEN.Z], [AUSSEN.X + 0.6, 0, sign * r], [xEnd, 0, sign * r]], LOOP.WIRE_R * 0.6, mat.copper, gruppe);
    addMesh(new THREE.SphereGeometry(0.28, 14, 10), mat.brass, gruppe).position.set(xEnd, 0, sign * r);
  }
  return gruppe;
}

// Bauteil (Koordinaten wie die Leiterschleife: Spulenebene x-z, Mitte auf der Welle)
const teile = {};
for (const art of BAUTEILE) {
  const gruppe = new THREE.Group();
  aufbau.add(gruppe);
  if (art === 'schleife') {
    rohr([[L2, 0, R], [-L2, 0, R], [-L2, 0, -R], [L2, 0, -R]], LOOP.WIRE_R, mat.copper, gruppe);
  } else {
    windungen(gruppe);
    if (art === 'eisen') addMesh(new THREE.BoxGeometry(2 * KERN.X, 2 * KERN.Y, 2 * KERN.Z), eisenMat, gruppe);
  }
  teile[art] = { gruppe, leitungen: art === 'schleife' ? null : zuleitungen(gruppe) };
}

// Ablage: zwei Böcke je Platz und ein Schild flach auf dem Tisch
function schild(text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = 'bold 44px system-ui, sans-serif';
  ctx.font = font;
  canvas.width = Math.ceil(ctx.measureText(text).width) + 24;
  canvas.height = 64;
  ctx.font = font;
  ctx.fillStyle = '#1d2733';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, 34);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const hoehe = 1.3;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(hoehe * canvas.width / 64, hoehe),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true }));
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}
const ablage = new THREE.Group();
aufbau.add(ablage);
for (const art of BAUTEILE) {
  const [x, z] = PLATZ[art];
  const mitte = imAufbau(x, TABLE_TOP + BOCK / 2, z);
  for (const dx of [-1, 1]) {
    const bock = addMesh(new THREE.BoxGeometry(0.8, BOCK, 2 * R * ABLAGE_MASS + 1), mat.stand, ablage);
    bock.position.copy(mitte).add(new THREE.Vector3(dx * (L2 - 1.2) * ABLAGE_MASS, 0, 0));
  }
  // Schild vor dem Bauteil, von vorne lesbar (gegen die Drehung des Aufbaus zurückgedreht)
  const name = schild(NAMEN[art]);
  name.position.copy(imAufbau(x, TABLE_TOP + 0.02, z + L2 * ABLAGE_MASS + 1.6));
  name.rotation.set(-Math.PI / 2, 0, -DREHUNG);
  ablage.add(name);
}

// ---------------- Lage der Bauteile: eingebaut (auf der Welle, dreht mit) oder in der Ablage

function eingebaut(art) {
  const g = teile[art].gruppe;
  g.position.set(0, 0, 0);
  g.rotation.set(umEins(rotor.phi + LIEGEND), 0, 0);
  g.scale.setScalar(1);
}
function abgelegt(art) {
  const g = teile[art].gruppe;
  g.position.copy(ablageLage(art));
  g.rotation.set(0, 0, 0);
  g.scale.setScalar(ABLAGE_MASS);
}

// ---------------- Ablaufsteuerung (wie teile.js im Gleichstrommotor): Schritte nacheinander, je mit Dauer und Verlauf

const schritte = [];
let laufend = null, vergangen = 0;
const sanft = t => t * t * (3 - 2 * t);
// Schritt anhängen: anfang() einmal zu Beginn, verlauf(t) mit t = 0 … 1, ende() zum Schluss
const schritt = (dauer, { anfang, verlauf, ende } = {}) => schritte.push({ dauer, anfang, verlauf, ende });
export const tauschLaeuft = () => laufend !== null || schritte.length > 0;
// umbau.unterwegs: Bauteil, das gerade bewegt wird (seine Lage bestimmt die Animation, nicht der Zustand)

// Bauteil von seiner Lage zu ziel() bewegen (Position, Drehung um die Welle, Größe), bogen: Höhe des Bogens nach oben
function bewegen(art, ziel, dauer, bogen = 0) {
  const g = teile[art].gruppe;
  let von, nach;
  schritt(dauer, {
    anfang: () => {
      umbau.unterwegs = art;
      von = { p: g.position.clone(), r: g.rotation.x, s: g.scale.x };
      nach = ziel();
    },
    verlauf: t => {
      const e = sanft(t);
      g.position.lerpVectors(von.p, nach.p, e);
      g.position.y += bogen * Math.sin(Math.PI * e);
      g.rotation.x = von.r + (nach.r - von.r) * e;
      g.scale.setScalar(von.s + (nach.s - von.s) * e);
    },
  });
}

function buerstenBewegen(runter) {
  schritt(0.45, { verlauf: t => { buersten.unten = runter ? sanft(t) : 1 - sanft(t); } });
}

let nachTausch = () => {};
export const aufTausch = rueckruf => { nachTausch = rueckruf; };

// Bauteil einbauen (das bisherige kommt in die Ablage). Die Welle steht während des Tauschs (umbau.aktiv), das neue
// Bauteil kommt in ihrer Stellung an.
export function bauteilEinbauen(art) {
  if (tauschLaeuft() || art === state.bauteil || state.explain || !BAUTEILE.includes(art)) return false;
  const alt = state.bauteil;
  schritt(0, {
    anfang: () => {
      umbau.aktiv = true;                        // Welle steht, Stromkreis offen
      state.coil = false;                        // die Spule mit 5 Windungen gehört zur Leiterschleife
      spule.fortschritt = 0;
      eingebaut(alt);
      umbau.unterwegs = alt;
      nachTausch();
    },
  });
  buerstenBewegen(true);
  bewegen(alt, () => ({ p: new THREE.Vector3(0, ZIEHEN_Y, 0), r: 0, s: 1 }), 0.9);
  bewegen(alt, () => ({ p: ablageLage(alt), r: 0, s: ABLAGE_MASS }), 1.3, 8);
  // abgelegt: bis das neue Bauteil sitzt, ist nichts eingebaut – sonst gälte das alte wieder als eingebaut und
  // erschiene im Magneten, sobald das neue unterwegs ist
  schritt(0, { ende: () => { state.bauteil = null; } });
  bewegen(art, () => ({ p: new THREE.Vector3(0, ZIEHEN_Y, 0), r: 0, s: 1 }), 1.3, 8);
  bewegen(art, () => ({ p: new THREE.Vector3(0, 0, 0), r: umEins(rotor.phi + LIEGEND), s: 1 }), 0.9);
  schritt(0, { ende: () => { state.bauteil = art; umbau.unterwegs = null; nachTausch(); } });
  buerstenBewegen(false);
  schritt(0, { ende: () => { umbau.aktiv = false; nachTausch(); } });
  return true;
}

// ---------------- Jedes Bild: Ablauf weiterführen, sonst alle Bauteile nach dem Zustand legen
// (so übernimmt auch ein zuschauendes Gerät bei der Live-Steuerung einen Tausch, nur ohne Animation)

export function syncBauteile(dt) {
  if (!laufend && schritte.length) {
    laufend = schritte.shift();
    vergangen = 0;
    laufend.anfang?.();
  }
  if (laufend) {
    vergangen += dt;
    const t = laufend.dauer > 0 ? Math.min(1, vergangen / laufend.dauer) : 1;
    laufend.verlauf?.(t);
    if (t >= 1) {
      const fertig = laufend;
      laufend = null;          // vor ende(): danach gilt der Schritt als erledigt (tauschLaeuft)
      fertig.ende?.();
      if (schritte.length) syncBauteile(0);   // nächsten Schritt sofort beginnen
    }
  }
  const modellSichtbar = !state.explain;
  ablage.visible = modellSichtbar && state.bauteileZeigen;   // Ablage erst per Knopf (bedienfeld.js)
  for (const art of BAUTEILE) {
    const { gruppe, leitungen } = teile[art];
    const drin = art === state.bauteil && umbau.unterwegs !== art;
    if (art !== umbau.unterwegs) (drin ? eingebaut : abgelegt)(art);
    // eingebaute Leiterschleife: die aus modell.js (mit Zuleitungen und 5 Windungen), nicht die Kopie
    // in der Ablage nur, wenn sie gezeigt wird (oder gerade unterwegs)
    gruppe.visible = modellSichtbar && (drin ? art !== 'schleife' : state.bauteileZeigen || umbau.unterwegs === art);
    if (leitungen) leitungen.visible = drin;
  }
}
