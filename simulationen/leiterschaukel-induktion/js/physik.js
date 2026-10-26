// ------------------------------------------------------------------
// Physik: Bewegung der Leiterschaukel, Induktionsspannung, Strom mit Bremskraft (Lenz) und Zeiger
// Ohne Darstellung und ohne Browser – lässt sich mit Node testen (tests/physik.test.mjs).
//
// Die Funktionen barVelocity(), relativeVelocity(), fieldAtBar() und emf() liefern alle Größen am Stab,
// die eine spätere mikroskopische Ansicht (Elektronen im Stab, Lorentzkraft auf die Elektronen) braucht.
// ------------------------------------------------------------------
import {
  SWING, MAGNET, B_FIELD, L_FIELD, G, PENDULUM_L, SWING_MASS, AIR_DAMPING, CIRCUIT_R, BRAKE_BOOST,
  EXPLAIN, LED, LAMP, MAGNET_TURN_SPEED, DRAG_TIME, DRAG_MAX_OMEGA, PUSH_ANGLE, PUSH_ANGLE_LONG, METER, MAGNET_DRAG_MAX_SPEED, magnetLegs, magnetZRange,
} from './config.js';
import { state } from './state.js';

const degToRad = deg => deg * Math.PI / 180;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Bewegte Teile: liegen im zentralen Zustand (state.js), hier unter kurzen Namen
export const { swing, magnetMotion, needle, lamp, electron } = state;

// ---------------- Geometrie

// Lage der Stabmitte relativ zur Ruhelage in cm
export function barOffset(theta = swing.theta) {
  return { y: SWING.LENGTH * (1 - Math.cos(theta)), z: SWING.LENGTH * Math.sin(theta) };
}

// Punkt (y, z) relativ zur Ruhelage des Stabs → Koordinaten des Magneten: u entlang der Schenkel, w quer zum
// Spalt (der Magnet ist um −α um die x-Achse gedreht, also hier um +α zurückdrehen, und um magnetZ verschoben)
export function toMagnetFrame({ y, z }, alphaDeg = state.magnetAngle, magnetZ = magnetMotion.z) {
  const a = degToRad(alphaDeg);
  z -= magnetZ;
  return { u: y * Math.sin(a) + z * Math.cos(a), w: y * Math.cos(a) - z * Math.sin(a) };
}

// Berührt der Stab (Querschnitt: Kreis) den Magneten? Schenkel als Rechtecke, Bogen als halber Kreisring.
export function collides(theta, alphaDeg, magnetZ = 0) {
  const { u, w } = toMagnetFrame(barOffset(theta), alphaDeg, magnetZ);
  const r = state.explain ? EXPLAIN.BAR_R : SWING.BAR_R, inner = MAGNET.GAP / 2, outer = inner + MAGNET.THICK;
  const { Z_IN, Z_OPEN } = magnetLegs(state.longMagnet);
  for (const sign of [1, -1]) {
    const du = Math.max(Z_IN - u, u - Z_OPEN, 0);
    const dw = Math.max(inner - sign * w, sign * w - outer, 0);
    if (du * du + dw * dw < r * r) return true;
  }
  if (u <= Z_IN) {
    const d = Math.hypot(u - Z_IN, w);
    if (d + r > inner && d - r < outer) return true;
  }
  return false;
}

// Bewegungsbereich der Schaukel [θmin, θmax] beim drehbaren Magneten mit Winkel α (abgetastet, zwischengespeichert)
const limitCache = new Map();
export function swingLimits(alphaDeg = state.magnetAngle) {
  const key = Math.round(alphaDeg * 10) + (state.longMagnet ? 10000 : 0) + (state.explain ? 20000 : 0);
  if (!limitCache.has(key)) {
    const step = degToRad(0.1), max = degToRad(SWING.MAX_ANGLE);
    const scan = sign => {
      let theta = 0;
      while (Math.abs(theta) < max && !collides(theta + sign * step, Math.round(alphaDeg * 10) / 10)) theta += sign * step;
      return theta;
    };
    limitCache.set(key, [scan(-1), scan(1)]);
  }
  return limitCache.get(key);
}

