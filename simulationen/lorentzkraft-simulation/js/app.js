"use strict";

// ---------------------------------------------------------------------------
// Physikalische Konstanten und Modellannahmen
// ---------------------------------------------------------------------------
const MASS = 1.67e-27; // kg (Protonenmasse)
const E = 1.602e-19; // C (Elementarladung)
const WORLD_WIDTH = 0.8; // m – Breite der Zeichenfläche (80 cm)
const GRID = 0.05; // m – Kästchengröße (5 cm)
const TIME_SCALE = 1e-6; // s Simulationszeit pro s Animation (Zeitlupe)
const B_MAX = 0.05; // T – Maximum des Schiebereglers
const MAX_TRAIL = 6000;

// Pfeillängen (px) bei Referenzwerten; Pfeile bleiben proportional zur Größe
const V_REF = 4e5;
const V_REF_PX = 60;
const F_REF = E * 4e5 * 0.025;
const F_REF_PX = 55;

// ---------------------------------------------------------------------------
// Zustand
// ---------------------------------------------------------------------------
const state = {
  B: 0.025, // T (Betrag)
  bOut: false, // false: ⊗ in die Ebene, true: ⊙ aus der Ebene
  charge: 1, // +1 oder −1 (in Einheiten von e)
  speed: 3e5, // m/s
  start: { x: 0.4, y: 0.25, angle: 0 },
  pos: { x: 0.4, y: 0.25 },
  vel: { x: 3e5, y: 0 },
  running: false,
  trail: [],
  tempo: 1,
  bounce: false, // true: Abprallen am Rand, false: Halt am Rand
  atEdge: false,
  show: { v: true, f: true, trail: true, circle: false },
};

// Weltkoordinaten: x nach rechts, y nach oben, Ursprung links unten (Meter)
const view = { w: 0, h: 0, dpr: 1, scale: 1, worldH: 0.5 };

const $ = (id) => document.getElementById(id);
const canvas = $("field");
const ctx = canvas.getContext("2d");

const ui = {
  bSlider: $("bSlider"),
  bOut: $("bOut"),
  bIn: $("bIn"),
  bOutOfPlane: $("bOutOfPlane"),
  chargePos: $("chargePos"),
  chargeNeg: $("chargeNeg"),
  vSlider: $("vSlider"),
  vOut: $("vOut"),
  angleSlider: $("angleSlider"),
  angleOut: $("angleOut"),
  playPause: $("playPause"),
  reset: $("reset"),
  home: $("home"),
  clearTrail: $("clearTrail"),
  bounce: $("bounce"),
  status: $("status"),
  tempo: $("tempo"),
  showV: $("showV"),
  showF: $("showF"),
  showTrail: $("showTrail"),
  showCircle: $("showCircle"),
  rQ: $("rQ"),
  rF: $("rF"),
  rR: $("rR"),
  rT: $("rT"),
  rSense: $("rSense"),
};

// ---------------------------------------------------------------------------
// Physik
// ---------------------------------------------------------------------------

// z-Komponente von B (z zeigt aus der Bildschirmebene heraus)
function bz() {
  return state.bOut ? state.B : -state.B;
}

// Winkelgeschwindigkeit der Kreisbewegung (gegen den Uhrzeigersinn positiv).
// Aus F = q·(v × B): a = (q·Bz/m)·(vy, −vx)  ⇒  ω = −q·Bz/m
function omega() {
  return (-state.charge * E * bz()) / MASS;
}

function lorentzForce() {
  const q = state.charge * E;
  const b = bz();
  return { x: q * state.vel.y * b, y: -q * state.vel.x * b };
}

// Exakter Schritt einer gleichförmigen Kreisbewegung
function step(dt) {
  const w = omega();
  const { x: vx, y: vy } = state.vel;

  if (Math.abs(w * dt) < 1e-9) {
    state.pos.x += vx * dt;
    state.pos.y += vy * dt;
    return;
  }

  const phi = w * dt;
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  state.pos.x += (vx * s - vy * (1 - c)) / w;
  state.pos.y += (vy * s + vx * (1 - c)) / w;
  state.vel.x = vx * c - vy * s;
  state.vel.y = vx * s + vy * c;
}

