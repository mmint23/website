// ------------------------------------------------------------------
// Feldlinien des Magneten (Polrad) als Punktfolgen (ohne three.js, damit Physik und Tests sie auch nutzen können)
// und das „Feldlinienmodell“ der Induktion.
//
// Linien: in der Ebene durch den Magneten senkrecht zur Welle (z = 0), Koordinaten im Magneten (Nordpol bei +y).
// Außen folgen sie dem Feld der beiden Polflächen (gleichmäßig „geladene“ Flächen, aus Punkten zusammengesetzt),
// innen laufen sie gerade vom Süd- zum Nordpol – jede Linie ist in Feldrichtung durchlaufen. Die Linien drehen
// sich starr mit dem Magneten. Vereinfachung: Eisenkerne und Joch lenken die Linien hier nicht um.
//
// Feldlinienmodell: Wie viel der gezeigten Feldlinien liegt gerade im Inneren einer Spule (innerhalb der
// Wicklung)? Gezählt wird die Länge der Linienstücke in Richtung der Spulenachse (nach außen positiv, nach innen
// negativ), geteilt durch die Länge der Wicklung – das ist im Mittel die Zahl der Feldlinien durch die Spule. Sie
// ändert sich, wenn Linien hinein- oder hinauslaufen oder ihr Verlauf in der Spule sich verschiebt. Die Stücke
// werden genau an den Rändern der Wicklung abgeschnitten, so ändert sich das Maß stetig.
// ------------------------------------------------------------------
import { MAGNET, COIL, FIELD_LINES } from './config.js';

const HALF = MAGNET.LENGTH / 2;
const POLE = MAGNET.WIDTH / 2;
const STEP = 0.15, GRENZE = 45;   // Schrittweite und größter Abstand von der Mitte in cm

// Polflächen (Quadrate) als Punktladungen; Nordpol bei y = +HALF
const LADUNGEN = (() => {
  const N = 7, punkte = [];
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < N; k++) {
      const x = ((i + 0.5) / N * 2 - 1) * POLE, z = ((k + 0.5) / N * 2 - 1) * POLE;
      punkte.push([x, HALF, z, 1 / N ** 2], [x, -HALF, z, -1 / N ** 2]);
    }
  }
  return punkte;
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

// Vom Nordpol aus bis zur Mittelebene y = 0 (oder zum Rand); der Rückweg zum Südpol ist das Spiegelbild
function halbeLinie(x0) {
  const punkte = [[x0, HALF]];
  let x = x0, y = HALF + 0.05;
  for (let i = 0; i < 4000; i++) {
    const [ax, ay] = feld(x, y);
    const [bx, by] = feld(x + ax * STEP / 2, y + ay * STEP / 2);   // Mittelpunktverfahren
    const nx = x + bx * STEP, ny = y + by * STEP;
    if (ny <= 0) {   // Mittelebene erreicht: genau auf y = 0 enden
      punkte.push([x + (nx - x) * y / (y - ny), 0]);
      return { punkte, geschlossen: true };
    }
    x = nx;
    y = ny;
    punkte.push([x, y]);
    if (Math.hypot(x, y) > GRENZE) return { punkte, geschlossen: false };
  }
  return { punkte, geschlossen: false };
}

// Ganze Linien als Punktfolgen [x, y] im Magneten, in Feldrichtung (einmal berechnet)
let cache = null;
export function linien() {
  if (cache) return cache;
  cache = [];
  for (const anteil of FIELD_LINES) {
    for (const vorzeichen of [1, -1]) {
      const x0 = vorzeichen * anteil * POLE;
      const { punkte, geschlossen } = halbeLinie(x0);
      const innen = [];   // im Magneten vom Süd- zum Nordpol
      for (let y = -HALF; y < HALF; y += STEP) innen.push([x0, y]);
      const zurueck = punkte.map(([x, y]) => [x, -y]).reverse();   // von der Mittelebene bzw. vom Rand zum Südpol
      if (geschlossen) cache.push([...innen, ...punkte, ...zurueck.slice(1)]);
      else cache.push([...zurueck, ...innen, ...punkte]);   // offen: kommt von außen zum Südpol und geht wieder hinaus
    }
  }
  return cache;
}

// Länge des Stücks von (a0, q0) nach (a1, q1), das im Rechteck A0 < a < A1, |q| < Q liegt, in Richtung a (mit
// Vorzeichen). Abschneiden nach Liang–Barsky.
function innenAxial(a0, q0, a1, q1, A0, A1, Q) {
  const da = a1 - a0, dq = q1 - q0;
  let t0 = 0, t1 = 1;
  for (const [p, q] of [[-da, a0 - A0], [da, A1 - a0], [-dq, q0 + Q], [dq, Q - q0]]) {
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

// Punkt im Magneten (x, y) → Lage zur Spule: a entlang der Spulenachse (von der Welle nach außen), q quer dazu.
// alpha = φ − θ: Drehwinkel des Magneten gegenüber der Spule.
export function zurSpule(x, y, alpha) {
  const c = Math.cos(alpha), s = Math.sin(alpha);
  return [x * s + y * c, x * c - y * s];
}

// Liegt der Punkt (a, q) im Inneren der Wicklung?
export const imInneren = (a, q) => a > COIL.WIND_IN && a < COIL.WIND_OUT && Math.abs(q) < COIL.WIND_R;

// Feldlinien in der Spule (mittlere Zahl der durchsetzenden Linien, nach außen positiv), alpha = φ − θ
export function linienInSpule(alpha) {
  const A0 = COIL.WIND_IN, A1 = COIL.WIND_OUT, Q = COIL.WIND_R;
  let summe = 0;
  for (const linie of linien()) {
    let [a0, q0] = zurSpule(...linie[0], alpha);
    for (let i = 1; i < linie.length; i++) {
      const [a1, q1] = zurSpule(...linie[i], alpha);
      // nur Stücke in der Nähe der Spule genauer ansehen
      if (!(Math.max(a0, a1) < A0 || Math.min(a0, a1) > A1 || Math.max(q0, q1) < -Q || Math.min(q0, q1) > Q)) {
        summe += innenAxial(a0, q0, a1, q1, A0, A1, Q);
      }
      a0 = a1;
      q0 = q1;
    }
  }
  return summe / (A1 - A0);
}

// Tabelle über eine Umdrehung (für Physik und Diagramme in jedem Bild): Zahl der Linien und ihre Änderung je rad
const SCHRITTE = 1440;
let tabelle = null;
function tabelleAnlegen() {
  const n = Array.from({ length: SCHRITTE }, (_, i) => linienInSpule(2 * Math.PI * i / SCHRITTE));
  const h = 2 * Math.PI / SCHRITTE;
  const d = n.map((_, i) => (n[(i + 1) % SCHRITTE] - n[(i - 1 + SCHRITTE) % SCHRITTE]) / (2 * h));
  tabelle = { n, d };
}
function nachschlagen(werte, alpha) {
  const u = ((alpha / (2 * Math.PI)) % 1 + 1) % 1 * SCHRITTE;
  const i = Math.floor(u), f = u - i;
  return werte[i % SCHRITTE] * (1 - f) + werte[(i + 1) % SCHRITTE] * f;
}
// Linien in der Spule beim Winkel alpha = φ − θ, und ihre Änderung je rad
export const linienZahl = alpha => { if (!tabelle) tabelleAnlegen(); return nachschlagen(tabelle.n, alpha); };
export const linienAenderung = alpha => { if (!tabelle) tabelleAnlegen(); return nachschlagen(tabelle.d, alpha); };
