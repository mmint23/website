// ------------------------------------------------------------------
// Physik des Innenpolgenerators: Drehung des Magneten, Magnetfeld in den Spulen, Induktionsspannung, Zeiger
// Ohne Darstellung und ohne Browser – lässt sich mit Node testen (tests/physik.test.mjs).
//
// Modell: Der Magnet (Polrad) dreht sich um die Welle, Drehwinkel φ (gegen den Uhrzeigersinn von vorne,
// φ = 0: Nordpol oben). Die Flussdichte im Kern einer Spule an der Lage θ ist B = B_MAX · cos(φ − θ), gezählt
// in Richtung der Spulenachse nach außen (vom Magneten weg): Zeigt der Nordpol auf die Spule, ist B am größten.
// Diese Kosinusform ist eine Vereinfachung – echte Generatoren formen ihre Polschuhe aber genau so, dass sie
// annähernd gilt. Induktionsgesetz: U = −N · A · dB/dt.
// Feldlinienmodell (state.lineModel, Standard, für den Unterricht): B im Spuleninneren folgt der Zahl der gezeigten
// Feldlinien durch die Spule (feldlinienModell.js), B = B_MAX · n / n₀ mit n₀ = Zahl der Linien, wenn der Nordpol
// auf die Spule zeigt. Spannung entsteht also genau dann, wenn sich die Zahl der Feldlinien durch die Spule ändert.
// Die Linien sind so gebaut, dass n fast wie cos(φ − θ) verläuft – beide Modelle stimmen also annähernd überein.
// Drehzahl und Antrieb sind als Bewegungsgleichung angelegt, damit später ein Gegenmoment (Belastung)
// dazukommen kann.
// ------------------------------------------------------------------
import {
  COIL, B_MAX, TURNS, CORE_AREA, SPEED_TIME, CRANK_TIME, CRANK_MAX_OMEGA, FRICTION, FRICTION_STOP, METER,
} from './config.js';
import { state } from './state.js';
import { linienInSpule } from './feldlinienModell.js';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const TWO_PI = 2 * Math.PI;

// Magnet: Drehwinkel φ und Winkelgeschwindigkeit ω (positiv: gegen den Uhrzeigersinn von vorne).
// Festhalten: holdTarget ist die Stellung, der der Magnet folgt (Kurbel bzw. Drehwinkel-Regler)
export const rotor = { phi: 0, omega: 0, dragging: false, target: 0, holdTarget: 0 };
// Zeiger: Ausschlag als Anteil des Vollausschlags, Geschwindigkeit
export const needle = { pos: 0, vel: 0 };
// Simulationszeit in s (für die Diagramme)
export const clock = { t: 0 };

// ---------------- Feld und Spannung

// Feldlinienmodell: Zahl der Feldlinien durch Spule k und Bezugswert n₀ (Nordpol auf Spule 1), je Aufbau
const n0 = {};
export const linesInCoil = (k, phi = rotor.phi) => linienInSpule(k, phi, state.coils);
const linesMax = () => (n0[state.coils] ??= linienInSpule(0, COIL.THETA[0], state.coils));

// Flussdichte im Kern von Spule k in T (positiv: nach außen, vom Magneten weg)
export const coilField = (k, phi = rotor.phi) => state.lineModel
  ? B_MAX * linesInCoil(k, phi) / linesMax()
  : B_MAX * Math.cos(phi - COIL.THETA[k]);

// Änderung der Flussdichte in T/s: real dB/dt = −B_MAX · sin(φ − θ) · ω; im Feldlinienmodell aus der Änderung der
// Linienzahl beim Weiterdrehen
export function coilFieldRate(k, phi = rotor.phi, omega = rotor.omega) {
  if (!state.lineModel) return -B_MAX * Math.sin(phi - COIL.THETA[k]) * omega;
  if (omega === 0) return 0;
  const h = 1e-4;
  return (coilField(k, phi + h) - coilField(k, phi - h)) / (2 * h) * omega;
}

// Induktionsspannung an Spule k in V, U = φ(Anschluss A) − φ(Anschluss E) = −N · A · dB/dt.
// (A: Anfang, E: Ende der Wicklung. Welcher Anschluss Plus ist, hängt vom Wickelsinn ab; beide Spulen sind
// gleich gewickelt.)
export const coilVoltage = (k, phi = rotor.phi, omega = rotor.omega) => -TURNS * CORE_AREA * coilFieldRate(k, phi, omega);