function velocityAngle() {
  const deg = (Math.atan2(state.vel.y, state.vel.x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

function setVelocityAngle(deg) {
  const a = (deg * Math.PI) / 180;
  state.vel.x = state.speed * Math.cos(a);
  state.vel.y = state.speed * Math.sin(a);
}

function setSpeed(speed) {
  const current = Math.hypot(state.vel.x, state.vel.y) || 1;
  state.speed = speed;
  state.vel.x *= speed / current;
  state.vel.y *= speed / current;
}

// ---------------------------------------------------------------------------
// Koordinaten
// ---------------------------------------------------------------------------
function toScreen(p) {
  return { x: p.x * view.scale, y: view.h - p.y * view.scale };
}

function toWorld(px, py) {
  return { x: px / view.scale, y: (view.h - py) / view.scale };
}

// Teilchen vollständig innerhalb der Zeichenfläche halten
function edgeMargin() {
  return particleRadius() / view.scale;
}

function clampToWorld(p) {
  const m = edgeMargin();
  p.x = Math.min(Math.max(p.x, m), WORLD_WIDTH - m);
  p.y = Math.min(Math.max(p.y, m), view.worldH - m);
}

function isOutside(p) {
  const m = edgeMargin();
  return p.x < m || p.y < m || p.x > WORLD_WIDTH - m || p.y > view.worldH - m;
}

// Teilchen genau dort anhalten, wo es den Rand berührt (Strecke prev → pos)
function stopAtEdge(prev) {
  const m = edgeMargin();
  const p = state.pos;
  const fraction = (a, b, limit) => (b === a ? 1 : (limit - a) / (b - a));
  let t = 1;
  if (p.x < m) t = Math.min(t, fraction(prev.x, p.x, m));
  if (p.x > WORLD_WIDTH - m) t = Math.min(t, fraction(prev.x, p.x, WORLD_WIDTH - m));
  if (p.y < m) t = Math.min(t, fraction(prev.y, p.y, m));
  if (p.y > view.worldH - m) t = Math.min(t, fraction(prev.y, p.y, view.worldH - m));
  t = Math.max(0, Math.min(1, t));
  state.pos = { x: prev.x + (p.x - prev.x) * t, y: prev.y + (p.y - prev.y) * t };
  clampToWorld(state.pos);
}

// Liegt das Teilchen am Rand und zeigt v nach außen?
function headingOutOfEdge() {
  const m = edgeMargin() + 1e-6;
  const { x, y } = state.pos;
  const v = state.vel;
  return (
    (x <= m && v.x < 0) ||
    (x >= WORLD_WIDTH - m && v.x > 0) ||
    (y <= m && v.y < 0) ||
    (y >= view.worldH - m && v.y > 0)
  );
}

// Optional: Am Rand wird das Teilchen wie an einer Bande reflektiert
function reflectAtEdges() {
  const m = edgeMargin();
  const maxX = WORLD_WIDTH - m;
  const maxY = view.worldH - m;
  const p = state.pos;
  const v = state.vel;

  if (p.x < m) {
    p.x = Math.min(2 * m - p.x, maxX);
    v.x = Math.abs(v.x);
  } else if (p.x > maxX) {
    p.x = Math.max(2 * maxX - p.x, m);
    v.x = -Math.abs(v.x);
  }
  if (p.y < m) {
    p.y = Math.min(2 * m - p.y, maxY);
    v.y = Math.abs(v.y);
  } else if (p.y > maxY) {
    p.y = Math.max(2 * maxY - p.y, m);
    v.y = -Math.abs(v.y);
  }
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  view.dpr = window.devicePixelRatio || 1;
  view.w = rect.width;
  view.h = rect.height;
  view.scale = view.w / WORLD_WIDTH;
  view.worldH = view.h / view.scale;
  canvas.width = Math.round(view.w * view.dpr);
  canvas.height = Math.round(view.h * view.dpr);
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);

  clampToWorld(state.start);
  clampToWorld(state.pos);
  draw();
}

// ---------------------------------------------------------------------------
// Zeichnen
// ---------------------------------------------------------------------------
function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

let colors = {};
function readColors() {
  colors = {
    grid: css("--grid"),
    field: css("--field-symbol"),
    pos: css("--positive"),
    neg: css("--negative"),
    v: css("--v-arrow"),
    f: css("--f-arrow"),
    trail: css("--trail"),
    prediction: css("--prediction"),
    text: css("--text"),
    muted: css("--muted"),
    canvas: css("--canvas"),
  };
}

// Pfeilgrößen an kleine Bildschirme anpassen
function pxFactor() {
  return Math.min(1, Math.max(0.6, view.w / 900));
}

function drawGrid() {
  const step = GRID * view.scale;
  ctx.strokeStyle = colors.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = step; x < view.w; x += step) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, view.h);
  }
  for (let y = view.h - step; y > 0; y -= step) {
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(view.w, Math.round(y) + 0.5);
  }
  ctx.stroke();
}

