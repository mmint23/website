// ------------------------------------------------------------------
// Modell der Elementarmagnete (ohne Zeichnen, testbar mit node --test)
//
// Das Eisenstück enthält ein Raster kleiner Elementarmagnete, jeder mit einem Winkel θ
// (Richtung vom Süd- zum Nordpol, 0 = nach rechts, y nach oben).
// Ein äußeres Magnetfeld B dreht jeden Elementarmagneten in Feldrichtung – aber nur, wenn es stärker
// ist als die „Haftschwelle“ des Materials (Koerzitivfeld). Unterhalb verliert er seine Ordnung durch
// Wärmebewegung nach und nach (Weicheisen) oder bleibt erhalten (Stahl). Ein vom Feld ausgerichteter
// Elementarmagnet legt sich in Stahl danach in die nächstliegende Längsrichtung des Stücks
// (ein langes, dünnes Stück lässt sich längs viel leichter magnetisieren als quer).
// Ein Hammerschlag verdreht alle Elementarmagnete ein Stück zufällig: Die Ordnung geht verloren.
//
// Magnetfelder werden aus „Polen“ berechnet (Nordpol positiv, Südpol negativ): B = Σ q · r / |r|³.
// Einheiten sind frei gewählt (Simulationscharakter).
// ------------------------------------------------------------------

export const MATERIALIEN = {
  weicheisen: { name: 'Weicheisen', schwelle: 0.2, unruhe: 1.6, laengs: 0 },   // leicht zu magnetisieren, verliert die Ordnung
  stahl: { name: 'Stahl', schwelle: 0.6, unruhe: 0, laengs: 3 },             // schwerer zu magnetisieren, bleibt magnetisch
};
const DREHRATE = 20;           // wie schnell sich ein Elementarmagnet ins Feld dreht (je Feldstärke über der Schwelle)
const MAX_RATE = 80;
const HAMMER = 1.2;            // größte zufällige Verdrehung je Schlag (rad)

/** Zufallszahlen: reproduzierbar (für Tests) oder Math.random */
export function zufall(seed = null) {
  if (seed === null) return Math.random;
  let a = seed >>> 0;
  return () => {                          // mulberry32
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Elementarmagnete im Raster (spalten × zeilen) eines Stücks der Breite b und Höhe h (Mitte 0, 0), ungeordnet */
export function erzeugeElementarmagnete(spalten, zeilen, b, h, rnd = Math.random) {
  // Richtungen gleichmäßig über den Kreis verteilt und gemischt: wirklich ungeordnet (keine Vorzugsrichtung)
  const n = spalten * zeilen;
  const winkel = Array.from({ length: n }, (_, k) => (k + rnd()) / n * 2 * Math.PI);
  for (let k = n - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [winkel[k], winkel[j]] = [winkel[j], winkel[k]]; }
  const liste = [];
  for (let j = 0; j < zeilen; j++) {
    for (let i = 0; i < spalten; i++) {
      liste.push({ x: -b / 2 + (i + 0.5) * b / spalten, y: -h / 2 + (j + 0.5) * h / zeilen, theta: winkel[j * spalten + i] });
    }
  }
  return liste;
}

/** Feld von Polen [{ x, y, q }] am Punkt (x, y) */
export function feldVonPolen(pole, x, y) {
  let bx = 0, by = 0;
  for (const p of pole) {
    const dx = x - p.x, dy = y - p.y;
    const r2 = dx * dx + dy * dy + 0.04;   // etwas „weich“, damit es am Pol nicht unendlich wird
    const f = p.q / (r2 * Math.sqrt(r2));
    bx += f * dx; by += f * dy;
  }
  return { bx, by };
}

/**
 * Elementarmagnete um dt weiterdrehen.
 * feld(x, y) liefert das äußere Feld { bx, by } am Ort eines Elementarmagneten (Koordinaten des Stücks).
 */
export function schritt(magnete, feld, dt, material, rnd = Math.random) {
  const m = MATERIALIEN[material];
  for (const e of magnete) {
    const { bx, by } = feld(e.x, e.y);
    const b = Math.hypot(bx, by);
    if (b > m.schwelle) {
      const rate = Math.min(MAX_RATE, DREHRATE * (b - m.schwelle));
      e.theta += rate * Math.sin(Math.atan2(by, bx) - e.theta) * dt;
      e.ausgerichtet = true;
    } else if (m.laengs > 0 && e.ausgerichtet) {
      // in die nächstliegende Längsrichtung (nach rechts oder links) legen
      e.theta -= m.laengs * Math.sin(2 * e.theta) / 2 * dt;
    } else if (m.unruhe > 0) {
      // Wärmebewegung: zufälliges Zittern, die Ordnung geht nach und nach verloren
      e.theta += m.unruhe * Math.sqrt(dt) * normal(rnd);
    }
  }
}

function normal(rnd) {
  const u = Math.max(1e-12, rnd()), v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Hammerschlag: jeder Elementarmagnet wird ein Stück zufällig verdreht */
export function hammerschlag(magnete, rnd = Math.random, staerke = HAMMER) {
  for (const e of magnete) { e.theta += (2 * rnd() - 1) * staerke; e.ausgerichtet = false; }
}

/** Magnetisierung: mittlere Richtung aller Elementarmagnete { mx, my, ordnung (0 … 1) } */
export function magnetisierung(magnete) {
  let mx = 0, my = 0;
  for (const e of magnete) { mx += Math.cos(e.theta); my += Math.sin(e.theta); }
  mx /= magnete.length; my /= magnete.length;
  return { mx, my, ordnung: Math.hypot(mx, my) };
}

/** Feld eines Stabmagneten (Mitte x, y; Länge l; senkrecht; unten = Pol 'N' oder 'S'): zwei Pole */
export function stabmagnetPole(x, y, l, unten = 'N', q = 6) {
  const s = unten === 'N' ? 1 : -1;
  // nx, ny: nach außen zeigende Richtung der Polfläche (dort beginnen die Feldlinien)
  return [{ x, y: y - l / 2 + 0.4, q: s * q, nx: 0, ny: -1 }, { x, y: y + l / 2 - 0.4, q: -s * q, nx: 0, ny: 1 }];
}

/** Das magnetisierte Eisenstück wirkt nach außen wie ein Stabmagnet: Pole an den Enden (Stärke ~ mx) */
export function stueckPole(x, y, b, mx, q = 2.5) {
  return [{ x: x + b / 2 - 0.3, y, q: q * mx, nx: 1, ny: 0 }, { x: x - b / 2 + 0.3, y, q: -q * mx, nx: -1, ny: 0 }];
}