// ---------------- Feld, Geschwindigkeit, Spannung, Strom

// Anteil des Feldes am Ort des Stabs (1 im Polbereich und vor dem Bogen, Randfeld fällt linear ab)
export function fieldFactor(theta = swing.theta, alphaDeg = state.magnetAngle) {
  const { u, w } = toMagnetFrame(barOffset(theta), alphaDeg);
  const { Z_IN, Z_OPEN } = magnetLegs(state.longMagnet);
  const du = Math.max(Z_IN - MAGNET.GAP / 2 - u, u - Z_OPEN, 0);
  const dw = Math.max(Math.abs(w) - MAGNET.GAP / 2, 0);
  return Math.max(0, 1 - Math.hypot(du, dw) / MAGNET.FRINGE);
}

// Flussdichte am Stab in T (Vektor). Feld vom Nord- zum Südpol: bei Nordpol oben und α = 0° nach unten,
// beim Drehen kippt es in der y-z-Ebene: B = B · (0, −cos α, sin α).
export function fieldAtBar() {
  const a = degToRad(state.magnetAngle);
  const b = (state.northUp ? 1 : -1) * B_FIELD * fieldFactor();
  return { x: 0, y: -b * Math.cos(a), z: b * Math.sin(a) };
}

// Geschwindigkeit des Stabs in m/s (Vektor, tangential zur Kreisbahn)
export function barVelocity() {
  const v = PENDULUM_L * swing.omega;
  return { x: 0, y: v * Math.sin(swing.theta), z: v * Math.cos(swing.theta) };
}

// Geschwindigkeit des Stabs relativ zum Magneten in m/s – nur sie zählt für die Induktion
export function relativeVelocity() {
  const v = barVelocity();
  return { x: 0, y: v.y, z: v.z - magnetMotion.v };
}

// Induktionsspannung in V: U = l · (v × B) · x̂, positiv = rechtes Stabende (+x) ist Pluspol
export function emf() {
  const v = relativeVelocity(), B = fieldAtBar();
  return L_FIELD * (v.y * B.z - v.z * B.y);
}

// Lorentzkraft auf das Elektron pro Elementarladung in V/m (Vektor): F/e = −(v × B), v relativ zum Magneten
export function electronForce() {
  const v = relativeVelocity(), B = fieldAtBar();
  return {
    x: -(v.y * B.z - v.z * B.y),
    y: -(v.z * B.x - v.x * B.z),
    z: -(v.x * B.y - v.y * B.x),
  };
}

// Stromstärke in A (in x-Richtung durch den Stab); nur bei Strommessung mit dem Messgerät
// (bei Spannungsmessung fließt praktisch kein Strom, die LED-Anzeige ist ein Gedankenexperiment ohne Rückwirkung)
export const inducedCurrent = () => (state.display === 'meter' && state.meterMode === 'I' ? emf() / CIRCUIT_R : 0);

// Vorzeichen am Messgerät bzw. an der LED: +1, wenn das rote Kabel (rechtes Stabende) in der Plus-Buchse
// bzw. an der Anode steckt, −1 bei vertauschten Kabeln
const cableSign = () => (state.cablesSwapped ? -1 : 1);

// Helligkeit der LED (0 … 1): erst oberhalb der Schwellspannung, nur in Durchlassrichtung (Anode positiv)
export const ledBrightness = () => clamp((cableSign() * emf() - LED.THRESHOLD) / LED.FULL, 0, 1);

// Helligkeit der Glühlampe (0 … 1): sichtbares Glühen ab der Schwelle, unabhängig von der Stromrichtung
export function lampGlow() {
  const start = (LAMP.THRESHOLD / LAMP.FULL) ** 2;
  return clamp((lamp.heat - start) / (1 - start), 0, 1);
}

