// ------------------------------------------------------------------
// Feldlinien des Stabmagneten als Punktfolgen (ohne three.js, damit Physik und Tests sie auch nutzen können)
// und das „Feldlinienmodell“ der Induktion.
//
// Linien: in der Ebene durch die Magnetachse (Koordinaten im Magneten, Nordpol bei +x). Außen folgen sie dem Feld
// der beiden Stirnflächen (gleichmäßig „geladene“ Polflächen, aus vielen Punkten zusammengesetzt), innen laufen sie
// gerade vom Süd- zum Nordpol – jede Linie ist geschlossen und in Feldrichtung durchlaufen. Linien nahe der Achse
// reichen weit hinaus, Linien vom Rand bleiben nah.
//
// Feldlinienmodell: Wie viel der gezeigten Feldlinien liegt gerade im Inneren der Spule? Gezählt wird die Länge der
// Linienstücke innerhalb der Wicklung in Richtung der Spulenachse (gegen die Achse negativ), geteilt durch die
// Länge der Spule – das ist im Mittel die Zahl der Feldlinien, die die Spule durchsetzen. Sie ändert sich, wenn
// Linien hinein- oder hinauslaufen oder ihr Verlauf in der Spule sich verschiebt, sonst nicht. Die Linienstücke
// werden genau an den Rändern der Spule abgeschnitten, so ändert sich das Maß stetig.
// ------------------------------------------------------------------
import { MAGNET, POLE_R, COIL, STRENGTHS } from './config.js';

const HALF = MAGNET.LENGTH / 2;
const STEP = 0.15, GRENZE = 60;   // Schrittweite und größter Abstand von der Mitte in cm
export const SCHLEIFE = 0.5;      // Leiterschleife: halbe Dicke der Schicht, die als „im Inneren“ zählt, in cm

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

// Ganze Linien als Punktfolgen [x, y] im Magneten, in Feldrichtung; je Stärke einmal berechnet
const cache = {};
export function linien(staerke) {
  if (cache[staerke]) return cache[staerke];
  const ergebnis = [];
  for (const anteil of STRENGTHS[staerke].lines) {
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
  return (cache[staerke] = ergebnis);
}

// Länge des Stücks von (a0, q0) nach (a1, q1), das im Rechteck |a| < A, |q| < Q liegt, in Richtung a (mit
// Vorzeichen). Abschneiden nach Liang–Barsky.
function innenAxial(a0, q0, a1, q1, A, Q) {
  const da = a1 - a0, dq = q1 - q0;
  let t0 = 0, t1 = 1;
  for (const [p, q] of [[-da, a0 + A], [da, A - a0], [-dq, q0 + Q], [dq, Q - q0]]) {
    if (p === 0) {
      if (q < 0) return 0;
    } else {
      const r = q / p;
      if (p < 0) t0 = Math.max(t0, r);
      else t1 = Math.min(t1, r);
    }
  }
  return t1 > t0 ? (t1 - t0) * da : 0;
}

// Feldlinien in der Spule (mittlere Zahl der durchsetzenden Linien, mit Vorzeichen entlang der Spulenachse).
// magnet: { x, y, angle, north }, coil: { x, y, angle, loop }, staerke: Schlüssel in STRENGTHS
export function linienInSpule(magnet, coil, staerke) {
  const ca = Math.cos(magnet.angle), sa = Math.sin(magnet.angle);
  const cc = Math.cos(coil.angle), sc = Math.sin(coil.angle);
  const A = coil.loop ? SCHLEIFE : COIL.LENGTH / 2, Q = COIL.R_WIND;
  const dx0 = magnet.x - coil.x, dy0 = (magnet.y ?? 0) - (coil.y ?? 0);
  // Punkt im Magneten → Spule: umdrehen (x → −x), drehen, verschieben, in Achsrichtung und quer dazu zerlegen
  const zuSpule = ([x, y]) => {
    const xm = magnet.north * x;
    const wx = dx0 + xm * ca - y * sa, wy = dy0 + xm * sa + y * ca;
    return [wx * cc + wy * sc, wy * cc - wx * sc];
  };
  let summe = 0;
  for (const linie of linien(staerke)) {
    let [a0, q0] = zuSpule(linie[0]);
    for (let i = 1; i < linie.length; i++) {
      const [a1, q1] = zuSpule(linie[i]);
      // nur Stücke in der Nähe der Spule genauer ansehen
      if (!(Math.max(a0, a1) < -A || Math.min(a0, a1) > A || Math.max(q0, q1) < -Q || Math.min(q0, q1) > Q)) {
        summe += innenAxial(a0, q0, a1, q1, A, Q);
      }
      a0 = a1;
      q0 = q1;
    }
  }
  return summe / (2 * A);
}
