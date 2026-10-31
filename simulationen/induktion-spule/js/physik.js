// ------------------------------------------------------------------
// Physik: magnetischer Fluss durch die Spule und Induktionsspannung U = −N · dΦ/dt
//
// Feldmodell: Der Stabmagnet ist eine Kette von DIPOLES gleichen magnetischen Dipolen entlang seiner Achse
// (gesamtes Moment m = B · A · L / μ₀). Der Fluss durch eine Windung ist das Linienintegral des Vektorpotentials
// um die Windung, Φ = ∮ A · dl mit A = μ₀/(4π) · m × r / r³. Das gilt für jede Lage und Drehung von Magnet und
// Spule, und Φ ändert sich stetig – auch wenn der Magnet durch die Spule geht (die Dipole kommen dem Draht nie
// nahe, weil der Magnet die Wicklung nicht durchdringen kann, siehe collides). Die Spule zählt als LOOPS
// gleichmäßig verteilte Windungen, jede als Vieleck mit SEGMENTS Seiten – die Leiterschleife (Windungszahl 1) als
// eine einzige Windung in ihrer Mitte.
//
// Zweiter Magnet (state.secondMagnet): Der Fluss beider Magnete durch die Spule wird addiert (im echten Modell
// genau so, im Feldlinienmodell als Summe der Linien beider Magnete). Die Magnete durchdringen sich nicht.
//
// Magnet und Spule folgen beim Ziehen dem Finger (FOLLOW_TIME) bzw. beim Drehen dem Regler (TURN_TIME) und
// bleiben beim Loslassen stehen. Ein Schritt, der den Magneten in die Wicklung schieben würde, wird nicht gemacht.
// Messgeräte zeigen nur etwas, wenn die Stecker in den passenden Buchsen stecken (connection).
//
// Feldlinienmodell (state.lineModel, nur für den Unterricht): Statt des echten Flusses zählt, wie viel der
// gezeigten Feldlinien im Spuleninneren liegt (linienInSpule) – mal einem Faktor, der beim Magneten mittendrin
// denselben Fluss ergibt. Spannung gibt es dann genau, wenn sich Anzahl oder Verlauf dieser Linien ändert.
// Das Modell ist für einen qualitativen Versuch gedacht; die Größenordnungen passen zu einem Schulversuch.
// ------------------------------------------------------------------
import {
  MAGNET, MAGNET_AREA, DIPOLES, STRENGTHS, COIL, TURNS, LOOP, X_MIN, X_MAX, Y_MIN, Y_MAX, Y_SNAP, FOLLOW_TIME, TURN_TIME,
  START, METER, MULTIMETER, QUAL,
} from './config.js';
import { state } from './state.js';
import { linienInSpule } from './feldlinienModell.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const TWO_PI = 2 * Math.PI;

// Lage (x, y der Mitte in cm), Drehwinkel in rad (gegen den Uhrzeigersinn, in der Bildebene), Ziele beim Ziehen
// bzw. Drehen. Magnet bei 0: Nordpol rechts (bzw. links, wenn umgedreht); Spule bei 0: Achse waagrecht.
const startLage = name => ({ x: START[name], target: START[name], y: 0, yTarget: 0, angle: 0, angleTarget: 0, dragging: false });
export const bodies = { magnet: startLage('magnet'), coil: startLage('coil'), magnet2: startLage('magnet2') };
// Magnete, die gerade da sind
export const magnete = () => (state.secondMagnet ? ['magnet', 'magnet2'] : ['magnet']);
export const needle = { pos: 0, vel: 0 };
export const clock = { t: 0 };
export const multimeter = { reading: null, next: 0 };   // angezeigter Wert (null: aus), Zeit des nächsten Messwerts
const history = [];                                     // { t, u } für den Mittelwert des Multimeters
let voltage = 0;                                        // Spannung an der Spule in V (letzter Zeitschritt)
let flux = 0;                                           // Fluss je Windung in Wb
let linkage = null;                                     // Flussverkettung N · Φ im letzten Zeitschritt
let fluxKey = null;                                     // Lagen und Einstellungen, für die flux gilt

