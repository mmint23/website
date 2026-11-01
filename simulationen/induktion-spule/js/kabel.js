// ------------------------------------------------------------------
// Kabel mit Bananensteckern: rot vom Anschluss A der Spule, schwarz von E. Zu Beginn hängen die Stecker lose unter
// der Spule; man zieht sie mit Maus oder Finger an eine Buchse des aufgestellten Messgeräts (messgeraet.js).
// Kommt der Stecker auf dem Bildschirm nah genug an eine freie Buchse, rastet er dort ein; lässt man ihn woanders
// los, bleibt er dort hängen (in Koordinaten der Spule – er wandert mit, wenn man die Spule bewegt).
// Welche Buchse belegt ist, steht in state.plugs; daraus bestimmt physik.js, was das Messgerät anzeigt.
// Stecken beide Stecker im Messgerät, laufen die Kabel ab einem Bündelpunkt hinten auf der Drehachse der Spule
// nebeneinander zum Messgerät. Dreht man die Spule, verdrillen sie sich: je Umdrehung der Spule eine Windung der
// Kabel umeinander – gezählt ab dem Einstecken (drall.null). Lerneffekt: Eine Spule mit festen Kabeln lässt sich
// nicht immer weiter drehen (deshalb Schleifringe beim Generator).
// ------------------------------------------------------------------
import * as THREE from 'three';
import { COIL } from './config.js';
import { state } from './state.js';
import { multimeterRefresh, bodies } from './physik.js';
import { addMesh } from './hilfen.js';
import { mat } from './materialien.js';
import { scene, camera } from './szene.js';
import { coilGroup, terminalLocal } from './modell.js';
import { sockets } from './messgeraet.js';

const PIN = 0.9, KOERPER = 2.2, FANG = 30;   // Stiftlänge, Länge des Griffs in cm; Fangbereich der Buchsen in Pixeln
const halfL = COIL.LENGTH / 2;

// Ruhelage der losen Stecker unter der Spule (Koordinaten der Spule)
const RUHE = {
  red: new THREE.Vector3(halfL + 2.4, -5, 3.5),
  black: new THREE.Vector3(-halfL - 2.4, -5, 3.5),
};

// ---------------- Stecker: Gruppe mit Ursprung an der Stiftspitze, Stift entlang −z, Griff dahinter (+z)

function makePlug(material) {
  const group = new THREE.Group();
  const pin = addMesh(new THREE.CylinderGeometry(0.16, 0.16, PIN, 12), mat.brass, group);
  pin.rotation.x = Math.PI / 2;
  pin.position.z = PIN / 2;
  const koerper = addMesh(new THREE.CylinderGeometry(0.5, 0.42, KOERPER, 16), material, group);
  koerper.rotation.x = Math.PI / 2;
  koerper.position.z = PIN + KOERPER / 2;
  // größere, unsichtbare Grifffläche (für den Finger)
  const ziel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, PIN + KOERPER + 1), new THREE.MeshBasicMaterial({ visible: false }));
  ziel.position.z = (PIN + KOERPER) / 2;
  group.add(ziel);
  scene.add(group);
  return { group, ziel };
}

const plugs = {
  red: { ...makePlug(mat.cableRed), lose: RUHE.red.clone(), terminal: 'a', material: mat.cableRed, cable: null },
  black: { ...makePlug(mat.cableBlack), lose: RUHE.black.clone(), terminal: 'e', material: mat.cableBlack, cable: null },
};
export const plugTargets = Object.entries(plugs).map(([farbe, p]) => ({ farbe, ziel: p.ziel }));

const welt = lokal => {
  coilGroup.updateMatrixWorld();
  return coilGroup.localToWorld(lokal.clone());
};
const UNTEN = new THREE.Vector3(0, 1, 0);   // lose: Stift zeigt nach unten (Griff nach oben)

// Lage und Richtung (aus der Buchse heraus bzw. nach oben) des Steckers jetzt
let gezogen = null;   // { farbe, ebene, buchse } während des Ziehens
function lage(farbe) {
  const p = plugs[farbe];
  const name = gezogen?.farbe === farbe ? gezogen.buchse : state.plugs[farbe];
  const buchse = name && sockets().find(s => s.name === name);
  if (buchse) return { spitze: buchse.position.clone().addScaledVector(buchse.heraus, -PIN), heraus: buchse.heraus };
  return { spitze: gezogen?.farbe === farbe ? gezogen.punkt.clone() : welt(p.lose), heraus: UNTEN };
}

// ---------------- Kabel: vom Anschluss nach oben, durchhängend zum Ende des Griffs

