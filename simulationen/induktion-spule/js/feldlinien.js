// ------------------------------------------------------------------
// Feldlinien des Stabmagneten in der Ebene durch die Achse (z = 0), berechnet in feldlinienModell.js. Sie hängen
// am Magneten. Die Abschnitte im Inneren der Spule (innerhalb der Wicklung) werden auf Wunsch (state.colorInside)
// in jedem Bild violett hervorgehoben: So sieht man, wie viele Feldlinien durch die Spule gehen und wie sich das
// beim Bewegen ändert. Bei der Leiterschleife sind es die kurzen Stücke, die gerade durch den Ring gehen.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { COIL, TURNS } from './config.js';
import { state } from './state.js';
import { linien, SCHLEIFE } from './feldlinienModell.js';
import { bodies } from './physik.js';
import { magnetBody, coilGroup } from './modell.js';
import { renderer } from './szene.js';

const FARBE = new THREE.Color('#5c8fd6');        // Feldlinie außerhalb der Spule
const INNEN = new THREE.Color('#aa00ff');        // ... im Inneren der Spule (violett: hebt sich vom Kupfer ab)

// ---------------- Darstellung

export const feldGroup = new THREE.Group();
magnetBody.add(feldGroup);
// undurchsichtig: wird vor der (dann durchsichtigen) Wicklung gezeichnet und scheint durch sie hindurch
const material = new LineMaterial({ linewidth: 2.6, vertexColors: true });
const pfeilNormal = new THREE.MeshBasicMaterial({ color: FARBE });
const pfeilInnen = new THREE.MeshBasicMaterial({ color: INNEN });
const PFEIL = new THREE.ConeGeometry(0.42, 1.1, 12);

// Linien je Stärke einmal berechnen und aufbauen (beim Umschalten nur die sichtbare Gruppe wechseln)
const gruppen = {};
function aufbauen(staerke) {
  const gruppe = new THREE.Group();
  feldGroup.add(gruppe);
  const eintraege = linien(staerke).map(punkte => linieAufbauen(punkte, gruppe));
  return { gruppe, eintraege };
}

function linieAufbauen(punkte, gruppe) {
  const geometry = new LineGeometry();
  geometry.setPositions(punkte.flatMap(([x, y]) => [x, y, 0]));
  geometry.setColors(punkte.flatMap(() => FARBE.toArray()));
  const line = new Line2(geometry, material);
  line.computeLineDistances();
  gruppe.add(line);
  // Pfeilspitzen in Feldrichtung, außen auf etwa einem und zwei Dritteln der Linie
  const pfeile = [0.35, 0.72].map(anteil => {
    const i = Math.min(punkte.length - 2, Math.round(anteil * (punkte.length - 1)));
    const [x0, y0] = punkte[i], [x1, y1] = punkte[i + 1];
    const cone = new THREE.Mesh(PFEIL, pfeilNormal);
    cone.position.set(x0, y0, 0);
    cone.rotation.z = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2;
    gruppe.add(cone);
    return cone;
  });
  return { punkte, geometry, pfeile };
}

// Liegt der Punkt (Koordinaten im Magneten) gerade im Inneren der Spule bzw. im Ring der Leiterschleife?
// Ohne state.colorInside zählt nichts als „innen“ – dann sind alle Linien einfarbig.
// Umrechnung Magnet → Spule
const zuSpule = new THREE.Matrix4(), p = new THREE.Vector3();
let laenge = COIL.LENGTH / 2;
function imInneren(x, y) {
  if (!state.colorInside) return false;
  p.set(x, y, 0).applyMatrix4(zuSpule);
  return Math.abs(p.x) < laenge && Math.hypot(p.y, p.z) < COIL.R_WIND;
}

let stand = null;   // Lagen, für die die Farben gerade stimmen
function einfaerben(eintraege) {
  magnetBody.updateWorldMatrix(true, false);
  coilGroup.updateWorldMatrix(true, false);
  zuSpule.copy(coilGroup.matrixWorld).invert().multiply(magnetBody.matrixWorld);
  laenge = TURNS[state.turns].loop ? SCHLEIFE : COIL.LENGTH / 2;
  for (const { punkte, geometry, pfeile } of eintraege) {
    // Farben je Abschnitt (Anfang und Ende), direkt im Puffer der Linie
    const daten = geometry.attributes.instanceColorStart.data;
    const farben = daten.array;
    let vorher = imInneren(...punkte[0]);
    for (let i = 1; i < punkte.length; i++) {
      const jetzt = imInneren(...punkte[i]);
      const farbe = vorher && jetzt ? INNEN : FARBE;
      for (let k = 0; k < 2; k++) farbe.toArray(farben, 6 * (i - 1) + 3 * k);
      vorher = jetzt;
    }
    daten.needsUpdate = true;
    for (const pfeil of pfeile) pfeil.material = imInneren(pfeil.position.x, pfeil.position.y) ? pfeilInnen : pfeilNormal;
  }
}

export function syncFeld() {
  feldGroup.visible = state.showField;
  if (!state.showField) return;
  material.resolution.set(renderer.domElement.clientWidth, renderer.domElement.clientHeight);
  gruppen[state.strength] ??= aufbauen(state.strength);
  for (const [staerke, { gruppe }] of Object.entries(gruppen)) gruppe.visible = staerke === state.strength;
  const { magnet, coil } = bodies;
  const neu = [magnet.x, magnet.y, magnet.angle, coil.x, coil.y, coil.angle].map(v => v.toFixed(4)).join(' ')
    + ` ${state.northRight} ${state.strength} ${Boolean(TURNS[state.turns].loop)} ${state.colorInside}`;
  if (neu === stand) return;
  stand = neu;
  einfaerben(gruppen[state.strength].eintraege);
}
