// ------------------------------------------------------------------
// Reale Physik ohne Eisenkern: Feld des Magneten im Inneren einer Luftspule (ohne three.js, testbar).
// Der Magnet ist räumlich aus seinen beiden Polflächen zusammengesetzt (je 6 × 6 Punkte); gemittelt wird die
// Feldkomponente entlang der Spulenachse über das Innere der Wicklung (Kreisscheiben von WIND_IN bis WIND_OUT).
// Ergebnis als Anteil des Werts bei α = 0 (Nordpol zeigt auf die Spule), α = φ − θ. Anders als mit Eisenkern ist
// das nicht cos α: Der Magnet ist kaum kürzer als sein Abstand zur Spule, B fällt beim Wegdrehen schnell ab.
// Einmal als Tabelle über eine Vierteldrehung berechnet (Rest aus der Symmetrie).
// ------------------------------------------------------------------
import { MAGNET, COIL } from './config.js';

const HALF = MAGNET.LENGTH / 2, POLE = MAGNET.WIDTH / 2;
const PUNKTE = [];
for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k++) PUNKTE.push([((i + 0.5) / 6 * 2 - 1) * POLE, ((k + 0.5) / 6 * 2 - 1) * POLE]);

// Mittlere Feldkomponente entlang der Spulenachse (beliebige Einheit)
function mittel(alpha) {
  const c = Math.cos(alpha), s = Math.sin(alpha);
  let summe = 0, gewicht = 0;
  for (let a = COIL.WIND_IN; a <= COIL.WIND_OUT + 1e-9; a += (COIL.WIND_OUT - COIL.WIND_IN) / 10) {
    for (let r = 0.2; r < COIL.WIND_R; r += 0.4) {
      for (let t = 0; t < 8; t++) {
        const x = r * Math.cos(t * Math.PI / 4 + 0.2), z = r * Math.sin(t * Math.PI / 4 + 0.2);
        let b = 0;
        for (const pol of [1, -1]) {
          for (const [px, pz] of PUNKTE) {
            const py = pol * HALF;
            const dx = x - (px * c - py * s), dy = a - (px * s + py * c), dz = z - pz;
            const d = Math.hypot(dx, dy, dz);
            b += pol * dy / (d * d * d);
          }
        }
        summe += b * r;
        gewicht += r;
      }
    }
  }
  return summe / gewicht;
}

const SCHRITTE = 90;    // je Grad von 0° bis 90°
let tabelle = null;
function anlegen() {
  const werte = Array.from({ length: SCHRITTE + 1 }, (_, i) => mittel(i / SCHRITTE * Math.PI / 2));
  tabelle = werte.map(v => v / werte[0]);
}

// Anteil von B bei α (1 bei α = 0, 0 bei 90°, −1 bei 180°)
export function luftAnteil(alpha) {
  if (!tabelle) anlegen();
  let a = ((alpha % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (a > Math.PI) a = 2 * Math.PI - a;           // symmetrisch: f(−α) = f(α)
  const vorzeichen = a > Math.PI / 2 ? -1 : 1;    // f(π − α) = −f(α)
  if (a > Math.PI / 2) a = Math.PI - a;
  const u = a / (Math.PI / 2) * SCHRITTE, i = Math.min(SCHRITTE - 1, Math.floor(u)), f = u - i;
  return vorzeichen * (tabelle[i] * (1 - f) + tabelle[i + 1] * f);
}

// Änderung je rad
export const luftAenderung = alpha => (luftAnteil(alpha + 1e-4) - luftAnteil(alpha - 1e-4)) / 2e-4;
