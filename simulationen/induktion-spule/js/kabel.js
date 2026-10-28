// ------------------------------------------------------------------
// Kabel mit Bananensteckern: rot vom Anschluss A der Spule, schwarz von E. Zu Beginn hängen die Stecker lose unter
// der Spule; man zieht sie mit Maus oder Finger an eine Buchse des aufgestellten Messgeräts (messgeraet.js).
// Kommt der Stecker auf dem Bildschirm nah genug an eine freie Buchse, rastet er dort ein; lässt man ihn woanders
// los, bleibt er dort hängen (in Koordinaten der Spule – er wandert mit, wenn man die Spule bewegt).
// Welche Buchse belegt ist, steht in state.plugs; daraus bestimmt physik.js, was das Messgerät anzeigt.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { COIL } from './config.js';
import { state } from './state.js';
import { multimeterRefresh } from './physik.js';
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

let verlegt = null;
export function syncCables() {
  const teile = {};
  for (const farbe of Object.keys(plugs)) {
    const { spitze, heraus } = lage(farbe);
    const ende = spitze.clone().addScaledVector(heraus, PIN + KOERPER);
    teile[farbe] = { spitze, heraus, ende, terminal: welt(terminalLocal[plugs[farbe].terminal]) };
  }
  const schluessel = JSON.stringify(Object.values(teile).map(t => [t.spitze, t.heraus, t.terminal].map(v => v.toArray().map(z => z.toFixed(3)))));
  if (schluessel === verlegt) return;
  verlegt = schluessel;
  for (const [farbe, { spitze, heraus, ende, terminal }] of Object.entries(teile)) {
    const p = plugs[farbe];
    p.group.position.copy(spitze);
    p.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), heraus);
    if (p.cable) {
      p.cable.geometry.dispose();
      scene.remove(p.cable);
    }
    const curve = new THREE.CatmullRomCurve3(cablePoints(terminal, ende, heraus), false, 'centripetal');
    p.cable = addMesh(new THREE.TubeGeometry(curve, 120, 0.25, 10, false), p.material, scene);
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
  lose: Object.fromEntries(Object.entries(plugs).map(([farbe, p]) => [farbe, p.lose.toArray()])),
  gezogen: gezogen && { farbe: gezogen.farbe, buchse: gezogen.buchse, punkt: gezogen.punkt.toArray() },
});
export function kabelUebernehmen(daten) {
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