// ---------------- Feld

// Lagen der gerechneten Windungen entlang der Spulenachse (cm von der Mitte): bei der Leiterschleife nur die Mitte
const windungen = loop => (loop ? [0] : Array.from({ length: COIL.LOOPS }, (_, i) => COIL.LENGTH * ((i + 0.5) / COIL.LOOPS - 0.5)));

// Fluss durch eine Windung der Spule (Mittelwert über die Windungen) in Wb, positiv in Richtung der Spulenachse.
// magnet: { x, y, angle, north (+1: Nordpol bei Winkel 0 rechts, −1: links), B (T) };
// coil: { x, y, angle, loop (true: einzelne Leiterschleife) }
export function fluxPerTurn(magnet, coil) {
  const { x: mx, y: my = 0, angle: ma, north, B } = magnet;
  const ux = north * Math.cos(ma), uy = north * Math.sin(ma);     // Richtung Süd → Nord
  const cx = Math.cos(coil.angle), cy = Math.sin(coil.angle);     // Achse der Spule
  // μ₀ · m / (4π) je Dipol in T·m³; Abstände unten in cm, daher · 100 für 1/m
  const pro = B * MAGNET_AREA * MAGNET.LENGTH / 100 / DIPOLES / (4 * Math.PI) * 100;
  const dx = [], dy = [];
  for (let k = 0; k < DIPOLES; k++) {
    const s = MAGNET.LENGTH * ((k + 0.5) / DIPOLES - 0.5);
    dx.push(mx + ux * s);
    dy.push(my + uy * s);
  }
  const R = COIL.R_WIND, dphi = TWO_PI / COIL.SEGMENTS;
  const lagen = windungen(coil.loop);
  let summe = 0;
  for (const t of lagen) {
    const ox = coil.x + cx * t, oy = (coil.y ?? 0) + cy * t;
    for (let j = 0; j < COIL.SEGMENTS; j++) {
      // Punkt auf der Windung: Mitte + R (e₁ cos φ + e₂ sin φ) mit e₁ = (−cy, cx, 0), e₂ = (0, 0, 1)
      const phi = (j + 0.5) * dphi, c = Math.cos(phi), s = Math.sin(phi);
      const px = ox - cy * R * c, py = oy + cx * R * c, pz = R * s;
      const lx = cy * s * R * dphi, ly = -cx * s * R * dphi, lz = c * R * dphi;   // dl
      for (let k = 0; k < DIPOLES; k++) {
        const rx = px - dx[k], ry = py - dy[k], rz = pz;
        const r2 = rx * rx + ry * ry + rz * rz;
        // (u × r) · dl / r³
        summe += ((uy * rz) * lx - (ux * rz) * ly + (ux * ry - uy * rx) * lz) / (r2 * Math.sqrt(r2));
      }
    }
  }
  return pro * summe / lagen.length;
}

const magnetPose = (name = 'magnet') => ({
  x: bodies[name].x, y: bodies[name].y, angle: bodies[name].angle,
  north: (name === 'magnet' ? state.northRight : state.northRight2) ? 1 : -1, B: STRENGTHS[state.strength].B,
});
const coilPose = () => ({ x: bodies.coil.x, y: bodies.coil.y, angle: bodies.coil.angle, loop: Boolean(TURNS[state.turns].loop) });

// Feldlinienmodell: Fluss je Windung aus den gezeigten Feldlinien. Faktor (Fluss je Feldlinie) je Stärke und
// Spulenart so, dass der Magnet mittendrin denselben Fluss ergibt wie im echten Modell.
const faktoren = {};
function flussJeLinie(staerke, loop) {
  const schluessel = `${staerke} ${loop}`;
  if (faktoren[schluessel] === undefined) {
    const mitte = { x: 0, y: 0, angle: 0, north: 1, B: STRENGTHS[staerke].B };
    const spule = { x: 0, y: 0, angle: 0, loop };
    faktoren[schluessel] = fluxPerTurn(mitte, spule) / linienInSpule(mitte, spule, staerke);
  }
  return faktoren[schluessel];
}
export function fluxFromLines(magnet, coil, staerke) {
  return flussJeLinie(staerke, Boolean(coil.loop)) * linienInSpule(magnet, coil, staerke);
}