// Glühdraht folgt der Leistung ∝ U² mit kurzer Verzögerung (Aufheizen und Nachglühen)
function stepLamp(dt) {
  const power = Math.min((emf() / LAMP.FULL) ** 2, 1.5);
  lamp.heat += (power - lamp.heat) * Math.min(1, dt / LAMP.HEAT_TIME);
}

// Anzeige des Messgeräts in mV bzw. mA
export const meterReading = () => 1000 * cableSign() * (state.meterMode === 'I' ? inducedCurrent() : emf());

// Kraft auf den stromdurchflossenen Stab, Anteil entlang der Bahn in N: F = I · l · (x̂ × B)
// (immer gegen die Bewegung gerichtet – Lenz'sche Regel)
export function brakeForce() {
  const B = fieldAtBar();
  const f = inducedCurrent() * L_FIELD * (state.brakeBoost ? BRAKE_BOOST : 1);
  const fy = -f * B.z, fz = f * B.y;
  return fy * Math.sin(swing.theta) + fz * Math.cos(swing.theta);
}

// ---------------- Zeitschritt

function stepSwing(dt) {
  if (state.hold) {
    // Festgehalten: folgt dem Finger bzw. Regler direkt (wie beim Ziehen) und bleibt am Ziel stehen
    if (swing.dragging) swing.holdTarget = swing.target;
    swing.omega = clamp((swing.holdTarget - swing.theta) / DRAG_TIME, -DRAG_MAX_OMEGA, DRAG_MAX_OMEGA);
  } else if (swing.dragging) {
    swing.omega = clamp((swing.target - swing.theta) / DRAG_TIME, -DRAG_MAX_OMEGA, DRAG_MAX_OMEGA);
  } else {
    const acc = -G / PENDULUM_L * Math.sin(swing.theta) - AIR_DAMPING * swing.omega
      + brakeForce() / (SWING_MASS * PENDULUM_L);
    swing.omega += acc * dt;
  }
  if (state.setup === 'tisch') {
    moveSwingTo(swing.theta + swing.omega * dt);
    return;
  }
  swing.theta += swing.omega * dt;
  // Anschlag am Magneten (bzw. größte Auslenkung): kaum Rückprall
  const [lo, hi] = swingLimits();
  if (swing.theta < lo || swing.theta > hi) {
    swing.theta = clamp(swing.theta, lo, hi);
    swing.omega = swing.dragging || state.hold ? 0 : -0.2 * swing.omega;
    if (state.hold) swing.holdTarget = swing.theta;
  }
}

// Magnet auf dem Tisch: Schaukel bis zur Berührung mit dem Magneten bzw. zur größten Auslenkung bewegen
function moveSwingTo(theta) {
  const max = degToRad(SWING.MAX_ANGLE);
  const blocked = t => Math.abs(t) > max || collides(t, 0, magnetMotion.z);
  if (!blocked(theta)) {
    swing.theta = theta;
    return;
  }
  // Berührpunkt zwischen alter (freier) und neuer Lage suchen
  let free = swing.theta, hit = theta;
  for (let i = 0; i < 20; i++) {
    const mid = (free + hit) / 2;
    if (blocked(mid)) hit = mid; else free = mid;
  }
  swing.theta = free;
  swing.omega = swing.dragging || state.hold ? 0 : -0.2 * swing.omega;
  if (state.hold) swing.holdTarget = swing.theta;
}

