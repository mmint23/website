// ------------------------------------------------------------------
// Feldlinien in der Bildebene (z = 0), berechnet in feldlinienModell.js. Weil die Eisenkerne je nach Stellung des
// Magneten verschieden stark magnetisiert sind, ändern sich die Linien beim Drehen – sie werden neu berechnet,
// sobald sich der Magnet merklich gedreht hat. Die Abschnitte im Inneren einer Wicklung werden auf Wunsch
// (state.colorInside) violett hervorgehoben: So sieht man, wie viele Feldlinien durch die Spule gehen und wie sich
// das beim Drehen ändert.
// ------------------------------------------------------------------
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { state } from './state.js';
import { rotor } from './physik.js';
import { linien, imInneren } from './feldlinienModell.js';
import { renderer } from './szene.js';
import { generator } from './modell.js';

const FARBE = new THREE.Color('#5c8fd6');        // Feldlinie außerhalb der Spulen
const INNEN = new THREE.Color('#9d00ff');        // ... im Inneren einer Spule (violett: hebt sich vom Kupfer ab)

const feldGroup = new THREE.Group();
generator.add(feldGroup);   // dreht mit dem (waagrecht gelegten) Generator
// undurchsichtig: wird vor den (dann durchsichtigen) Spulen und dem Magneten gezeichnet und scheint durch sie hindurch
const material = new LineMaterial({ linewidth: 2.6, vertexColors: true });
const pfeilNormal = new THREE.MeshBasicMaterial({ color: FARBE });
const pfeilInnen = new THREE.MeshBasicMaterial({ color: INNEN });
const PFEIL = new THREE.ConeGeometry(0.42, 1.1, 12);
// Abschnitte im Inneren einer Spule zusätzlich breiter darübergezeichnet, damit sie kräftig hervortreten (immer
// sichtbar, auch durch die durchsichtige Wicklung)
const materialInnen = new LineMaterial({ linewidth: 5.5, color: INNEN, depthTest: false });
const innenLinien = [];   // wiederverwendete Line2 für die Abschnitte im Inneren
function innenLinie(i) {
  if (!innenLinien[i]) {
    innenLinien[i] = new Line2(new LineGeometry(), materialInnen);
    innenLinien[i].renderOrder = 5;
    feldGroup.add(innenLinien[i]);
  }
  return innenLinien[i];
}

const eintraege = [];   // je Linie { line, pfeile }
function eintrag(i) {
  if (!eintraege[i]) {
    const line = new Line2(new LineGeometry(), material);
    const pfeile = [0, 1].map(() => new THREE.Mesh(PFEIL, pfeilNormal));
    feldGroup.add(line, ...pfeile);
    eintraege[i] = { line, pfeile };
  }
  return eintraege[i];
}

// Liegt der Punkt im Inneren einer vorhandenen Spule? Ohne state.colorInside zählt nichts als „innen“.
const innen = (x, y) => state.colorInside && (imInneren(x, y, 0) || (state.coils === 2 && imInneren(x, y, 1)));

function aufbauen(phi) {
  const alle = linien(phi, state.coils, state.iron);
  let n = 0;   // Zahl der breiten Abschnitte im Inneren
  alle.forEach((punkte, i) => {
    const { line, pfeile } = eintrag(i);
    line.visible = true;
    // Farbe je Punkt (die Punkte liegen 2 mm auseinander, der Übergang am Rand der Wicklung ist kaum zu sehen)
    const farben = punkte.flatMap(p => (innen(...p) ? INNEN : FARBE).toArray());
    line.geometry.dispose();
    line.geometry = new LineGeometry();
    line.geometry.setPositions(punkte.flatMap(([x, y]) => [x, y, 0]));
    line.geometry.setColors(farben);
    line.computeLineDistances();
    // zusammenhängende Stücke im Inneren einer Spule breit darüber
    let stueck = [];
    const abschliessen = () => {
      if (stueck.length >= 2) {
        const breit = innenLinie(n++);
        breit.visible = true;
        breit.geometry.dispose();
        breit.geometry = new LineGeometry();
        breit.geometry.setPositions(stueck.flatMap(([x, y]) => [x, y, 0]));
      }
      stueck = [];
    };
    for (const p of punkte) {
      if (innen(...p)) stueck.push(p);
      else abschliessen();
    }
    abschliessen();
    // Pfeilspitzen in Feldrichtung auf etwa einem und zwei Dritteln der Linie
    [0.3, 0.7].forEach((anteil, k) => {
      const m = Math.min(punkte.length - 2, Math.round(anteil * (punkte.length - 1)));
      const [x0, y0] = punkte[m], [x1, y1] = punkte[m + 1];
      const cone = pfeile[k];
      cone.visible = true;
      cone.position.set(x0, y0, 0);
      cone.rotation.z = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2;
      cone.material = innen(x0, y0) ? pfeilInnen : pfeilNormal;
    });
  });
  for (let i = n; i < innenLinien.length; i++) innenLinien[i].visible = false;
  for (let i = alle.length; i < eintraege.length; i++) {
    eintraege[i].line.visible = false;
    for (const cone of eintraege[i].pfeile) cone.visible = false;
  }
}

let stand = null;   // Stellung und Einstellungen, für die die Linien gerade berechnet sind
export function syncFeld() {
  feldGroup.visible = state.showField;
  if (!state.showField) return;
  material.resolution.set(renderer.domElement.clientWidth, renderer.domElement.clientHeight);
  materialInnen.resolution.copy(material.resolution);
  const phi = rotor.phi;
  const gleich = stand && Math.abs(phi - stand.phi) < 0.004 && stand.coils === state.coils
    && stand.colorInside === state.colorInside && stand.iron === state.iron;
  if (gleich) return;
  stand = { phi, coils: state.coils, colorInside: state.colorInside, iron: state.iron };
  aufbauen(phi);
}