// Mittlere Flussdichte im Spuleninneren in T (Fluss je Windung durch die Windungsfläche), positiv entlang der Achse
export const coilField = () => flux / (Math.PI * (COIL.R_WIND / 100) ** 2);
export const coilFlux = () => flux;

// Spannung an den Anschlüssen der Spule in V: U = φ(A) − φ(E) = −N · dΦ/dt
export const coilVoltage = () => voltage;

// ---------------- Magnet in der Wicklung? (Magnet als Quader, Spule als Rohr mit Bohrung und Flanschen bzw.
// Leiterschleife als Drahtring mit den beiden Zuleitungen nach oben)

const LAENGS = 41;

// Punkt (relativ zur Spulenmitte: along entlang der Achse, quer in der Bildebene, z) im Körper der Spule?
function imSpulenkoerper(along, quer, z, loop) {
  const rho = Math.hypot(quer, z);
  if (!loop) return Math.abs(along) <= COIL.LENGTH / 2 + COIL.FLANGE_X && rho >= COIL.R_INNER - 0.02 && rho <= COIL.R_FLANGE + 0.02;
  const draht = TURNS[1].wire + 0.05;
  if (Math.abs(along) > LOOP.TERMINAL_X + 0.6) return false;
  if (Math.abs(along) <= draht && Math.abs(rho - COIL.R_WIND) <= draht) return true;          // Ring
  return quer >= COIL.R_WIND - draht && quer <= LOOP.TERMINAL_Y + 0.5 && Math.abs(z) <= 0.5;  // Zuleitungen, Anschlüsse
}

// Zwei Magnete überlappen sich? (Rechtecke in der Bildebene, Trennachsen-Test)
export function magnetsCollide(a, b) {
  const ecken = m => {
    const ux = Math.cos(m.angle), uy = Math.sin(m.angle), l = MAGNET.LENGTH / 2, w = MAGNET.WIDTH / 2;
    return [[l, w], [l, -w], [-l, w], [-l, -w]].map(([s, t]) => [m.x + ux * s - uy * t, (m.y ?? 0) + uy * s + ux * t]);
  };
  const pa = ecken(a), pb = ecken(b);
  for (const m of [a, b]) {
    for (const [ax, ay] of [[Math.cos(m.angle), Math.sin(m.angle)], [-Math.sin(m.angle), Math.cos(m.angle)]]) {
      const proj = ps => ps.map(([x, y]) => x * ax + y * ay);
      const [qa, qb] = [proj(pa), proj(pb)];
      if (Math.max(...qa) < Math.min(...qb) || Math.max(...qb) < Math.min(...qa)) return false;
    }
  }
  return true;
}

export function collides(magnet, coil) {
  const ux = Math.cos(magnet.angle), uy = Math.sin(magnet.angle);    // Achse des Magneten
  const vx = -uy, vy = ux;                                           // quer dazu in der Bildebene
  const cx = Math.cos(coil.angle), cy = Math.sin(coil.angle);
  const h = MAGNET.WIDTH / 2, dy = (magnet.y ?? 0) - (coil.y ?? 0);
  for (const [a, b] of [[h, h], [h, -h], [-h, h], [-h, -h], [h, 0], [-h, 0], [0, h], [0, -h]]) {
    for (let i = 0; i < LAENGS; i++) {
      const s = MAGNET.LENGTH * (i / (LAENGS - 1) - 0.5);
      const px = magnet.x + ux * s + vx * a - coil.x, py = dy + uy * s + vy * a;
      if (imSpulenkoerper(px * cx + py * cy, py * cx - px * cy, b, coil.loop)) return true;
    }
  }
  return false;
}

// ---------------- Ziehen und Drehen

