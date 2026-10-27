// ------------------------------------------------------------------
// Feldlinien des Innenpolgenerators als Punktfolgen (ohne three.js, damit Physik und Tests sie auch nutzen können)
// und das „Feldlinienmodell“ der Induktion.
//
// Ebenes Modell in der Bildebene (z = 0, senkrecht zur Welle):
// - Magnet: zwei Polflächen mit gleichmäßig verteilter „Polstärke“ (Nordpol +, Südpol −), innen gleichmäßig
//   magnetisiert. Er dreht sich mit dem Drehwinkel φ.
// - Eisenkern jeder Spule: wird vom Magneten magnetisiert und wirkt dann selbst wie ein Stabmagnet entlang der
//   Spulenachse (innere Stirnfläche am Polschuh, äußere Stirnfläche am Joch). Seine Stärke folgt der Stellung des
//   Magneten, KERN · cos(φ − θ) – so bündelt der Kern die Feldlinien, wenn ein Pol auf ihn zeigt.
// Vereinfachung: Das Joch lenkt die Linien hier nicht um.
//
// Gezeichnet werden FIELD_LINES Feldlinien, die den Nordpol in gleichen Flussabständen verlassen. Weil die
// Feldlinien Höhenlinien einer Stromfunktion ψ sind, ist der Fluss zwischen zwei Punkten die Differenz von ψ.
// Feldlinienmodell: Zahl der Feldlinien durch eine Spule = Fluss durch ihren Querschnitt (Mitte der Wicklung, ganze
// Breite der Wicklung) geteilt durch den Fluss je Feldlinie. Nach außen gezählt positiv, nach innen negativ. Sie
// ändert sich stetig: Eine Linie, die gerade am Rand der Wicklung liegt, zählt zum Teil.
// ------------------------------------------------------------------
import { MAGNET, COIL, FIELD_LINES, CORE_STRENGTH } from './config.js';

const HALF = MAGNET.LENGTH / 2, POLE = MAGNET.WIDTH / 2;
const NF = 16, NC = 8;             // Punkte je Polfläche des Magneten bzw. je Stirnfläche eines Kerns
const STEP = 0.25, GRENZE = 42;    // Schrittweite beim Verfolgen der Linien und größter Abstand von der Mitte in cm
const TWO_PI = 2 * Math.PI;

const verteilt = (n, halb) => Array.from({ length: n }, (_, i) => ((i + 0.5) / n * 2 - 1) * halb);
const MAGNET_X = verteilt(NF, POLE);
const KERN_Q = verteilt(NC, COIL.CORE_R);

const wrap = d => Math.atan2(Math.sin(d), Math.cos(d));

// Magnet in Koordinaten des Magneten (Nordpol bei +y): Feld H der Polflächen und Stromfunktion
function magnetH(x, y, out) {
  for (const xi of MAGNET_X) {
    for (const [py, q] of [[HALF, 1], [-HALF, -1]]) {
      const dx = x - xi, dy = y - py, r2 = dx * dx + dy * dy || 1e-9;
      const f = q / (TWO_PI * NF * r2);
      out[0] += f * dx;
      out[1] += f * dy;
    }
  }
}
function magnetPsi(x, y) {
  let s = 0;
  for (const xi of MAGNET_X) s += wrap(Math.atan2(y - HALF, x - xi) - Math.atan2(y + HALF, x - xi));
  return s / (TWO_PI * NF);
}
const imMagnet = (x, y) => Math.abs(x) < POLE && Math.abs(y) < HALF;

// Kern in Koordinaten der Spule (a entlang der Achse nach außen, q quer dazu), Stärke s (positiv: nach außen)
function kernH(a, q, s, out) {
  for (const qi of KERN_Q) {
    for (const [pa, sign] of [[COIL.CORE_OUT, 1], [COIL.CORE_IN, -1]]) {
      const da = a - pa, dq = q - qi, r2 = da * da + dq * dq || 1e-9;
      const f = sign * s / (TWO_PI * NC * r2);
      out[0] += f * dq;   // Reihenfolge wie (x, y) = (q, a)
      out[1] += f * da;
    }
  }
}
function kernPsi(a, q, s) {
  let summe = 0;
  for (const qi of KERN_Q) summe += wrap(Math.atan2(a - COIL.CORE_OUT, q - qi) - Math.atan2(a - COIL.CORE_IN, q - qi));
  return s * summe / (TWO_PI * NC);
}
const imKern = (a, q) => Math.abs(q) < COIL.CORE_R && a > COIL.CORE_IN && a < COIL.CORE_OUT;

// Welt (x, y) → Koordinaten, die um den Winkel w gedreht sind, und zurück
const hinein = (x, y, w) => [x * Math.cos(w) + y * Math.sin(w), -x * Math.sin(w) + y * Math.cos(w)];
const heraus = (x, y, w) => [x * Math.cos(w) - y * Math.sin(w), x * Math.sin(w) + y * Math.cos(w)];

// Stärke der Kerne bei Drehwinkel phi; theta: Lagen der vorhandenen Spulen
const kerne = (phi, thetas) => thetas.map(theta => ({ theta, s: CORE_STRENGTH * Math.cos(phi - theta) }));

