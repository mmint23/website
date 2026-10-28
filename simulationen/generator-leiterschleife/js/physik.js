// ------------------------------------------------------------------
// Physik des Generator-Modells: Drehung der Leiterschleife, Induktionsspannung, Zeiger des Messgeräts
// Ohne Darstellung und ohne Browser – lässt sich mit Node testen (tests/physik.test.mjs).
//
// Die Spannung wird über die Lorentzkraft auf die Ladungen in den beiden Längsseiten berechnet
// (U = Σ l · (v × B) · Laufrichtung) – zwischen den Schleifringen ergibt das U = −B · A · ω · sin φ. sidePosition(), sideVelocity(),
// fieldVector() und sideEmf() liefern alles, was die Erklärhilfen (Pfeile v, F_L, Elektronen) brauchen.
// Drehzahl und Antrieb sind als Bewegungsgleichung angelegt, damit später ein Gegenmoment (Belastung)
// dazukommen kann.
// ------------------------------------------------------------------
import {
  TURBINE, LOOP, B_FIELD, SIDE_LENGTH, SPEED_TIME, CRANK_TIME, CRANK_MAX_OMEGA, FRICTION, FRICTION_STOP, METER, EXPLAIN,
} from './config.js';
import { state } from './state.js';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const TWO_PI = 2 * Math.PI;

// Schleife: Drehwinkel φ um die Welle (x-Achse, gegen den Uhrzeigersinn von rechts gesehen) und
// Winkelgeschwindigkeit ω. φ = 0: Schleife liegt waagrecht, Längsseite A vorne, B hinten.
// Festhalten: holdTarget ist die Stellung, der die Schleife folgt (Kurbel bzw. Drehwinkel-Regler)
export const rotor = { phi: 0, omega: 0, dragging: false, target: 0, holdTarget: 0 };
// Erklärmodus: Verschiebung der Elektronen entlang der Schleife in cm, in Laufrichtung (Ring 1 → A → B → Ring 2)
export const electrons = { shift: 0 };
// Zeiger: Ausschlag als Anteil des Vollausschlags, Geschwindigkeit
export const needle = { pos: 0, vel: 0 };
// Simulationszeit in s (für das U-t-Diagramm)
export const clock = { t: 0 };

// ---------------- Geometrie und Feld

// Lage der Längsseite A (side = 0) bzw. B (side = 1) in cm, Mitte der Seite
export function sidePosition(side, phi = rotor.phi) {
  const s = side === 0 ? 1 : -1;
  return { x: 0, y: -s * LOOP.RADIUS * Math.sin(phi), z: s * LOOP.RADIUS * Math.cos(phi) };
}

// Geschwindigkeit der Längsseite in m/s: v = ω × r
export function sideVelocity(side) {
  const p = sidePosition(side);
  return { x: 0, y: -rotor.omega * p.z / 100, z: rotor.omega * p.y / 100 };
}

// Flussdichte zwischen den Polen in T (vom Nord- zum Südpol: bei Nordpol oben nach unten)
export const fieldVector = () => ({ x: 0, y: (state.northUp ? -1 : 1) * B_FIELD, z: 0 });

// Laufrichtung entlang der Schleife, wie sie verdrahtet ist: Ring 1 bzw. Ende A → Seite A (in −x, vom
// rechten zum linken Ende) → Querseite → Seite B (in +x) → Ende B bzw. Ring 2
export const sideDirection = side => (side === 0 ? -1 : 1);

// Induktionsspannung einer Längsseite in V: l · (v × B) · Laufrichtung
export function sideEmf(side) {
  const v = sideVelocity(side), B = fieldVector();
  return SIDE_LENGTH * (v.y * B.z - v.z * B.y) * sideDirection(side);
}

// Induktionsspannung in Laufrichtung (Ende A → Ende B) in V; die Querseiten tragen nichts bei
// (dort steht v × B senkrecht zum Draht). Positiv: positive Ladungen werden zu Ring 2 geschoben.
export const emf = () => sideEmf(0) + sideEmf(1);