// Ziehen nach x (und y, wenn state.freeMove; sonst bleibt die Höhe). Nahe der gemeinsamen Achse rastet y auf 0 ein.
export function startDrag(name, x, y) {
  bodies[name].dragging = true;
  dragTo(name, x, y);
}
export function dragTo(name, x, y) {
  const body = bodies[name];
  body.target = clamp(x, X_MIN, X_MAX);
  if (state.freeMove && y !== undefined) body.yTarget = Math.abs(y) < Y_SNAP ? 0 : clamp(y, Y_MIN, Y_MAX);
}
export function endDrag(name) {
  const body = bodies[name];
  body.dragging = false;
  body.target = body.x;   // bleibt stehen, wo er gerade ist
  body.yTarget = body.y;
}
export function turnTo(name, angle) {
  bodies[name].angleTarget = angle;
}

// Fluss springt, ohne dass etwas bewegt wurde (Magnet umgedreht, Stärke oder Windungszahl geändert):
// kein Spannungsstoß in der Rechnung
export const fluxChanged = () => { linkage = null; };

// Zweiten Magneten dazustellen: an seinen Startplatz rechts der Spule – ist dort kein Platz, darüber oder darunter
export function zweitenMagnetenSetzen() {
  for (const [x, y] of [[START.magnet2, 0], [START.magnet2, 7], [START.magnet2, -7], [X_MIN + 6, 7], [X_MIN + 6, -7], [0, 8]]) {
    Object.assign(bodies.magnet2, startLage('magnet2'), { x, target: x, y, yTarget: y });
    if (!stoesst('magnet2')) return;
  }
}

export function resetPhysics() {
  for (const [name, body] of Object.entries(bodies)) Object.assign(body, startLage(name));
  Object.assign(needle, { pos: 0, vel: 0 });
  Object.assign(multimeter, { reading: null, next: 0 });
  history.length = 0;
  clock.t = 0;
  voltage = 0;
  linkage = null;
  fluxKey = null;
}

// ---------------- Messgeräte

// Stecken die Stecker in den Buchsen plus und minus? +1: rot an plus, schwarz an minus; −1: vertauscht; 0: nein
export function connection(plus, minus) {
  const { red, black } = state.plugs;
  if (red === plus && black === minus) return 1;
  if (red === minus && black === plus) return -1;
  return 0;
}

// Wert mit der Polung des Anschlusses (0, wenn nicht angeschlossen – auch nicht −0)
const gepolt = (polung, wert) => (polung === 0 ? 0 : polung * wert);

// Spannung, die das Zeigermessgerät (mit oder ohne Skala) sieht (0, wenn nicht richtig angeschlossen)
export const pointerVoltage = () => (state.meter === 'pointer' || state.meter === 'qual' ? gepolt(connection('plus', 'minus'), voltage) : 0);

// Zeigerausschlag als Anteil des Vollausschlags: mit Skala proportional zum Messbereich, ohne Skala logarithmisch
export function needleTarget() {
  const u = pointerVoltage();
  if (state.meter === 'qual') return Math.sign(u) * Math.log1p(Math.abs(u) / QUAL.U0) / Math.log1p(QUAL.U_FULL / QUAL.U0);
  return u / state.range;
}

// Messwert des Multimeters je Schalterstellung aus den Spannungen der letzten AVERAGE Sekunden
function multiReading() {
  const mode = state.multiMode;
  if (state.meter !== 'multi' || mode === 'off') return mode === 'off' ? null : 0;
  const mittel = history.reduce((s, h) => s + h.u, 0) / history.length;
  const R = TURNS[state.turns].R;
  if (mode === 'vdc') return gepolt(connection('v', 'com'), mittel);
  if (mode === 'vac') return connection('v', 'com') !== 0 ? Math.sqrt(history.reduce((s, h) => s + h.u * h.u, 0) / history.length) : 0;
  if (mode === 'ma') return gepolt(connection('ma', 'com'), mittel / (R + MULTIMETER.SHUNT_MA) * 1000);
  return gepolt(connection('a', 'com'), mittel / (R + MULTIMETER.SHUNT_A));
}
// Schalter gedreht oder Stecker umgesteckt: gleich einen neuen Messwert
export const multimeterRefresh = () => { multimeter.next = clock.t; };

// ---------------- Zeitschritt