// Feld B in der Bildebene (Welt) – außen H, im Magneten und in den Kernen kommt die Magnetisierung dazu
function feld(x, y, phi, ks) {
  const out = [0, 0];
  const [mx, my] = hinein(x, y, phi);
  const m = [0, 0];
  magnetH(mx, my, m);
  if (imMagnet(mx, my)) m[1] += 1 / (2 * POLE);
  const [wx, wy] = heraus(m[0], m[1], phi);
  out[0] += wx;
  out[1] += wy;
  for (const { theta, s } of ks) {
    const [q, a] = hinein(x, y, theta);
    const k = [0, 0];
    kernH(a, q, s, k);
    if (imKern(a, q)) k[1] += s / (2 * COIL.CORE_R);
    const [kx, ky] = heraus(k[0], k[1], theta);
    out[0] += kx;
    out[1] += ky;
  }
  return out;
}

// Stromfunktion ψ (Welt): Fluss von P₂ nach P₁ gezählt = ψ(P₁) − ψ(P₂)
function psi(x, y, phi, ks) {
  let s = magnetPsi(...hinein(x, y, phi));
  for (const { theta, s: staerke } of ks) {
    const [q, a] = hinein(x, y, theta);
    s += kernPsi(a, q, staerke);
  }
  return s;
}

// Fluss je gezeichneter Feldlinie: Fluss des Magneten allein durch seine Nordpolfläche, aufgeteilt
const FLUSS_GESAMT = magnetPsi(-POLE, HALF + 1e-6) - magnetPsi(POLE, HALF + 1e-6);
export const FLUSS_JE_LINIE = FLUSS_GESAMT / FIELD_LINES;

// Lagen der Spulen je Aufbau
export const spulenLagen = coils => COIL.THETA.slice(0, coils);

// ---------------- Feldlinienmodell: Zahl der Feldlinien durch Spule k (mit Vorzeichen, nach außen positiv)

export function linienInSpule(k, phi, coils) {
  const ks = kerne(phi, spulenLagen(coils));
  const theta = COIL.THETA[k], mitte = (COIL.WIND_IN + COIL.WIND_OUT) / 2;
  const links = heraus(-COIL.WIND_R, mitte, theta), rechts = heraus(COIL.WIND_R, mitte, theta);
  return (psi(...links, phi, ks) - psi(...rechts, phi, ks)) / FLUSS_JE_LINIE;
}

// Liegt der Punkt (Welt) im Inneren der Wicklung von Spule k?
export function imInneren(x, y, k) {
  const [q, a] = hinein(x, y, COIL.THETA[k]);
  return a > COIL.WIND_IN && a < COIL.WIND_OUT && Math.abs(q) < COIL.WIND_R;
}

// ---------------- Feldlinien verfolgen

// Von P aus in Feldrichtung (richtung = 1) bzw. dagegen (−1), bis die Linie in den Magneten läuft oder zu weit weg
function verfolgen(x, y, richtung, phi, ks) {
  const punkte = [[x, y]];
  for (let i = 0; i < 1200; i++) {
    const [ax, ay] = feld(x, y, phi, ks);
    const la = Math.hypot(ax, ay) || 1;
    const hx = x + richtung * ax / la * STEP / 2, hy = y + richtung * ay / la * STEP / 2;
    const [bx, by] = feld(hx, hy, phi, ks);   // Mittelpunktverfahren
    const lb = Math.hypot(bx, by) || 1;
    x += richtung * bx / lb * STEP;
    y += richtung * by / lb * STEP;
    punkte.push([x, y]);
    if (i > 3 && imMagnet(...hinein(x, y, phi))) return { punkte, zuMagnet: true };
    if (Math.hypot(x, y) > GRENZE) return { punkte, zuMagnet: false };
  }
  return { punkte, zuMagnet: false };
}

// Stelle auf einer Polfläche (Koordinate x im Magneten), an der ψ den Wert wert hat (ψ fällt dort mit x)
function aufPolflaeche(wert, yPol, phi, ks) {
  let lo = -POLE, hi = POLE;
  const f = xm => psi(...heraus(xm, yPol, phi), phi, ks) - wert;
  if (f(lo) < 0 || f(hi) > 0) return null;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Alle Feldlinien bei Drehwinkel phi als Punktfolgen [x, y] (Welt), in Feldrichtung durchlaufen
export function linien(phi, coils) {
  const ks = kerne(phi, spulenLagen(coils));
  const ergebnis = [];
  const AUSSEN = 0.02;
  for (let j = 0; j < FIELD_LINES; j++) {
    const wert = FLUSS_GESAMT * (0.5 - (j + 0.5) / FIELD_LINES);
    const xn = aufPolflaeche(wert, HALF + AUSSEN, phi, ks);
    if (xn === null) continue;
    const start = heraus(xn, HALF + AUSSEN, phi);
    const hin = verfolgen(...start, 1, phi, ks);
    // im Magneten gerade vom Südpol zum Nordpol
    const innen = (xs, xe) => [heraus(xs, -HALF, phi), heraus(xe, HALF, phi)];
    if (hin.zuMagnet) {
      const [ex, ey] = hinein(...hin.punkte.at(-1), phi);
      const xs = Math.max(-POLE, Math.min(POLE, ex));
      ergebnis.push([...innen(xs, xn), ...hin.punkte.slice(0, -1), heraus(xs, Math.sign(ey) * HALF, phi)]);
    } else {
      // offen: Rückweg zum Südpol von außen her verfolgen
      const xs = aufPolflaeche(wert, -HALF - AUSSEN, phi, ks) ?? xn;
      const zurueck = verfolgen(...heraus(xs, -HALF - AUSSEN, phi), -1, phi, ks).punkte.reverse();
      ergebnis.push([...zurueck, ...innen(xs, xn), ...hin.punkte]);
    }
  }
  return ergebnis;
}