// Spannung zwischen den Schleifringen U = φ(Ring 1) − φ(Ring 2) in V (offener Kreis): Die Umlaufspannung
// schiebt positive Ladungen zu Ende B (Ring 2), also U = −emf. Positiv: Ring 1 (rotes Kabel) ist Pluspol.
export const ringVoltage = () => -emf();

// Anzeige des Messgeräts in mV (rotes Kabel an Ring 1, schwarzes an Ring 2)
export const meterReading = () => 1000 * ringVoltage();

// Lorentzkraft pro Ladung auf ein Elektron in einer Längsseite in V/m (Vektor): F/e = −(v × B)
export function electronForce(side) {
  const v = sideVelocity(side), B = fieldVector();
  return { x: -(v.y * B.z - v.z * B.y), y: -(v.z * B.x - v.x * B.z), z: -(v.x * B.y - v.y * B.x) };
}

// ... ihr Anteil in Laufrichtung (für beide Längsseiten gleich)
export const electronForceAlong = () => electronForce(0).x * sideDirection(0);

// ---------------- Zeitschritt

function stepRotor(dt) {
  if (state.hold) {
    // Festgehalten: folgt Kurbel bzw. Regler und bleibt sonst stehen
    if (rotor.dragging) rotor.holdTarget = rotor.target;
    rotor.omega = clamp((rotor.holdTarget - rotor.phi) / CRANK_TIME, -CRANK_MAX_OMEGA, CRANK_MAX_OMEGA);
  } else if (state.drive === 'wind') {
    // Wind: Rotor und Schleife sitzen auf derselben Welle (Generator ohne Getriebe); Drehzahl proportional zum Wind
    rotor.omega = TWO_PI * park.rpm / 60;
  } else if (state.drive === 'speed') {
    // Drehzahl-Regler: wie ein geregelter Antrieb, die Drehzahl stellt sich gleichmäßig ein
    rotor.omega += (TWO_PI * state.speed - rotor.omega) * Math.min(1, dt / SPEED_TIME);
  } else if (rotor.dragging) {
    // Kurbel: die Schleife folgt dem Finger
    rotor.omega = clamp((rotor.target - rotor.phi) / CRANK_TIME, -CRANK_MAX_OMEGA, CRANK_MAX_OMEGA);
  } else {
    // losgelassen: läuft durch Reibung langsam aus
    rotor.omega -= FRICTION * rotor.omega * dt;
    if (Math.abs(rotor.omega) < FRICTION_STOP) rotor.omega = 0;
  }
  rotor.phi += rotor.omega * dt;
}

function stepNeedle(dt) {
  const w0 = TWO_PI * METER.FREQ;
  const target = clamp(meterReading() / state.range, -METER.STOP, METER.STOP);
  needle.vel += (w0 * w0 * (target - needle.pos) - 2 * METER.DAMPING * w0 * needle.vel) * dt;
  needle.pos += needle.vel * dt;
  if (Math.abs(needle.pos) > METER.STOP) {
    needle.pos = Math.sign(needle.pos) * METER.STOP;
    needle.vel = -0.3 * needle.vel;
  }
}

// ---------------- Weg der Elektronen entlang der Schleife (Erklärmodus, Koordinaten der ruhenden Schleife)
// s = 0 am offenen Ende A, s = PATH_LENGTH am offenen Ende B: Ende A → Seite A → Querseite → Seite B → Ende B

