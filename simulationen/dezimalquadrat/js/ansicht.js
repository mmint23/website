// ------------------------------------------------------------------
// Zeichenfläche: Quadrate, gefärbte Teile, Einteilung je nach Zoom, Übersichtskarte.
// Bedienung: Mausrad / zwei Finger zoomen, Ziehen verschiebt, Antippen färbt (oder zoomt mit der Lupe).
// Welt-Koordinaten: Quadrat q liegt bei x = q · (1 + ABSTAND) … + 1, y = 0 … 1 (y nach unten).
// ------------------------------------------------------------------
import { flaechen, teilGroesse, zahlBeiPunkt, EINHEIT } from './zahl.js';
import { state, FARBEN } from './state.js';

export const ABSTAND = 0.15;                 // Lücke zwischen den Quadraten
const MIN_PX = 14;                           // ab dieser Teilgröße (kürzere Seite, Pixel) wird eine Stufe gezeichnet
const VOLL_PX = 24;                          // ab hier voll deckend
const TIPP_PX = 18;                          // so groß (kürzere Seite) muss ein Teil sein, um es anzutippen

const cv = document.getElementById('flaeche');
const ctx = cv.getContext('2d');
let W = 0, H = 0, dpr = 1;
const kamera = { s: 100, ox: 0, oy: 0 };     // Bildschirm = Welt · s + o
let animation = null;
let neuZeichnen = true;
let onAendern = () => {};

const breiteInhalt = () => state.quadrate + (state.quadrate - 1) * ABSTAND;
const quadratX = q => q * (1 + ABSTAND);

// ---------------- Kamera
// Platz oben für Titel und Zoomleiste, unten für Beschriftung und Hinweis
const RAND = { seite: 24, oben: 88, unten: 100 };
function passend() {
  const s = Math.min((W - 2 * RAND.seite) / breiteInhalt(), H - RAND.oben - RAND.unten);
  return { s, ox: (W - breiteInhalt() * s) / 2, oy: RAND.oben + (H - RAND.oben - RAND.unten - s) / 2 };
}
const sMin = () => passend().s * 0.6;
const sMax = () => Math.min(W, H) / 0.12;    // ein Hundertstel füllt fast das Bild

function begrenzen(k) {
  k.s = Math.min(sMax(), Math.max(sMin(), k.s));
  // nicht ganz aus dem Bild schieben
  const b = breiteInhalt() * k.s, h = k.s;
  k.ox = Math.min(W - 40, Math.max(40 - b, k.ox));
  k.oy = Math.min(H - 40, Math.max(40 - h, k.oy));
  return k;
}

/** Kamera weich zu einem Ziel bewegen */
function fahreZu(ziel, dauer = 0.45) {
  const von = { ...kamera };
  begrenzen(ziel);
  animation = { von, ziel, t0: performance.now(), dauer: dauer * 1000 };
  anfordern();
}

export function uebersicht(sofort = false) {
  const z = passend();
  if (sofort) { animation = null; Object.assign(kamera, z); anfordern(); } else fahreZu(z);
}

/** Um den Faktor f zoomen, Bildpunkt (px, py) bleibt fest */
export function zoom(f, px = W / 2, py = H / 2, weich = true) {
  const s = Math.min(sMax(), Math.max(sMin(), kamera.s * f));
  const wx = (px - kamera.ox) / kamera.s, wy = (py - kamera.oy) / kamera.s;
  const ziel = { s, ox: px - wx * s, oy: py - wy * s };
  if (weich) fahreZu(ziel, 0.3);
  else { Object.assign(kamera, begrenzen(ziel)); anfordern(); }
}

/** Auf ein Rechteck in Welt-Koordinaten zoomen */
function zeige(x, y, w, h) {
  const s = Math.min(W / (w * 1.6), H / (h * 1.6));
  fahreZu({ s, ox: W / 2 - (x + w / 2) * s, oy: H / 2 - (y + h / 2) * s });
}

