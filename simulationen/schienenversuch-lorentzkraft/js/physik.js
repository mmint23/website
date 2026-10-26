// ------------------------------------------------------------------
// Physik: Lorentzkraft, Bewegung der Stange und Kraftmesser („Hau den Lukas“)
// Ohne Darstellung und ohne Browser – lässt sich mit Node testen (tests/physik.test.mjs).
// ------------------------------------------------------------------
import {
  BAR_MASS, ROLL_FACTOR, ROLL_DECEL, FRINGE, BOUNCE, BAR_START_X, LUKAS, MAGNET_TURN_SPEED, barLimits,
} from './config.js';
import { state, currentSetup } from './state.js';

const degToRad = deg => deg * Math.PI / 180;

export const barMotion = { x: BAR_START_X, v: 0 };   // x in cm, v in m/s
// Stoppuhr: startet, wenn sich die Stange aus der Ruhe bewegt, stoppt am Anschlag oder beim Liegenbleiben
export const stopwatch = { state: 'idle', t: 0 };    // idle | running | done
// Schieber der beiden Kraftmesser (links, rechts): Höhe h in cm, Geschwindigkeit v in cm/s, größte Höhe max
export const lukasMotion = [{ h: 0, v: 0, max: 0 }, { h: 0, v: 0, max: 0 }];
const impacts = [];                                  // Aufpralle am Anschlag: { side: 0 links / 1 rechts, speed in m/s }

// Anteil des Feldes am Ort x (1 zwischen den Polen, Randfeld fällt linear ab)
export function fieldFactor(x) {
  const setup = currentSetup();
  const outside = Math.max(setup.fieldXMin - x, x - setup.fieldXMax, 0);
  return Math.max(0, 1 - outside / FRINGE);
}

// eingestellte Flussdichte zwischen den Polen in T
export const fieldStrength = () => currentSetup().bField * state.fieldScale;

// Betrag der Lorentzkraft zwischen den Polen in N: F = I · l · B · sin α
export function lorentzForceMagnitude() {
  const setup = currentSetup();
  const current = state.powerOn ? state.current : 0;
  return current * setup.lInField * fieldStrength() * Math.sin(degToRad(state.magnetAngle));
}

// Kraft in x-Richtung (entlang der Schienen), F = I · L × B
export function lorentzForceX(x) {
  // Strom in der Stange fließt von der Plus- zur Minus-Schiene: Richtung −z bei Polung +1
  // Feld zeigt vom Nord- zum Südpol: bei Nordpol oben und α = 90° Richtung −y.
  // Beim Drehen kippt das Feld in der y-z-Ebene: B = (0, −sin α, −cos α) (α = 90° … 180°).
  // (−z) × B hat nur eine x-Komponente: Fx = −Polung · Feldorientierung · I · L · B · sin α
  // (Im Grundversuch ist α immer 90°.)
  const fieldSign = state.northUp ? 1 : -1;
  return -state.polarity * fieldSign * lorentzForceMagnitude() * fieldFactor(x);
}

function stepBar(dt) {
  const drive = lorentzForceX(barMotion.x) / (ROLL_FACTOR * BAR_MASS);
  const decel = state.friction ? ROLL_DECEL : 0;
  let v = barMotion.v;
  if (v === 0 && (drive === 0 || Math.abs(drive) <= decel)) {   // Haftreibung: Stange bleibt liegen
    if (stopwatch.state === 'running') stopwatch.state = 'done';
    return;
  }
  if (stopwatch.state === 'idle') stopwatch.state = 'running';
  if (stopwatch.state === 'running') stopwatch.t += dt;
  const direction = v !== 0 ? Math.sign(v) : Math.sign(drive);
  v += (drive - direction * decel) * dt;
  // Rollreibung kann die Stange nur anhalten, nicht umkehren
  if (Math.sign(v) !== direction && Math.abs(drive) <= decel) v = 0;

  const [xMin, xMax] = barLimits(currentSetup());
  let x = barMotion.x + v * 100 * dt;
  if (x < xMin || x > xMax) {
    impacts.push({ side: x < xMin ? 0 : 1, speed: Math.abs(v) });
    x = Math.min(Math.max(x, xMin), xMax);
    v = -v * BOUNCE;
    if (stopwatch.state === 'running') stopwatch.state = 'done';
    if (Math.abs(v) < 0.02) v = 0;          // kein endloses Nachzittern am Anschlag
  }
  barMotion.x = x;
  barMotion.v = v;
}

// Aufprall: Schieber bekommt so viel Schwung, dass er (aus der Ruhe) bis h = Verstärkung · v² steigt
function kickLukas(lukas, speed) {
  if (speed < LUKAS.MIN_SPEED) return;
  const h = Math.min(currentSetup().lukasGain * speed ** 2, LUKAS.HEIGHT);
  lukas.v = Math.max(lukas.v, Math.sqrt(2 * LUKAS.GRAVITY * h));
}

function stepLukas(lukas, dt) {
  if (lukas.h <= 0 && lukas.v <= 0) return;
  lukas.v -= LUKAS.GRAVITY * dt;
  lukas.h += lukas.v * dt;
  if (lukas.h >= LUKAS.HEIGHT) {             // an die Glocke geschlagen
    lukas.h = LUKAS.HEIGHT;
    lukas.v = -Math.abs(lukas.v) * 0.3;
  }
  if (lukas.h <= 0) {
    lukas.h = 0;
    lukas.v = 0;
  }
  lukas.max = Math.max(lukas.max, lukas.h);
}

// Magnet dreht sich mit gleichmäßiger Geschwindigkeit zum eingestellten Winkel
function turnMagnet(dt) {
  const diff = state.angle - state.magnetAngle;
  if (diff === 0) return;
  state.magnetAngle += Math.sign(diff) * Math.min(Math.abs(diff), MAGNET_TURN_SPEED * dt);
}

// Ein Zeitschritt der gesamten Physik (dt in s)
export function stepPhysics(dt) {
  const SUBSTEPS = 4;
  turnMagnet(dt);
  for (let i = 0; i < SUBSTEPS; i++) stepBar(dt / SUBSTEPS);
  for (const impact of impacts.splice(0)) kickLukas(lukasMotion[impact.side], impact.speed);
  for (const lukas of lukasMotion) stepLukas(lukas, dt);
}

// Stange in die Ausgangslage, Stoppuhr und Kraftmesser zurücksetzen
export function resetMotion() {
  barMotion.x = BAR_START_X;
  barMotion.v = 0;
  Object.assign(stopwatch, { state: 'idle', t: 0 });
  impacts.length = 0;
  for (const lukas of lukasMotion) Object.assign(lukas, { h: 0, v: 0, max: 0 });
}