// Ein Schritt in die Wicklung wird nicht gemacht; beim schrägen Ziehen gleitet das Teil dann an der Spule entlang
// (nur der Anteil in x bzw. nur der in y)
// Stößt body (Name) in seiner jetzigen Lage an ein anderes Teil? (Magnet–Spule und Magnet–Magnet)
function stoesst(name) {
  const loop = Boolean(TURNS[state.turns].loop);
  const spule = { ...bodies.coil, loop };
  if (name === 'coil') return magnete().some(m => collides(bodies[m], spule));
  return collides(bodies[name], spule) || magnete().some(m => m !== name && magnetsCollide(bodies[name], bodies[m]));
}

function stepBodies(h) {
  for (const name of [...magnete(), 'coil']) {
    const body = bodies[name];
    const vorher = { x: body.x, y: body.y, angle: body.angle };
    const folgen = Math.min(1, h / FOLLOW_TIME);
    let x = body.x + (body.target - body.x) * folgen;
    let y = body.y + (body.yTarget - body.y) * folgen;
    let angle = body.angle + (body.angleTarget - body.angle) * Math.min(1, h / TURN_TIME);
    if (Math.abs(body.target - x) < 1e-4) x = body.target;
    if (Math.abs(body.yTarget - y) < 1e-4) y = body.yTarget;
    if (Math.abs(body.angleTarget - angle) < 1e-5) angle = body.angleTarget;
    const frei = probe => {
      Object.assign(body, probe);
      return !stoesst(name);
    };
    // steckt schon fest (Spule gewechselt, während der Magnet schräg in der Leiterschleife war): frei bewegen lassen
    if (!frei(vorher)) {
      Object.assign(body, { x, y, angle });
      continue;
    }
    if (frei({ x, y, angle }) || frei({ ...vorher, x }) || frei({ ...vorher, y })) continue;
    Object.assign(body, vorher);   // würde in die Wicklung stoßen: stehen bleiben
  }
}

function stepNeedle(h) {
  const w0 = TWO_PI * METER.FREQ;
  const target = clamp(needleTarget(), -METER.STOP, METER.STOP);
  needle.vel += (w0 * w0 * (target - needle.pos) - 2 * METER.DAMPING * w0 * needle.vel) * h;
  needle.pos += needle.vel * h;
  if (Math.abs(needle.pos) > METER.STOP) {
    needle.pos = Math.sign(needle.pos) * METER.STOP;
    needle.vel = -0.3 * needle.vel;
  }
}

// Multimeter: alle INTERVAL Sekunden ein neuer Messwert
function stepMultimeter() {
  history.push({ t: clock.t, u: voltage });
  while (history.length > 1 && history[0].t < clock.t - MULTIMETER.AVERAGE) history.shift();
  if (clock.t < multimeter.next) return;
  multimeter.next = clock.t + MULTIMETER.INTERVAL;
  multimeter.reading = multiReading();
}

export function stepPhysics(dt) {
  if (dt <= 0) return;
  const SUBSTEPS = 8, h = dt / SUBSTEPS;
  for (let i = 0; i < SUBSTEPS; i++) stepBodies(h);
  // Fluss nur neu rechnen, wenn sich etwas geändert hat; bei zwei Magneten die Summe
  const posen = magnete().map(magnetPose), coil = coilPose();
  const key = [...posen.flatMap(p => [p.x, p.y, p.angle, p.north, p.B]), coil.x, coil.y, coil.angle, coil.loop, state.lineModel].join(' ');
  if (key !== fluxKey) {
    fluxKey = key;
    flux = posen.reduce((summe, pose) => summe + (state.lineModel ? fluxFromLines(pose, coil, state.strength) : fluxPerTurn(pose, coil)), 0);
  }
  const now = state.turns * flux;
  voltage = linkage === null ? 0 : (linkage - now) / dt;   // = −dΨ/dt (so geschrieben, damit in Ruhe 0 statt −0 steht)
  linkage = now;
  clock.t += dt;
  for (let i = 0; i < SUBSTEPS; i++) stepNeedle(h);
  stepMultimeter();
}
