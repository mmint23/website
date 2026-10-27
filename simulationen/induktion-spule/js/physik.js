// ------------------------------------------------------------------
// Physik: magnetischer Fluss durch die Spule und Induktionsspannung U = −N · dΦ/dt
//
// Feldmodell des Stabmagneten (Polmodell): je ein „Pol“ der Stärke p = B_r · A auf der Mitte der Stirnflächen
// (Nordpol +p, Südpol −p). Durch eine Windung (Kreisfläche, koaxial) geht vom Pol der Anteil des Raumwinkels:
//   Φ = ±p/2 · (1 − |d| / √(d² + R²)),  d: Abstand der Windung vom Pol entlang der Achse.
// Schneidet die Windung den Magneten, kommt der Fluss im Magneten (+p in Richtung Süd → Nord) dazu. So geht
// jede Feldlinie, die die Windung durchsetzt, einmal in die Rechnung ein, und Φ ändert sich stetig, auch wenn eine
// Stirnfläche durch die Windung wandert. Die Spule zählt als LOOPS gleichmäßig verteilte Windungen.
//
// Magnet und Spule folgen beim Ziehen dem Finger (FOLLOW_TIME) und bleiben beim Loslassen stehen.
// Das Modell ist für einen qualitativen Versuch gedacht; die Größenordnungen passen zu einem Schulversuch.
// ------------------------------------------------------------------
import { MAGNET, MAGNET_AREA, POLE_R, B_REMANENZ, COIL, X_MIN, X_MAX, FOLLOW_TIME, START, METER, MULTIMETER } from './config.js';
import { state } from './state.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const TWO_PI = 2 * Math.PI;
const POLE = B_REMANENZ * MAGNET_AREA;   // Polstärke p in Wb

// Lage (x der Mitte in cm), Ziel beim Ziehen, Geschwindigkeit in cm/s
export const bodies = {
  magnet: { x: START.magnet, target: START.magnet, v: 0, dragging: false },
  coil: { x: START.coil, target: START.coil, v: 0, dragging: false },
};
export const needle = { pos: 0, vel: 0 };
export const clock = { t: 0 };
export const multimeter = { reading: 0, next: 0 };   // angezeigter Wert in V, Zeit des nächsten Messwerts
const history = [];                                  // { t, u } für den Mittelwert des Multimeters
let voltage = 0;                                     // Spannung an den Anschlüssen in V (im letzten Zeitschritt)
let linkage = null;                                  // Flussverkettung N · Φ im letzten Zeitschritt

// ---------------- Feld

// Fluss eines Pols der Stärke p durch eine Windung (Radius R in cm), d = x(Windung) − x(Pol) in cm. Positiv: in +x.
export function poleFlux(p, d, R) {
  if (d === 0) return 0;   // Pol genau in der Windungsebene: Mittelwert der beiden Grenzwerte
  return p / 2 * Math.sign(d) * (1 - Math.abs(d) / Math.hypot(d, R));
}

// Fluss durch eine Windung bei xLoop (Radius R) vom Magneten mit Mitte xMagnet, in Wb, positiv in +x
export function loopFlux(xLoop, xMagnet, northRight = state.northRight, R = COIL.R_WIND) {
  const s = northRight ? 1 : -1, half = MAGNET.LENGTH / 2;
  const north = xMagnet + s * half, south = xMagnet - s * half;
  let flux = poleFlux(POLE, xLoop - north, R) + poleFlux(-POLE, xLoop - south, R);
  const inside = Math.abs(xLoop - xMagnet);
  if (inside < half) flux += s * POLE;              // Windung schneidet den Magneten: Fluss im Magneten
  else if (inside === half) flux += s * POLE / 2;   // genau an der Stirnfläche
  return flux;
}

// Mittlerer Fluss durch eine Windung der Spule (Mitte xCoil) in Wb
export function coilFlux(xCoil = bodies.coil.x, xMagnet = bodies.magnet.x, northRight = state.northRight) {
  let sum = 0;
  for (let i = 0; i < COIL.LOOPS; i++) {
    sum += loopFlux(xCoil + COIL.LENGTH * ((i + 0.5) / COIL.LOOPS - 0.5), xMagnet, northRight);
  }
  return sum / COIL.LOOPS;
}

// Mittlere Flussdichte im Spuleninneren in T (Fluss je Windung durch die Windungsfläche), positiv in +x
export const coilField = () => coilFlux() / (Math.PI * (COIL.R_WIND / 100) ** 2);

// Spannung an den Anschlüssen in V: U = −N · dΦ/dt (Plus: rote Buchse am rechten Anschluss der Spule)
export const coilVoltage = () => voltage;

// ---------------- Ziehen

export function startDrag(name, x) {
  bodies[name].dragging = true;
  dragTo(name, x);
}
export function dragTo(name, x) {
  bodies[name].target = clamp(x, X_MIN, X_MAX);
}
export function endDrag(name) {
  const body = bodies[name];
  body.dragging = false;
  body.target = body.x;   // bleibt stehen, wo er gerade ist
}

// Magnet umgedreht: Der Fluss springt, ohne dass etwas bewegt wurde – kein Spannungsstoß in der Rechnung
export const fluxChanged = () => { linkage = null; };

export function resetPhysics() {
  for (const [name, body] of Object.entries(bodies)) Object.assign(body, { x: START[name], target: START[name], v: 0, dragging: false });
  Object.assign(needle, { pos: 0, vel: 0 });
  Object.assign(multimeter, { reading: 0, next: 0 });
  history.length = 0;
  clock.t = 0;
  voltage = 0;
  linkage = null;
}

// ---------------- Zeitschritt

function stepBodies(h) {
  for (const body of Object.values(bodies)) {
    const before = body.x;
    body.x += (body.target - body.x) * Math.min(1, h / FOLLOW_TIME);
    if (Math.abs(body.target - body.x) < 1e-4) body.x = body.target;
    body.v = (body.x - before) / h;
  }
}

function stepNeedle(h) {
  const w0 = TWO_PI * METER.FREQ;
  const target = clamp(voltage / state.range, -METER.STOP, METER.STOP);
  needle.vel += (w0 * w0 * (target - needle.pos) - 2 * METER.DAMPING * w0 * needle.vel) * h;
  needle.pos += needle.vel * h;
  if (Math.abs(needle.pos) > METER.STOP) {
    needle.pos = Math.sign(needle.pos) * METER.STOP;
    needle.vel = -0.3 * needle.vel;
  }
}

// Multimeter: alle INTERVAL Sekunden ein neuer Messwert, Mittelwert über die letzten AVERAGE Sekunden
function stepMultimeter() {
  history.push({ t: clock.t, u: voltage });
  while (history.length && history[0].t < clock.t - MULTIMETER.AVERAGE) history.shift();
  if (clock.t < multimeter.next) return;
  multimeter.next = clock.t + MULTIMETER.INTERVAL;
  multimeter.reading = history.reduce((sum, s) => sum + s.u, 0) / history.length;
}

export function stepPhysics(dt) {
  if (dt <= 0) return;
  const SUBSTEPS = 8, h = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) {
    stepBodies(h);
    const now = COIL.TURNS * coilFlux();
    voltage = linkage === null ? 0 : -(now - linkage) / h;
    linkage = now;
    clock.t += h;
    stepNeedle(h);
    stepMultimeter();
  }
}
