// ------------------------------------------------------------------
// Feldlinien des Stabmagneten in der Ebene durch die Achse (z = 0). Sie hängen am Magneten und werden einmal
// berechnet: Außen folgen sie dem Feld der beiden Stirnflächen (gleichmäßig „geladene“ Polflächen, aus vielen
// Punkten zusammengesetzt), innen laufen sie gerade vom Süd- zum Nordpol – jede Linie ist geschlossen. Linien nahe
// der Achse reichen weit hinaus (und gehen auch durch eine weit entfernte Spule), Linien vom Rand bleiben nah.
// Die Abschnitte im Inneren der Spule (innerhalb der Wicklung) werden in jedem Bild violett hervorgehoben:
// So sieht man, wie viele Feldlinien durch die Spule gehen und wie sich das beim Bewegen ändert.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { MAGNET, POLE_R, COIL } from './config.js';
import { state } from './state.js';
import { bodies } from './physik.js';
import { magnetGroup } from './modell.js';
import { renderer } from './szene.js';

const FARBE = new THREE.Color('#5c8fd6');        // Feldlinie außerhalb der Spule
const INNEN = new THREE.Color('#aa00ff');        // ... im Inneren der Spule (violett: hebt sich vom Kupfer ab)
const HALF = MAGNET.LENGTH / 2;
// Startpunkte auf der Nordpolfläche (Anteil der halben Magnetbreite, je oben und unten). Ausgewählt nach der
// Reichweite der Linien: von 0,95 (bleibt etwa 15 cm von der Achse) bis 0,12 (verlässt die Szene)
const STARTS = [0.12, 0.3, 0.5, 0.65, 0.8, 0.95];
const STEP = 0.15, GRENZE = 60;                  // Schrittweite und größter Abstand von der Mitte in cm

// Polflächen als Punktladungen: Mittelpunkt und Ringe gleicher Breite, Ladung je Punkt nach Fläche des Rings
const LADUNGEN = (() => {
  const RINGE = 7;
  const punkte = [[0, 0, 1 / RINGE ** 2]];
  for (let k = 1; k < RINGE; k++) {
    const r = (k + 0.5) / RINGE * POLE_R, n = 6 * k, q = ((k + 1) ** 2 - k ** 2) / RINGE ** 2 / n;
    for (let i = 0; i < n; i++) {
      const a = 2 * Math.PI * (i + 0.5 * (k % 2)) / n;
      punkte.push([r * Math.cos(a), r * Math.sin(a), q]);
    }
  }
  return punkte.flatMap(([y, z, q]) => [[HALF, y, z, q], [-HALF, y, z, -q]]);
})();

// Richtung des Feldes außerhalb des Magneten (Ebene z = 0)
function feld(x, y) {
  let fx = 0, fy = 0;
  for (const [qx, qy, qz, q] of LADUNGEN) {
    const dx = x - qx, dy = y - qy, r2 = dx * dx + dy * dy + qz * qz, f = q / (r2 * Math.sqrt(r2));
    fx += f * dx;
    fy += f * dy;
  }
  const l = Math.hypot(fx, fy) || 1;
  return [fx / l, fy / l];
}

// Vom Nordpol aus bis zur Mittelebene x = 0 (oder zum Rand); der Rückweg zum Südpol ist das Spiegelbild
function halbeLinie(y0) {
  const punkte = [[HALF, y0]];
  let x = HALF + 0.05, y = y0;
  for (let i = 0; i < 4000; i++) {
    const [ax, ay] = feld(x, y);
    const [bx, by] = feld(x + ax * STEP / 2, y + ay * STEP / 2);   // Mittelpunktverfahren
    const nx = x + bx * STEP, ny = y + by * STEP;
    if (nx <= 0) {   // Mittelebene erreicht: genau auf x = 0 enden
      punkte.push([0, y + (ny - y) * x / (x - nx)]);
      return { punkte, geschlossen: true };
    }
    x = nx;
    y = ny;
    punkte.push([x, y]);
    if (Math.hypot(x, y) > GRENZE) return { punkte, geschlossen: false };
  }
  return { punkte, geschlossen: false };
}

// Ganze Linien als Punktfolgen [x, y] im Magneten (Nordpol bei +x)
function linien() {
  const ergebnis = [];
  for (const anteil of STARTS) {
    for (const vorzeichen of [1, -1]) {
      const y0 = vorzeichen * anteil * MAGNET.WIDTH / 2;
      const { punkte, geschlossen } = halbeLinie(y0);
      const innen = [];   // im Magneten vom Süd- zum Nordpol
      for (let x = -HALF; x < HALF; x += STEP) innen.push([x, y0]);
      const zurueck = punkte.map(([x, y]) => [-x, y]).reverse();   // vom Rand bzw. der Mittelebene zum Südpol
      if (geschlossen) ergebnis.push([...innen, ...punkte, ...zurueck.slice(1)]);
      else ergebnis.push([...zurueck, ...innen, ...punkte]);   // offen: kommt von außen zum Südpol und geht wieder hinaus
    }
  }
  return ergebnis;
}

// ---------------- Darstellung

export const feldGroup = new THREE.Group();
magnetGroup.add(feldGroup);
// undurchsichtig: wird vor der (dann durchsichtigen) Wicklung gezeichnet und scheint durch sie hindurch
const material = new LineMaterial({ linewidth: 2.6, vertexColors: true });
const pfeilNormal = new THREE.MeshBasicMaterial({ color: FARBE });
const pfeilInnen = new THREE.MeshBasicMaterial({ color: INNEN });
const PFEIL = new THREE.ConeGeometry(0.42, 1.1, 12);

const eintraege = linien().map(punkte => {
  const geometry = new LineGeometry();
  geometry.setPositions(punkte.flatMap(([x, y]) => [x, y, 0]));
  geometry.setColors(punkte.flatMap(() => FARBE.toArray()));
  const line = new Line2(geometry, material);
  line.computeLineDistances();
  feldGroup.add(line);
  // Pfeilspitzen in Feldrichtung, außen auf etwa einem und zwei Dritteln der Linie
  const pfeile = [0.35, 0.72].map(anteil => {
    const i = Math.min(punkte.length - 2, Math.round(anteil * (punkte.length - 1)));
    const [x0, y0] = punkte[i], [x1, y1] = punkte[i + 1];
    const cone = new THREE.Mesh(PFEIL, pfeilNormal);
    cone.position.set(x0, y0, 0);
    cone.rotation.z = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2;
    feldGroup.add(cone);
    return cone;
  });
  return { punkte, geometry, pfeile };
});

// Liegt der Punkt (Koordinaten im Magneten) gerade im Inneren der Spule?
function imInneren(x, y) {
  const welt = bodies.magnet.x + (state.northRight ? x : -x);
  return Math.abs(welt - bodies.coil.x) < COIL.LENGTH / 2 && Math.abs(y) < COIL.R_WIND;
}

let stand = null;   // Lagen, für die die Farben gerade stimmen
function einfaerben() {
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
  const neu = `${bodies.magnet.x.toFixed(3)} ${bodies.coil.x.toFixed(3)} ${state.northRight}`;
  if (neu === stand) return;
  stand = neu;
  einfaerben();
}