// Spannung am Messgerät in V (Plus-Buchse an A von Spule 1).
// Eine Spule: U = U₁. Zwei Spulen in Reihe: Weil der Magnet Spule 2 seinen Südpol zuwendet, wenn er Spule 1 den
// Nordpol zuwendet, ist U₂ = −U₁. „Ende – Ende“ (E₁ mit E₂ verbunden, Minus-Buchse an A₂): U = U₁ − U₂ = 2 · U₁;
// „Ende – Anfang“ (E₁ mit A₂, Minus-Buchse an E₂): U = U₁ + U₂ = 0.
export function meterVoltage() {
  if (state.coils === 1) return coilVoltage(0);
  return coilVoltage(0) + (state.reversed ? 1 : -1) * coilVoltage(1);
}

// Frequenz der Wechselspannung in Hz: Bei einem Magneten mit einem Polpaar eine Schwingung je Umdrehung
export const frequency = () => Math.abs(rotor.omega) / TWO_PI;

// ---------------- Zeitschritt

function stepRotor(dt) {
  if (state.hold) {
    // Festgehalten: folgt Kurbel bzw. Regler und bleibt sonst stehen
    if (rotor.dragging) rotor.holdTarget = rotor.target;
    rotor.omega = clamp((rotor.holdTarget - rotor.phi) / CRANK_TIME, -CRANK_MAX_OMEGA, CRANK_MAX_OMEGA);
  } else if (state.drive === 'speed') {
    // Drehzahl-Regler: wie ein geregelter Antrieb, die Drehzahl stellt sich gleichmäßig ein
    rotor.omega += (TWO_PI * state.speed - rotor.omega) * Math.min(1, dt / SPEED_TIME);
  } else if (rotor.dragging) {
    // Kurbel: der Magnet folgt dem Finger
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
  const target = clamp(meterVoltage() / state.range, -METER.STOP, METER.STOP);
  needle.vel += (w0 * w0 * (target - needle.pos) - 2 * METER.DAMPING * w0 * needle.vel) * dt;
  needle.pos += needle.vel * dt;
  if (Math.abs(needle.pos) > METER.STOP) {
    needle.pos = Math.sign(needle.pos) * METER.STOP;
    needle.vel = -0.3 * needle.vel;
  }
}

// Ein Zeitschritt der Physik (dt in s, Simulationszeit)
export function stepPhysics(dt) {
  const SUBSTEPS = 8, h = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) {
    stepRotor(h);
    stepNeedle(h);
  }
  clock.t += dt;
}

// ---------------- Kurbel

// angle: Stellung des Magneten, die zum Punkt unter dem Finger gehört (siehe ziehen.js)
export function startCrank(angle) {
  rotor.dragging = true;
  rotor.target = rotor.phi;
  crankTo(angle);
}

// Kurbel auf den Winkel angle drehen; angle wird so gewählt, dass er dem bisherigen Ziel am nächsten liegt
// (die Kurbel kann beliebig viele Umdrehungen machen)
export function crankTo(angle) {
  rotor.target += Math.atan2(Math.sin(angle - rotor.target), Math.cos(angle - rotor.target));
}

// Loslassen; beim Festhalten bleibt der Magnet sofort stehen
export function endCrank() {
  rotor.dragging = false;
  if (state.hold) {
    rotor.holdTarget = rotor.phi;
    rotor.omega = 0;
  }
}

// Festhalten ein/aus: der Magnet bleibt, wo er gerade ist
export function setHold(on) {
  state.hold = on;
  rotor.holdTarget = rotor.phi;
  if (on) rotor.omega = 0;
}

// Festgehaltenen Magneten in die Stellung angle (rad) drehen – auf dem kürzeren Weg
export function holdTo(angle) {
  rotor.holdTarget = rotor.phi + Math.atan2(Math.sin(angle - rotor.phi), Math.cos(angle - rotor.phi));
}

export function resetPhysics() {
  Object.assign(rotor, { phi: 0, omega: 0, dragging: false, target: 0, holdTarget: 0 });
  Object.assign(needle, { pos: 0, vel: 0 });
  clock.t = 0;
}