// ---------------- Welche Stufen sind sichtbar?
/** Deckkraft der Einteilung mit Abstand d (Welt) bei der aktuellen Vergrößerung */
const deckkraft = d => Math.max(0, Math.min(1, (d * kamera.s - MIN_PX) / (VOLL_PX - MIN_PX)));
/** Feinste Stufe, deren Teile groß genug zum Antippen sind (mindestens Zehntel) */
export function feinsteStufe() {
  let k = 1;
  for (let s = 2; s <= 4; s++) {
    const { w, h } = teilGroesse(s, state.einteilung);
    if (Math.min(w, h) * kamera.s >= TIPP_PX) k = s;
  }
  return k;
}

// ---------------- Zeichnen
function groesse() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = cv.clientWidth; H = cv.clientHeight;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
}

function zeichnen() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  // sichtbarer Bereich in Welt-Koordinaten
  const sx0 = -kamera.ox / kamera.s, sx1 = (W - kamera.ox) / kamera.s;
  const sy0 = -kamera.oy / kamera.s, sy1 = (H - kamera.oy) / kamera.s;
  const S = kamera.s;
  const X = x => kamera.ox + x * S, Y = y => kamera.oy + y * S;

  // Quadrate (weiß) und gefärbte Teile
  for (let q = 0; q < state.quadrate; q++) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(X(quadratX(q)), Y(0), S, S);
  }
  for (const r of flaechen(state.n, state.einteilung)) {
    const x = quadratX(r.quadrat) + r.x;
    if (x > sx1 || x + r.w < sx0 || r.y > sy1 || r.y + r.h < sy0) continue;
    ctx.fillStyle = FARBEN[r.stufe].flaeche;
    // leicht überlappen, damit keine hellen Haarlinien zwischen den Teilen entstehen
    ctx.fillRect(X(x) - 0.3, Y(r.y) - 0.3, r.w * S + 0.6, r.h * S + 0.6);
  }

  // Einteilung: Stufe 1 und 3 senkrecht (Streifen), Stufe 2 und 4 waagrecht (Quadrate)
  for (let q = 0; q < state.quadrate; q++) {
    const qx = quadratX(q);
    if (qx > sx1 || qx + 1 < sx0) continue;
    const a0 = Math.max(0, sx0 - qx), a1 = Math.min(1, sx1 - qx);       // sichtbarer Teil (x)
    const b0 = Math.max(0, sy0), b1 = Math.min(1, sy1);                 // (y)
    // Jede Stufe teilt alle Teile gleich: senkrechte Linien im Abstand der Teilbreite,
    // waagrechte im Abstand der Teilhöhe. Von fein nach grob, damit die groben Linien oben liegen.
    for (const k of [4, 3, 2, 1]) {
      const { w, h } = teilGroesse(k, state.einteilung);
      ctx.strokeStyle = FARBEN[k].schrift;       // Linien in der Farbe der Stufe (wie in der Stellenwerttafel)
      // Streifen: dickere Linien, damit die Streifen deutlich hervortreten
      ctx.lineWidth = (state.einteilung === 'streifen'
        ? { 1: 3.6, 2: 1.6, 3: 2.4, 4: 1.0 }
        : { 1: 2.4, 2: 1.1, 3: 1.6, 4: 0.7 })[k];
      const alpha = deckkraft(Math.min(w, h));   // eine Stufe erscheint als Ganzes, wenn ihre Teile groß genug sind
      for (const [d, senkrecht] of [[w, true], [h, false]]) {
        if (alpha <= 0 || d >= 1) continue;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        if (senkrecht) {
          for (let i = Math.ceil(a0 / d - 1e-9); i * d <= a1 + 1e-9; i++) {
            const x = X(qx + i * d);
            ctx.moveTo(x, Y(b0)); ctx.lineTo(x, Y(b1));
          }
        } else {
          for (let i = Math.ceil(b0 / d - 1e-9); i * d <= b1 + 1e-9; i++) {
            const y = Y(i * d);
            ctx.moveTo(X(qx + a0), y); ctx.lineTo(X(qx + a1), y);
          }
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = FARBEN[0].schrift;         // Rand des Quadrats in der Farbe der Ganzen
    ctx.lineWidth = state.einteilung === 'streifen' ? 4 : 3;
    ctx.strokeRect(X(qx), Y(0), S, S);
    // Beschriftung unter dem Quadrat
    if (S > 60) {
      ctx.fillStyle = '#4a5866';
      ctx.font = `600 ${Math.min(20, S * 0.06)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(state.quadrate > 1 ? `${q + 1}. Ganzes` : '1 Ganzes', X(qx + 0.5), Y(1) + 8);
    }
  }
  if (kamera.s > passend().s * 1.6) uebersichtskarte(sx0, sy0, sx1, sy1);
}

// Kleine Übersicht unten links: alle Quadrate, Rahmen um den sichtbaren Ausschnitt
function uebersichtskarte(sx0, sy0, sx1, sy1) {
  const m = 46 / 1, b = breiteInhalt() * m, x0 = 12, y0 = H - m - 12;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillRect(x0 - 6, y0 - 6, b + 12, m + 12);
  for (let q = 0; q < state.quadrate; q++) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x0 + quadratX(q) * m, y0, m, m);
  }
  for (const r of flaechen(state.n, state.einteilung)) {
    if (r.stufe > 2) continue;
    ctx.fillStyle = FARBEN[r.stufe].flaeche;
    ctx.fillRect(x0 + (quadratX(r.quadrat) + r.x) * m, y0 + r.y * m, r.w * m, r.h * m);
  }
  ctx.strokeStyle = '#1d2733'; ctx.lineWidth = 1;
  for (let q = 0; q < state.quadrate; q++) ctx.strokeRect(x0 + quadratX(q) * m, y0, m, m);
  ctx.strokeStyle = '#d32f2f'; ctx.lineWidth = 2;
  const rx = Math.max(sx0, -0.1), ry = Math.max(sy0, -0.1);
  ctx.strokeRect(x0 + rx * m, y0 + ry * m, Math.max(2, (Math.min(sx1, breiteInhalt() + 0.1) - rx) * m),
    Math.max(2, (Math.min(sy1, 1.1) - ry) * m));
}

function anfordern() { neuZeichnen = true; }
export const neuZeichnenAnfordern = anfordern;

function schleife(now) {
  if (animation) {
    const t = Math.min(1, (now - animation.t0) / animation.dauer);
    const e = t * t * (3 - 2 * t);
    const { von, ziel } = animation;
    // Vergrößerung logarithmisch, damit der Zoom gleichmäßig wirkt
    const s = Math.exp(Math.log(von.s) + (Math.log(ziel.s) - Math.log(von.s)) * e);
    // Mittelpunkt des Bildes gleichmäßig bewegen
    const c0 = [(W / 2 - von.ox) / von.s, (H / 2 - von.oy) / von.s];
    const c1 = [(W / 2 - ziel.ox) / ziel.s, (H / 2 - ziel.oy) / ziel.s];
    const c = [c0[0] + (c1[0] - c0[0]) * e, c0[1] + (c1[1] - c0[1]) * e];
    Object.assign(kamera, { s, ox: W / 2 - c[0] * s, oy: H / 2 - c[1] * s });
    if (t >= 1) animation = null;
    neuZeichnen = true;
  }
  if (neuZeichnen && W > 0) {                    // ausgeblendet (Zahlenstrahl aktiv): nicht zeichnen
    neuZeichnen = false;
    zeichnen();
    onAendern();
  }
  requestAnimationFrame(schleife);
}

// ---------------- Bedienung: Zeiger (Maus, Finger, Stift)
const zeiger = new Map();
let ziehen = null, pinch = null;

function weltPunkt(px, py) {
  return { x: (px - kamera.ox) / kamera.s, y: (py - kamera.oy) / kamera.s };
}

/** Antippen: färben bzw. mit der Lupe hineinzoomen */
function antippen(px, py) {
  const { x, y } = weltPunkt(px, py);
  const q = Math.floor(x / (1 + ABSTAND));
  const lx = x - quadratX(q);
  if (q < 0 || q >= state.quadrate || lx < 0 || lx > 1 || y < 0 || y > 1) return;
  if (state.lupe) {
    // auf das angetippte Hundertstel zoomen (oder, wenn schon nah, auf das Zehntel zurück)
    if (feinsteStufe() === 4) uebersicht();
    else zeige(quadratX(q) + Math.floor(lx * 10) / 10, Math.floor(y * 10) / 10, 0.1, 0.1);
    return;
  }
  state.setze(zahlBeiPunkt(q, lx, y, feinsteStufe(), state.n, state.einteilung));
}

// Zwei-Finger-Zoom: Abstand der Finger bestimmt die Vergrößerung, der Punkt zwischen ihnen bleibt unter den Fingern
function pinchStart(a, b) {
  pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: kamera.s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, ox: kamera.ox, oy: kamera.oy };
}
function pinchBewegen(a, b) {
  const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const s = Math.min(sMax(), Math.max(sMin(), pinch.s * d / pinch.d));
  const wx = (pinch.mx - pinch.ox) / pinch.s, wy = (pinch.my - pinch.oy) / pinch.s;
  Object.assign(kamera, begrenzen({ s, ox: mx - wx * s, oy: my - wy * s }));
  anfordern();
}

// Zwei-Finger-Zoom auf Touch-Geräten über Touch-Events: In Safari (iPad) zuverlässiger als Pointer-Events,
// und preventDefault verhindert, dass stattdessen die ganze Seite zoomt. Ohne Touch (Maus): über Pointer-Events.
const TOUCH = 'ontouchstart' in window;
const touchPunkte = e => {
  const r = cv.getBoundingClientRect();
  return [...e.touches].slice(0, 2).map(t => ({ x: t.clientX - r.left, y: t.clientY - r.top }));
};
cv.addEventListener('touchstart', e => {
  if (e.touches.length < 2) return;
  e.preventDefault();
  animation = null; ziehen = null;
  pinchStart(...touchPunkte(e));
}, { passive: false });
cv.addEventListener('touchmove', e => {
  e.preventDefault();
  if (pinch && e.touches.length >= 2) pinchBewegen(...touchPunkte(e));
}, { passive: false });
cv.addEventListener('touchend', e => { if (e.touches.length < 2) pinch = null; });
cv.addEventListener('touchcancel', () => { pinch = null; });

cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  zeiger.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  animation = null;
  if (zeiger.size === 1) ziehen = { x: e.offsetX, y: e.offsetY, ox: kamera.ox, oy: kamera.oy, bewegt: false };
  if (zeiger.size === 2) {
    if (!TOUCH) pinchStart(...zeiger.values());
    ziehen = null;
  }
});
cv.addEventListener('pointermove', e => {
  if (!zeiger.has(e.pointerId)) return;
  zeiger.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  if (zeiger.size >= 2) {
    if (pinch && !TOUCH) pinchBewegen(...zeiger.values());
  } else if (ziehen) {
    const dx = e.offsetX - ziehen.x, dy = e.offsetY - ziehen.y;
    if (Math.hypot(dx, dy) > 6) ziehen.bewegt = true;
    if (ziehen.bewegt) {
      Object.assign(kamera, begrenzen({ s: kamera.s, ox: ziehen.ox + dx, oy: ziehen.oy + dy }));
      anfordern();
    }
  }
});
function loslassen(e) {
  if (!zeiger.has(e.pointerId)) return;
  if (ziehen && !ziehen.bewegt && zeiger.size === 1) antippen(e.offsetX, e.offsetY);
  zeiger.delete(e.pointerId);
  if (zeiger.size < 2 && !TOUCH) pinch = null;     // Touch: endet über touchend
  if (zeiger.size === 0) ziehen = null;
  else if (zeiger.size === 1) {                  // nach dem Zoomen mit zwei Fingern: weiter verschieben
    const [p] = [...zeiger.values()];
    ziehen = { x: p.x, y: p.y, ox: kamera.ox, oy: kamera.oy, bewegt: true };
  }
}
cv.addEventListener('pointerup', loslassen);
cv.addEventListener('pointercancel', e => { zeiger.delete(e.pointerId); ziehen = null; if (!TOUCH) pinch = null; });
cv.addEventListener('wheel', e => {
  e.preventDefault();
  zoom(Math.exp(-e.deltaY * 0.0015), e.offsetX, e.offsetY, false);
}, { passive: false });

// ---------------- Start
export function initAnsicht(beiAenderung) {
  onAendern = beiAenderung;
  groesse();
  uebersicht(true);
  new ResizeObserver(() => { groesse(); if (W > 0) uebersicht(true); }).observe(cv);
  requestAnimationFrame(schleife);
}