const L2 = LOOP.LENGTH / 2, R = LOOP.RADIUS, OPEN = EXPLAIN.OPEN_END;
// Eckpunkte (x, z); die vier Ecken sind mit dem Biegeradius CORNER_R gerundet (wie der Draht in modell.js), damit die
// Elektronen auch in den Ecken mitten im Draht laufen
const ECKEN = [[L2, OPEN], [L2, R], [-L2, R], [-L2, -R], [L2, -R], [L2, -OPEN]];
export const PATH = (() => {
  const cr = EXPLAIN.CORNER_R, punkte = [ECKEN[0]], STUECKE = 10;
  for (let i = 1; i < ECKEN.length - 1; i++) {
    const [px, pz] = ECKEN[i];
    const einheit = ([x, z]) => { const l = Math.hypot(x - px, z - pz); return [(x - px) / l, (z - pz) / l]; };
    const u = einheit(ECKEN[i - 1]), w = einheit(ECKEN[i + 1]);
    const cx = px + cr * (u[0] + w[0]), cz = pz + cr * (u[1] + w[1]);   // Mittelpunkt des Bogens (rechte Winkel)
    for (let k = 0; k <= STUECKE; k++) {
      const t = k / STUECKE * Math.PI / 2;
      punkte.push([cx - cr * (w[0] * Math.cos(t) + u[0] * Math.sin(t)), cz - cr * (w[1] * Math.cos(t) + u[1] * Math.sin(t))]);
    }
  }
  punkte.push(ECKEN.at(-1));
  return punkte;
})();
const PATH_PARTS = PATH.slice(1).map(([x, z], i) => Math.hypot(x - PATH[i][0], z - PATH[i][1]));
export const PATH_LENGTH = PATH_PARTS.reduce((a, b) => a + b, 0);

export function pathPoint(s) {
  let rest = Math.min(Math.max(s, 0), PATH_LENGTH);
  for (let i = 0; i < PATH_PARTS.length; i++) {
    if (rest <= PATH_PARTS[i] || i === PATH_PARTS.length - 1) {
      const k = PATH_PARTS[i] ? rest / PATH_PARTS[i] : 0;
      const [x0, z0] = PATH[i], [x1, z1] = PATH[i + 1];
      return { x: x0 + (x1 - x0) * k, y: 0, z: z0 + (z1 - z0) * k };
    }
    rest -= PATH_PARTS[i];
  }
}

// Lage des einzelnen Elektrons in Ruhe: Mitte der Längsseite A (von Ende A aus: Zuleitung bis zur Ecke, halber
// Bogen, halbe gerade Länge der Längsseite – zusammen genau x = 0)
export const SINGLE_REST = (() => {
  let s = 0;
  for (let i = 0; i < PATH_PARTS.length; i++) {
    const [x0, z0] = PATH[i], [x1] = PATH[i + 1];
    if (z0 === R && x1 <= 0 && x0 >= 0) return s + (x0 / (x0 - x1)) * PATH_PARTS[i];
    s += PATH_PARTS[i];
  }
  return s;
})();

// Zweites Elektron („2 e⁻“) in Ruhe: Mitte der Längsseite B – der Weg ist spiegelbildlich, also gleich weit vom Ende B
export const SECOND_REST = PATH_LENGTH - SINGLE_REST;

// Viele Elektronen: gleichmäßig verteilt (zugleich Plätze der Atomrümpfe)
export function manyRestPositions() {
  const n = EXPLAIN.MANY_COUNT, m = EXPLAIN.MANY_MARGIN;
  return Array.from({ length: n }, (_, i) => m + i * (PATH_LENGTH - 2 * m) / (n - 1));
}
// größte gemeinsame Verschiebung: alle Elektronen dicht gedrängt an einem Ende
export const manyShiftLimit = () => PATH_LENGTH - 2 * EXPLAIN.MANY_MARGIN - (EXPLAIN.MANY_COUNT - 1) * EXPLAIN.MANY_PACK;