function drawFieldSymbols() {
  if (state.B <= 0) return;

  const strength = state.B / B_MAX;
  const step = GRID * view.scale;
  const r = Math.max(4, Math.min(9, step * 0.16));

  ctx.save();
  ctx.globalAlpha = 0.2 + 0.6 * strength;
  ctx.strokeStyle = colors.field;
  ctx.fillStyle = colors.field;
  ctx.lineWidth = 1 + 1.2 * strength;

  for (let x = step / 2; x < view.w; x += step) {
    for (let y = view.h - step / 2; y > 0; y -= step) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      if (state.bOut) {
        ctx.arc(x, y, r * 0.28, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const d = r * 0.7;
        ctx.moveTo(x - d, y - d);
        ctx.lineTo(x + d, y + d);
        ctx.moveTo(x + d, y - d);
        ctx.lineTo(x - d, y + d);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawTrail() {
  if (!state.show.trail || state.trail.length < 2) return;
  ctx.save();
  ctx.strokeStyle = colors.trail;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  state.trail.forEach((p, i) => {
    const s = toScreen(p);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  });
  ctx.stroke();
  ctx.restore();
}

function drawPrediction() {
  if (!state.show.circle) return;
  const p = toScreen(state.pos);

  ctx.save();
  ctx.strokeStyle = colors.prediction;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();

  const w = omega();
  if (w === 0) {
    // ohne Magnetfeld: geradlinige Bewegung
    const len = Math.hypot(view.w, view.h) * 2;
    const a = Math.atan2(state.vel.y, state.vel.x);
    ctx.moveTo(p.x - Math.cos(a) * len, p.y + Math.sin(a) * len);
    ctx.lineTo(p.x + Math.cos(a) * len, p.y - Math.sin(a) * len);
    ctx.stroke();
  } else {
    const r = radius();
    const F = lorentzForce();
    const Fn = Math.hypot(F.x, F.y);
    const center = toScreen({
      x: state.pos.x + (F.x / Fn) * r,
      y: state.pos.y + (F.y / Fn) * r,
    });
    ctx.arc(center.x, center.y, r * view.scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.fillStyle = colors.prediction;
    ctx.arc(center.x, center.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawArrow(from, dx, dy, color, label) {
  const len = Math.hypot(dx, dy);
  if (len < 1) return;

  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(14, len * 0.45);
  const tip = { x: from.x + dx, y: from.y + dy };

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(tip.x - ux * head * 0.8, tip.y - uy * head * 0.8);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x - ux * head - uy * head * 0.55, tip.y - uy * head + ux * head * 0.55);
  ctx.lineTo(tip.x - ux * head + uy * head * 0.55, tip.y - uy * head - ux * head * 0.55);
  ctx.closePath();
  ctx.fill();

  ctx.font = "italic 700 17px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 4;
  ctx.strokeStyle = colors.canvas;
  const lx = tip.x + ux * 14;
  const ly = tip.y + uy * 14;
  ctx.strokeText(label, lx, ly);
  ctx.fillText(label, lx, ly);
  ctx.restore();
}

function vArrowVector() {
  const len = (V_REF_PX * pxFactor() * state.speed) / V_REF;
  const a = Math.atan2(state.vel.y, state.vel.x);
  return { x: Math.cos(a) * len, y: -Math.sin(a) * len };
}

function particleRadius() {
  return 13;
}

function drawParticle() {
  const p = toScreen(state.pos);
  const r = particleRadius();
  const color = state.charge > 0 ? colors.pos : colors.neg;

  if (state.show.f) {
    const F = lorentzForce();
    const Fn = Math.hypot(F.x, F.y);
    if (Fn > 0) {
      const len = Math.min(170, (F_REF_PX * pxFactor() * Fn) / F_REF);
      drawArrow(
        { x: p.x + (F.x / Fn) * r, y: p.y - (F.y / Fn) * r },
        (F.x / Fn) * len,
        (-F.y / Fn) * len,
        colors.f,
        "F",
      );
    }
  }

  if (state.show.v) {
    const v = vArrowVector();
    const vn = Math.hypot(v.x, v.y);
    drawArrow(
      { x: p.x + (v.x / vn) * r, y: p.y + (v.y / vn) * r },
      v.x,
      v.y,
      colors.v,
      "v",
    );
  }

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = dragMode === "particle" ? 18 : 8;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(p.x - 6, p.y);
  ctx.lineTo(p.x + 6, p.y);
  if (state.charge > 0) {
    ctx.moveTo(p.x, p.y - 6);
    ctx.lineTo(p.x, p.y + 6);
  }
  ctx.stroke();
  ctx.restore();
}

function drawLegend() {
  const text =
    state.B > 0
      ? `B = ${formatNumber(state.B * 1000, 0)} mT ${state.bOut ? "⊙ aus der Ebene" : "⊗ in die Ebene"}`
      : "B = 0 (kein Magnetfeld)";

  ctx.save();
  ctx.font = "600 14px system-ui, sans-serif";
  const w = ctx.measureText(text).width + 20;
  ctx.fillStyle = colors.canvas;
  ctx.globalAlpha = 0.88;
  ctx.fillRect(10, 10, w, 30);
  ctx.globalAlpha = 1;
  ctx.fillStyle = colors.text;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 20, 25);

  // Maßstab
  const len = GRID * view.scale;
  const y = view.h - 18;
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = colors.canvas;
  ctx.fillRect(view.w - 30 - len, y - 30, len + 20, 42);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = colors.muted;
  ctx.fillStyle = colors.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(view.w - 20 - len, y);
  ctx.lineTo(view.w - 20, y);
  ctx.moveTo(view.w - 20 - len, y - 5);
  ctx.lineTo(view.w - 20 - len, y + 5);
  ctx.moveTo(view.w - 20, y - 5);
  ctx.lineTo(view.w - 20, y + 5);
  ctx.stroke();
  ctx.font = "13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("5 cm", view.w - 20 - len / 2, y - 12);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, view.w, view.h);
  drawGrid();
  drawFieldSymbols();
  drawPrediction();
  drawTrail();
  drawParticle();
  drawLegend();
}

// ---------------------------------------------------------------------------
// Anzeige der Größen
// ---------------------------------------------------------------------------
const SUPERSCRIPT = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };

function formatNumber(x, digits) {
  return x.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function sci(x, digits = 2) {
  if (x === 0) return "0";
  let exp = Math.floor(Math.log10(Math.abs(x)));
  let mant = x / 10 ** exp;
  if (Math.abs(Number(mant.toFixed(digits))) >= 10) {
    mant /= 10;
    exp += 1;
  }
  const sup = String(exp)
    .split("")
    .map((ch) => SUPERSCRIPT[ch])
    .join("");
  return `${formatNumber(mant, digits)} · 10${sup}`;
}

function radius() {
  return (MASS * state.speed) / (E * state.B);
}

function updateReadout() {
  ui.rQ.textContent = state.charge > 0 ? "+1,60 · 10⁻¹⁹ C" : "−1,60 · 10⁻¹⁹ C";

  if (state.B === 0) {
    ui.rF.textContent = "0 N";
    ui.rR.textContent = "∞ (geradlinige Bewegung)";
    ui.rT.textContent = "–";
    ui.rSense.textContent = "keine Ablenkung";
    return;
  }

  const r = radius();
  const T = (2 * Math.PI * MASS) / (E * state.B);
  ui.rF.textContent = `${sci(E * state.speed * state.B)} N`;
  ui.rR.textContent = r >= 1 ? `${formatNumber(r, 2)} m` : `${formatNumber(r * 100, 1)} cm`;
  ui.rT.textContent = `${formatNumber(T * 1e6, 2)} µs`;
  ui.rSense.textContent = omega() < 0 ? "im Uhrzeigersinn ↻" : "gegen den Uhrzeigersinn ↺";
}

function updateControls() {
  ui.bOut.textContent = `${formatNumber(state.B * 1000, 0)} mT`;
  ui.vOut.textContent = `${formatNumber(state.speed / 1e5, 1)} · 10⁵ m/s`;

  const angle = Math.round(velocityAngle()) % 360;
  ui.angleOut.textContent = `${angle}°`;
  if (document.activeElement !== ui.angleSlider) ui.angleSlider.value = angle;

  setToggle(ui.bIn, !state.bOut);
  setToggle(ui.bOutOfPlane, state.bOut);
  setToggle(ui.chargePos, state.charge > 0);
  setToggle(ui.chargeNeg, state.charge < 0);

  ui.playPause.textContent = state.running ? "⏸ Pause" : "▶ Start";

  setToggle(ui.bounce, state.bounce);
  ui.bounce.textContent = `Abprallen am Rand: ${state.bounce ? "AN" : "AUS"}`;

  ui.status.hidden = !state.atEdge;
  ui.status.textContent =
    "Das Teilchen hat den Rand erreicht – „Zurücksetzen“, „Startposition“ oder Teilchen verschieben.";

  updateReadout();
}

function setToggle(button, on) {
  button.classList.toggle("active", on);
  button.setAttribute("aria-pressed", String(on));
}

function refresh() {
  updateControls();
  if (!state.running) draw();
}

// ---------------------------------------------------------------------------
// Simulationsschleife
// ---------------------------------------------------------------------------
let lastTime = null;

function pushTrail() {
  const last = state.trail[state.trail.length - 1];
  if (!last || Math.hypot(last.x - state.pos.x, last.y - state.pos.y) * view.scale > 1.5) {
    state.trail.push({ x: state.pos.x, y: state.pos.y });
    if (state.trail.length > MAX_TRAIL) state.trail.shift();
  }
}

function frame(time) {
  if (!state.running) {
    lastTime = null;
    return;
  }

  if (lastTime !== null && dragMode !== "particle") {
    const realDt = Math.min(0.05, (time - lastTime) / 1000);
    const simDt = realDt * TIME_SCALE * state.tempo;
    // Unterschritte für eine glatte Spur bei kleinen Radien
    const n = Math.max(1, Math.ceil(Math.abs(omega() * simDt) / 0.05));
    for (let i = 0; i < n; i++) {
      const prev = { x: state.pos.x, y: state.pos.y };
      step(simDt / n);
      if (state.bounce) {
        reflectAtEdges();
      } else if (isOutside(state.pos)) {
        stopAtEdge(prev);
        pushTrail();
        state.running = false;
        state.atEdge = true;
        break;
      }
      pushTrail();
    }
    updateControls();
  }

  lastTime = time;
  draw();
  if (state.running) requestAnimationFrame(frame);
}

function start() {
  // Steht das Teilchen am Rand und zeigt nach außen, von vorn beginnen
  if (!state.bounce && headingOutOfEdge()) resetParticle();
  state.atEdge = false;
  if (state.trail.length === 0) pushTrail();
  state.running = true;
  lastTime = null;
  updateControls();
  requestAnimationFrame(frame);
}

function pause() {
  state.running = false;
  updateControls();
  draw();
}

function resetParticle() {
  state.pos = { x: state.start.x, y: state.start.y };
  setVelocityAngle(state.start.angle);
  state.trail = [];
  state.atEdge = false;
}

function homeStart() {
  return { x: WORLD_WIDTH / 2, y: view.worldH / 2, angle: 0 };
}

// ---------------------------------------------------------------------------
// Drag & Drop
// ---------------------------------------------------------------------------
let dragMode = null; // "particle" | "arrow" | null
let dragOffset = { x: 0, y: 0 };

function pointerPos(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function hitTest(pt) {
  const p = toScreen(state.pos);
  if (state.show.v) {
    const v = vArrowVector();
    const vn = Math.hypot(v.x, v.y);
    const r = particleRadius();
    const tip = { x: p.x + v.x + (v.x / vn) * r, y: p.y + v.y + (v.y / vn) * r };
    if (Math.hypot(pt.x - tip.x, pt.y - tip.y) < 18) return "arrow";
  }
  if (Math.hypot(pt.x - p.x, pt.y - p.y) < particleRadius() + 12) return "particle";
  return null;
}

canvas.addEventListener("pointerdown", (event) => {
  const pt = pointerPos(event);
  dragMode = hitTest(pt);
  if (!dragMode) return;

  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  const p = toScreen(state.pos);
  dragOffset = { x: p.x - pt.x, y: p.y - pt.y };
  canvas.style.cursor = "grabbing";
  if (dragMode === "particle") {
    state.trail = [];
    state.atEdge = false;
  }
  refresh();
});

canvas.addEventListener("pointermove", (event) => {
  const pt = pointerPos(event);

  if (!dragMode) {
    const hit = hitTest(pt);
    canvas.style.cursor = hit === "particle" ? "grab" : hit === "arrow" ? "pointer" : "default";
    return;
  }

  if (dragMode === "particle") {
    const w = toWorld(pt.x + dragOffset.x, pt.y + dragOffset.y);
    clampToWorld(w);
    state.pos = w;
    state.start.x = w.x;
    state.start.y = w.y;
    state.start.angle = velocityAngle();
    state.trail = [];
  } else {
    const p = toScreen(state.pos);
    const deg = (Math.atan2(-(pt.y - p.y), pt.x - p.x) * 180) / Math.PI;
    setVelocityAngle((deg + 360) % 360);
    state.start.angle = velocityAngle();
    if (!state.running) {
      state.start.x = state.pos.x;
      state.start.y = state.pos.y;
      state.trail = [];
    }
  }
  refresh();
});

function endDrag(event) {
  if (!dragMode) return;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  const wasParticle = dragMode === "particle";
  dragMode = null;
  canvas.style.cursor = "grab";
  if (wasParticle && state.running) {
    lastTime = null;
    pushTrail();
  }
  refresh();
}

canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

canvas.addEventListener("keydown", (event) => {
  const d = event.shiftKey ? GRID : GRID / 5;
  const moves = {
    ArrowLeft: [-d, 0],
    ArrowRight: [d, 0],
    ArrowUp: [0, d],
    ArrowDown: [0, -d],
  };

  if (event.key === " ") {
    event.preventDefault();
    state.running ? pause() : start();
    return;
  }
  if (!moves[event.key]) return;

  event.preventDefault();
  const [dx, dy] = moves[event.key];
  const w = { x: state.pos.x + dx, y: state.pos.y + dy };
  clampToWorld(w);
  state.pos = w;
  state.start = { x: w.x, y: w.y, angle: velocityAngle() };
  state.trail = state.running ? [{ ...w }] : [];
  state.atEdge = false;
  refresh();
});

// ---------------------------------------------------------------------------
// Bedienelemente
// ---------------------------------------------------------------------------
ui.bSlider.addEventListener("input", () => {
  state.B = Number(ui.bSlider.value) / 1000;
  refresh();
});

ui.bIn.addEventListener("click", () => {
  state.bOut = false;
  refresh();
});

ui.bOutOfPlane.addEventListener("click", () => {
  state.bOut = true;
  refresh();
});

ui.chargePos.addEventListener("click", () => {
  state.charge = 1;
  refresh();
});

ui.chargeNeg.addEventListener("click", () => {
  state.charge = -1;
  refresh();
});

ui.vSlider.addEventListener("input", () => {
  setSpeed(Number(ui.vSlider.value) * 1e5);
  refresh();
});

ui.angleSlider.addEventListener("input", () => {
  setVelocityAngle(Number(ui.angleSlider.value));
  state.start.angle = Number(ui.angleSlider.value);
  if (!state.running) {
    state.start.x = state.pos.x;
    state.start.y = state.pos.y;
    state.trail = [];
  }
  refresh();
});

ui.playPause.addEventListener("click", () => (state.running ? pause() : start()));

ui.reset.addEventListener("click", () => {
  state.running = false;
  resetParticle();
  refresh();
});

ui.home.addEventListener("click", () => {
  state.running = false;
  state.start = homeStart();
  resetParticle();
  refresh();
});

ui.bounce.addEventListener("click", () => {
  state.bounce = !state.bounce;
  refresh();
});

ui.clearTrail.addEventListener("click", () => {
  state.trail = [];
  if (state.running) pushTrail();
  refresh();
});

ui.tempo.addEventListener("change", () => {
  state.tempo = Number(ui.tempo.value);
});

[
  [ui.showV, "v"],
  [ui.showF, "f"],
  [ui.showTrail, "trail"],
  [ui.showCircle, "circle"],
].forEach(([input, key]) => {
  input.addEventListener("change", () => {
    state.show[key] = input.checked;
    refresh();
  });
});

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    readColors();
    draw();
  });

new ResizeObserver(resize).observe(canvas);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
readColors();
resize();
state.start = homeStart();
resetParticle();
refresh();