function cablePoints(terminal, ende, heraus) {
  const t = terminal;
  const raus = ende.clone().addScaledVector(heraus, 2.5);
  const oben = t.clone().add(new THREE.Vector3(0, 1.8, 0));
  const mitte = t.clone().lerp(raus, 0.5);
  mitte.y = Math.min(t.y, raus.y) - 2;
  return [t, oben, mitte, raus, ende];
}

// ---------------- Verdrillte Kabel (beide Stecker im Messgerät)

// Die Kabel verlassen die Spule hinten auf ihrer Drehachse (Bündelpunkt) und laufen als Paar hinter der Spule in
// einem Bogen zum Messgerät (das hinter der Spule steht). Dreht man die Spule um ihre Achse, dreht sich das Bündel an diesem Ende mit – so verdrillen sich
// die Kabel umeinander (je Umdrehung eine Windung), am Messgerät bleiben sie fest.
const ABSTAND = 0.3;     // halber Abstand der Kabelmitten im Bündel (Kabel liegen aneinander, Radius 0,25)
const PUNKTE = 200;      // Stützpunkte entlang des Bündels
const drall = { null: 0, gesteckt: false };   // Spulenwinkel beim Einstecken; stecken beide?

// Verdrillung (rad): wie weit die Spule seit dem Einstecken gedreht wurde
const verdrillung = () => bodies.coil.angle - drall.null;
// Wird die Anzeige der Spule auf eine Umdrehung zurückgesetzt (bedienfeld.js), bleibt die Verdrillung
export function drallVerschieben(winkel) { drall.null -= winkel; }

function buendelPunkte(teile) {
  coilGroup.updateMatrixWorld();
  const hinten = new THREE.Vector3(0, 0, -1);
  const start = coilGroup.position.clone().addScaledVector(hinten, COIL.R_FLANGE + 1.5);
  const enden = ['red', 'black'].map(f => teile[f].ende.clone().addScaledVector(teile[f].heraus, 3));
  const ziel = enden[0].clone().add(enden[1]).multiplyScalar(0.5).add(new THREE.Vector3(0, 0, 1.5));
  const mitte = start.clone().lerp(ziel, 0.5);
  mitte.y = Math.min(start.y, ziel.y) - 7;   // tiefer und seitlich neben der Spule: das Bündel ist gut zu sehen
  mitte.x -= 4;
  const linie = new THREE.CatmullRomCurve3([start, start.clone().addScaledVector(hinten, 2.5), mitte, ziel], false, 'centripetal');
  // mitgeführter Rahmen (ohne Sprünge): am Anfang b = +x, n = +y (das Bündel beginnt entlang der Drehachse, nach hinten)
  let t = linie.getTangent(0);
  const n = new THREE.Vector3(0, 1, 0).addScaledVector(t, -t.y).normalize();
  const b = new THREE.Vector3().crossVectors(t, n);
  const winkel = verdrillung(), drehung = new THREE.Quaternion();
  const kabel = { red: [], black: [] };
  for (let i = 0; i <= PUNKTE; i++) {
    const s = i / PUNKTE, p = linie.getPoint(s), tNeu = linie.getTangent(s);
    drehung.setFromUnitVectors(t, tNeu);
    n.applyQuaternion(drehung);
    b.applyQuaternion(drehung);
    t = tNeu;
    // an der Spule um den Spulenwinkel gedreht (rot dann auf der Seite von A), am Messgerät nicht
    const phi = winkel * (1 - s);
    const quer = b.clone().multiplyScalar(Math.cos(phi)).addScaledVector(n, Math.sin(phi)).multiplyScalar(ABSTAND);
    kabel.red.push(p.clone().add(quer));
    kabel.black.push(p.clone().sub(quer));
  }
  return kabel;
}