// Lagen aller Elektronen bei der Verschiebung d: an den Enden drängen sie sich mit Mindestabstand zusammen
export function manyPositions(d = electrons.shift) {
  const rest = manyRestPositions(), m = EXPLAIN.MANY_MARGIN, gap = EXPLAIN.MANY_PACK;
  const p = rest.map(s => s + d);
  for (let i = 0; i < p.length; i++) p[i] = Math.max(p[i], i === 0 ? m : p[i - 1] + gap);
  for (let i = p.length - 1; i >= 0; i--) p[i] = Math.min(p[i], i === p.length - 1 ? PATH_LENGTH - m : p[i + 1] - gap);
  return p;
}

// Erklärmodus: Elektronen verschieben sich mit der Lorentzkraft in Laufrichtung (in der Ruhe wieder zurück).
// Bei „viele e⁻“ stärker, bis sie sich am Ende drängen: Ladungstrennung zwischen den Enden.
function stepElectrons(dt) {
  if (!state.explain) return;
  const [gain, max] = state.showManyElectrons
    ? [EXPLAIN.MANY_SHIFT, manyShiftLimit()] : [EXPLAIN.ELECTRON_SHIFT, EXPLAIN.ELECTRON_MAX];
  const target = clamp(gain * electronForceAlong(), -max, max);
  electrons.shift += (target - electrons.shift) * Math.min(1, dt / EXPLAIN.ELECTRON_TIME);
}

// Ein Zeitschritt der Physik (dt in s, Simulationszeit)
export function stepPhysics(dt) {
  const SUBSTEPS = 8, h = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) {
    stepRotor(h);
    stepNeedle(h);
    stepElectrons(h);
  }
  clock.t += dt;
}

// ---------------- Rotor einer Windkraftanlage (Antrieb „Wind“; bis 12 m/s wie in der Simulation Windpark)

// Drehzahl der Windräder in U/min (0 unterhalb der Einschaltgeschwindigkeit)
export const park = { rpm: 0 };
// (vereinfacht: proportional zum Wind, ohne Nenndrehzahl – mehr Wind heißt immer schneller und mehr Spannung)
export function turbineTargetRpm(wind) {
  if (wind < TURBINE.CUT_IN) return 0;
  return TURBINE.RPM_PER_WIND * wind;
}

// Windräder sind träge: Drehzahl folgt dem Wind verzögert (dt in s, Echtzeit)
export function stepPark(dt) {
  park.rpm += (turbineTargetRpm(state.wind) - park.rpm) * Math.min(1, dt / TURBINE.SPIN_TIME);
  if (park.rpm < 0.05 && turbineTargetRpm(state.wind) === 0) park.rpm = 0;
}

// ---------------- Kurbel

export function startCrank(angle) {
  rotor.dragging = true;
  rotor.target = rotor.phi;
  crankTo(angle);
}

// Kurbel auf den Winkel angle drehen; angle wird so gewählt, dass er dem bisherigen Ziel am nächsten liegt
// (die Kurbel kann beliebig viele Umdrehungen machen)
export function crankTo(angle) {
  const delta = Math.atan2(Math.sin(angle - rotor.target), Math.cos(angle - rotor.target));
  rotor.target += delta;
}

// Loslassen; beim Festhalten bleibt die Schleife sofort stehen
export function endCrank() {
  rotor.dragging = false;
  if (state.hold) {
    rotor.holdTarget = rotor.phi;
    rotor.omega = 0;
  }
}

// Festhalten ein/aus: die Schleife bleibt, wo sie gerade ist
export function setHold(on) {
  state.hold = on;
  rotor.holdTarget = rotor.phi;
  if (on) rotor.omega = 0;
}

// Festgehaltene Schleife in die Stellung angle (rad) drehen – auf dem kürzeren Weg
export function holdTo(angle) {
  rotor.holdTarget = rotor.phi + Math.atan2(Math.sin(angle - rotor.phi), Math.cos(angle - rotor.phi));
}

export function resetPhysics() {
  Object.assign(rotor, { phi: 0, omega: 0, dragging: false, target: 0, holdTarget: 0 });
  electrons.shift = 0;
  Object.assign(needle, { pos: 0, vel: 0 });
  clock.t = 0;
}