// Magnet auf dem Tisch ziehen. Stößt er an den Stab, schiebt er die Schaukel vor sich her;
// geht das nicht weiter (größte Auslenkung), bleibt er stehen.
function stepMagnet(dt) {
  if (!magnetMotion.dragging) {
    magnetMotion.v = 0;
    return;
  }
  const maxStep = MAGNET_DRAG_MAX_SPEED * 100 * dt;
  const step = clamp((magnetMotion.target - magnetMotion.z) * dt / DRAG_TIME, -maxStep, maxStep);
  const z = clamp(magnetMotion.z + step, ...magnetZRange(state.longMagnet));
  if (collides(swing.theta, 0, z)) {
    const max = degToRad(SWING.MAX_ANGLE), dir = Math.sign(step), dTheta = degToRad(0.05);
    let theta = swing.theta;
    do theta += dir * dTheta; while (Math.abs(theta) <= max && collides(theta, 0, z));
    if (Math.abs(theta) > max) {
      magnetMotion.v = 0;
      return;
    }
    // Die Schaukel bewegt sich mit dem Magneten mit
    swing.theta = swing.holdTarget = theta;
    swing.omega = (z - magnetMotion.z) / 100 / dt / (PENDULUM_L * Math.cos(theta));
  }
  magnetMotion.v = (z - magnetMotion.z) / 100 / dt;
  magnetMotion.z = z;
}

// Zeiger: gedämpfter Schwinger, der dem Messwert folgt; Anschläge knapp hinter dem Skalenende
function stepNeedle(dt) {
  const w0 = 2 * Math.PI * METER.FREQ;
  const target = clamp(meterReading() / state.range, -METER.STOP, METER.STOP);
  needle.vel += (w0 * w0 * (target - needle.pos) - 2 * METER.DAMPING * w0 * needle.vel) * dt;
  needle.pos += needle.vel * dt;
  if (Math.abs(needle.pos) > METER.STOP) {
    needle.pos = Math.sign(needle.pos) * METER.STOP;
    needle.vel = -0.3 * needle.vel;
  }
}

// ---------------- Viele Elektronen

const electronEnd = () => SWING.BAR_LEN / 2 - EXPLAIN.ELECTRON_MARGIN;   // so weit dürfen Elektronen nach außen

// Ruhelagen der Elektronen (zugleich Plätze der positiven Atomrümpfe), symmetrisch um die Mitte
export function electronRestPositions() {
  const { COUNT, SPACING } = EXPLAIN.MANY;
  return Array.from({ length: COUNT }, (_, i) => (i - (COUNT - 1) / 2) * SPACING);
}

// Größte gemeinsame Verschiebung: dann liegen alle Elektronen dicht gepackt am Stabende
export function manyDriftLimit() {
  const rest = electronRestPositions();
  return electronEnd() - (rest.length - 1) * EXPLAIN.MANY.PACK - rest[0];
}

// Lagen aller Elektronen bei der gemeinsamen Verschiebung d: jedes Elektron um d verschoben, am Stabende
// drängen sie sich mit Mindestabstand zusammen (Reihenfolge bleibt erhalten)
export function electronPositions(d = electron.x) {
  const rest = electronRestPositions(), end = electronEnd(), gap = EXPLAIN.MANY.PACK;
  const p = rest.map(x => x + d);
  for (let i = 0; i < p.length; i++) p[i] = Math.max(p[i], i === 0 ? -end : p[i - 1] + gap);
  for (let i = p.length - 1; i >= 0; i--) p[i] = Math.min(p[i], i === p.length - 1 ? end : p[i + 1] - gap);
  return p;
}
export const highlightedElectron = () => Math.floor(EXPLAIN.MANY.COUNT / 2);   // das mittlere

// Erklärmodus: Elektron(en) wandern entlang des Stabs, solange die Lorentzkraft wirkt (bleiben am Ende stehen)
function stepElectron(dt) {
  if (!state.explain) return;
  const max = state.manyElectrons ? manyDriftLimit() : electronEnd();
  electron.x = clamp(electron.x + EXPLAIN.DRIFT * electronForce().x * dt, -max, max);
}