let verlegt = null;
export function syncCables() {
  const teile = {};
  for (const farbe of Object.keys(plugs)) {
    const { spitze, heraus } = lage(farbe);
    const ende = spitze.clone().addScaledVector(heraus, PIN + KOERPER);
    teile[farbe] = { spitze, heraus, ende, terminal: welt(terminalLocal[plugs[farbe].terminal]) };
  }
  // Beide im Messgerät? Beim Einstecken des zweiten Steckers beginnt die Verdrillung bei null
  const gesteckt = Boolean(state.plugs.red && state.plugs.black && gezogen === null);
  if (gesteckt && !drall.gesteckt) drall.null = bodies.coil.angle;
  drall.gesteckt = gesteckt;
  const schluessel = JSON.stringify([gesteckt, verdrillung().toFixed(4),
    ...Object.values(teile).map(t => [t.spitze, t.heraus, t.terminal].map(v => v.toArray().map(z => z.toFixed(3))))]);
  if (schluessel === verlegt) return;
  verlegt = schluessel;
  const buendel = gesteckt ? buendelPunkte(teile) : null;
  for (const [farbe, { spitze, heraus, ende, terminal }] of Object.entries(teile)) {
    const p = plugs[farbe];
    p.group.position.copy(spitze);
    p.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), heraus);
    if (p.cable) {
      p.cable.geometry.dispose();
      scene.remove(p.cable);
    }
    // gesteckt: vom Anschluss kurz nach oben, ins Bündel, verdrillt zum Messgerät, aus dem Bündel in den Stecker
    const punkte = buendel
      ? [terminal, welt(terminalLocal[p.terminal].clone().add(new THREE.Vector3(0, 0.8, -1.5))), ...buendel[farbe],
        ende.clone().addScaledVector(heraus, 1.5), ende]
      : cablePoints(terminal, ende, heraus);
    const curve = new THREE.CatmullRomCurve3(punkte, false, 'centripetal');
    p.cable = addMesh(new THREE.TubeGeometry(curve, buendel ? 600 : 120, 0.25, 10, false), p.material, scene);
  }
}

// Messgerät gewechselt oder zurückgesetzt: Stecker heraus, zurück in die Ruhelage
export function ausstecken() {
  for (const [farbe, p] of Object.entries(plugs)) {
    state.plugs[farbe] = null;
    p.lose.copy(RUHE[farbe]);
  }
  multimeterRefresh();
}

// ---------------- Live-Steuerung: lose Stecker (Koordinaten der Spule) und ein gerade gezogener Stecker

export const kabelDaten = () => ({
  drall: drall.null,
  lose: Object.fromEntries(Object.entries(plugs).map(([farbe, p]) => [farbe, p.lose.toArray()])),
  gezogen: gezogen && { farbe: gezogen.farbe, buchse: gezogen.buchse, punkt: gezogen.punkt.toArray() },
});
export function kabelUebernehmen(daten) {
  if (Number.isFinite(daten?.drall)) drall.null = daten.drall;
  for (const [farbe, p] of Object.entries(plugs)) if (daten?.lose?.[farbe]) p.lose.fromArray(daten.lose[farbe]);
  gezogen = daten?.gezogen ? { ...daten.gezogen, punkt: new THREE.Vector3().fromArray(daten.gezogen.punkt) } : null;
}
export const steckerAbbrechen = () => { gezogen = null; };

// ---------------- Ziehen (von ziehen.js aufgerufen; raycaster ist schon auf den Finger gerichtet)

const ebene = new THREE.Plane(), treffer = new THREE.Vector3(), blick = new THREE.Vector3();

export function steckerUnter(raycaster) {
  const hit = raycaster.intersectObjects(plugTargets.map(t => t.ziel), false)[0];
  return hit ? plugTargets.find(t => t.ziel === hit.object).farbe : null;
}

export function steckerGreifen(farbe) {
  const { spitze } = lage(farbe);
  camera.getWorldDirection(blick);
  ebene.setFromNormalAndCoplanarPoint(blick, spitze);   // gezogen wird auf einer Ebene quer zur Blickrichtung
  gezogen = { farbe, buchse: null, punkt: spitze.clone() };
  if (state.plugs[farbe]) {   // herausziehen
    state.plugs[farbe] = null;
    multimeterRefresh();
  }
}

// Freie Buchse nahe am Finger (Bildschirmabstand), sonst null
function buchseAmFinger(clientX, clientY, rect) {
  const andere = Object.keys(plugs).filter(f => f !== gezogen.farbe).map(f => state.plugs[f]);
  let beste = null, abstand = FANG;
  for (const s of sockets()) {
    if (andere.includes(s.name)) continue;
    const v = s.position.clone().project(camera);
    const d = Math.hypot(rect.left + (v.x + 1) / 2 * rect.width - clientX, rect.top + (1 - v.y) / 2 * rect.height - clientY);
    if (d < abstand) {
      abstand = d;
      beste = s.name;
    }
  }
  return beste;
}

export function steckerZiehen(raycaster, clientX, clientY, rect) {
  if (!gezogen) return;
  if (raycaster.ray.intersectPlane(ebene, treffer)) gezogen.punkt.copy(treffer);
  gezogen.buchse = buchseAmFinger(clientX, clientY, rect);
}

export function steckerLoslassen() {
  if (!gezogen) return;
  const { farbe, buchse, punkt } = gezogen;
  if (buchse) state.plugs[farbe] = buchse;
  else {
    coilGroup.updateMatrixWorld();
    plugs[farbe].lose.copy(coilGroup.worldToLocal(punkt.clone()));
  }
  gezogen = null;
  multimeterRefresh();
}