// Magnet dreht sich gleichmäßig zum eingestellten Winkel und schiebt die Schaukel ggf. vor sich her
function turnMagnet(dt) {
  const diff = state.angle - state.magnetAngle;
  if (diff === 0) return;
  state.magnetAngle += Math.sign(diff) * Math.min(Math.abs(diff), MAGNET_TURN_SPEED * dt);
  const [lo, hi] = swingLimits();
  if (swing.theta < lo || swing.theta > hi) {
    swing.theta = clamp(swing.theta, lo, hi);
    swing.omega = 0;
  }
}

// Ein Zeitschritt der gesamten Physik (dt in s)
export function stepPhysics(dt) {
  const SUBSTEPS = 8;
  const h = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) {
    stepMagnet(h);
    turnMagnet(h);
    stepSwing(h);
    stepNeedle(h);
    stepLamp(h);
    stepElectron(h);
  }
}

// ---------------- Bedienung

export function startDrag(theta) {
  swing.dragging = true;
  dragTo(theta);
}
export function dragTo(theta) {
  const max = degToRad(SWING.MAX_ANGLE);
  swing.target = clamp(theta, -max, max);
}
// Loslassen; beim Festhalten bleibt der Leiter sofort stehen
export function endDrag() {
  swing.dragging = false;
  swing.holdTarget = swing.theta;
  if (state.hold) swing.omega = 0;
}


// Festhalten ein/aus: der Leiter bleibt, wo er gerade ist
export function setHold(on) {
  state.hold = on;
  swing.holdTarget = swing.theta;
  if (on) swing.omega = 0;
}

// Festgehaltenen Leiter (Schieberegler) zur Lage theta bewegen
export function holdTo(theta) {
  const max = degToRad(SWING.MAX_ANGLE);
  swing.holdTarget = clamp(theta, -max, max);
}

export function startMagnetDrag(z) {
  magnetMotion.dragging = true;
  dragMagnetTo(z);
}
export function dragMagnetTo(z) {
  magnetMotion.target = clamp(z, ...magnetZRange(state.longMagnet));
}
export function endMagnetDrag() {
  magnetMotion.dragging = false;
}

const pushAngle = () => (state.longMagnet ? PUSH_ANGLE_LONG : PUSH_ANGLE);

export function resetElectron() {
  electron.x = 0;
}

// Schaukel nach vorne auslenken und ruhig loslassen (nur so weit, wie der Magnet es zulässt);
// das Elektron startet wieder in der Mitte
export function pushSwing() {
  resetElectron();
  swing.dragging = false;
  swing.omega = 0;
  if (state.setup === 'drehbar') {
    swing.theta = swing.holdTarget = Math.min(degToRad(pushAngle()), swingLimits()[1]);
    return;
  }
  let theta = restingTheta();
  const step = degToRad(0.1);
  while (theta + step <= degToRad(pushAngle()) && !collides(theta + step, 0, magnetMotion.z)) theta += step;
  swing.theta = swing.holdTarget = theta;
}

// Ruhelage der Schaukel: senkrecht, oder – wenn dort der Magnet im Weg ist – an ihn angelehnt
function restingTheta() {
  const step = degToRad(0.05), max = degToRad(SWING.MAX_ANGLE);
  for (let theta = 0; theta <= max; theta += step) {
    if (!collides(theta, 0, magnetMotion.z)) return theta;
    if (!collides(-theta, 0, magnetMotion.z)) return -theta;
  }
  return 0;
}

// Schaukel anhalten; der Zeiger springt sofort auf 0
export function stopSwing() {
  Object.assign(swing, { theta: 0, omega: 0, dragging: false, target: 0 });
  if (state.setup === 'tisch') swing.theta = restingTheta();
  swing.holdTarget = swing.theta;
  Object.assign(needle, { pos: 0, vel: 0 });
}

export function resetMagnet() {
  Object.assign(magnetMotion, { z: 0, v: 0, dragging: false, target: 0 });
}

export function resetPhysics() {
  stopSwing();
  resetMagnet();
  resetElectron();
  Object.assign(needle, { pos: 0, vel: 0 });
  lamp.heat = 0;
}
