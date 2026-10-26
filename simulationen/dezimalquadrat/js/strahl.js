// ------------------------------------------------------------------
// Zahlenstrahl von −3 bis 3 zum Einführen der Dezimalbrüche.
// Anfangs nur ganze Zahlen; per Knopf wird die Einteilung feiner (Zehntel, Hundertstel, Tausendstel),
// jede Stufe in ihrer Farbe. Zu enge Striche erscheinen erst beim Hineinzoomen. Nur ganze Zahlen sind
// beschriftet. Per Knopf erscheint die Zahl als dicke Strecke ab 0 auf der Achse: erst die Ganzen in ihrer
// Farbe, dann die Zehntel, Hundertstel, Tausendstel (1,529: bis 1, dann bis 1,5, bis 1,52, bis 1,529). Antippen markiert den nächsten Strich der feinsten sichtbaren Stufe (oder zoomt mit der Lupe).
// Bedienung: Mausrad / zwei Finger zoomen, Ziehen verschiebt. Welt-Koordinate x = Zahlwert.
// ------------------------------------------------------------------
import { alsText, ziffern, EINHEIT, MINUS } from './zahl.js';
import { state, FARBEN, STRAHL_BIS } from './state.js';

const MIN_PX = 7, VOLL_PX = 16;              // Strichabstand, ab dem eine Stufe erscheint bzw. voll da ist
const TIPP_PX = 12;                          // Strichabstand, ab dem man eine Stufe antippen kann
const STRICH = [40, 28, 19, 12];             // Strichlänge je Stufe (Pixel, nach oben und unten)
const LINIE = [3, 2.2, 1.6, 1.2];
const EINBLENDEN_S = 1.6;                    // Dauer des langsamen Einblendens (Sekunden)
const A = -STRAHL_BIS, B = STRAHL_BIS;       // Bereich des Zahlenstrahls

const cv = document.getElementById('strahl');
const ctx = cv.getContext('2d');
let W = 0, H = 0, dpr = 1;
const kamera = { s: 100, ox: 0 };            // Bildschirm-x = Zahl · s + ox
let animation = null, neuZeichnen = true, onAendern = () => {};
let einblendung = null;                      // { k, t0 }: Striche der Stufe k werden gerade eingeblendet
let tippStrecke = null;                      // angetippter Strich (Zehntausendstel): Strecke ab 0 dorthin, Zahl bleibt

// Höhe der Achse: unter Zahl und Stellenwerttafel (mit Platz für die Markierung), sonst etwa mittig
const obenLeiste = document.getElementById('obenLeiste');
function achseY() {
  if (obenLeiste.hidden) return H * 0.55;
  const unten = obenLeiste.offsetTop + obenLeiste.offsetHeight;
  return Math.max(H * 0.55, Math.min(H - 110, unten + 125));
}
const RAND = 50;

// ---------------- Kamera
function passend() {
  const s = (W - 2 * RAND) / (B - A);
  return { s, ox: RAND - A * s };
}
const sMin = () => passend().s * 0.8;
const sMax = () => W / 0.004;                // vier Tausendstel füllen das Bild
function begrenzen(k) {
  k.s = Math.min(sMax(), Math.max(sMin(), k.s));
  k.ox = Math.min(W - 40 - A * k.s, Math.max(40 - B * k.s, k.ox));
  return k;
}
function fahreZu(ziel, dauer = 0.45) {
  animation = { von: { ...kamera }, ziel: begrenzen(ziel), t0: performance.now(), dauer: dauer * 1000 };
  anfordern();
}
export function uebersicht(sofort = false) {
  if (sofort) { animation = null; Object.assign(kamera, passend()); anfordern(); } else fahreZu(passend());
}
export function zoom(f, px = W / 2, _py, weich = true) {
  const s = Math.min(sMax(), Math.max(sMin(), kamera.s * f));
  const wx = (px - kamera.ox) / kamera.s;
  const ziel = { s, ox: px - wx * s };
  if (weich) fahreZu(ziel, 0.3); else { Object.assign(kamera, begrenzen(ziel)); anfordern(); }
}
/** Bereich [a, b] des Zahlenstrahls ins Bild holen */
function zeige(a, b) {
  const s = W / ((b - a) * 1.4);
  fahreZu({ s, ox: W / 2 - (a + b) / 2 * s });
}

const abstandPx = k => 10 ** -k * kamera.s;
const deckkraft = k => (k === 0 ? 1 : Math.max(0, Math.min(1, (abstandPx(k) - MIN_PX) / (VOLL_PX - MIN_PX))));
/** Feinste eingestellte Stufe, deren Striche weit genug auseinander liegen, um sie anzutippen */
export function feinsteStufe() {
  let k = 0;
  for (let s = 1; s <= state.skala; s++) if (abstandPx(s) >= TIPP_PX) k = s;
  return k;
}
/** Ist die eingestellte Einteilung so fein, dass man erst hineinzoomen muss? */
export const zuEng = () => feinsteStufe() < state.skala;

/** Einteilung um eine Stufe feiner (+1) oder gröber (−1) */
export function verfeinern(schritt) {
  const k = Math.max(0, Math.min(3, state.skala + schritt));
  if (k === state.skala) return;
  state.skala = k;
  einblendung = schritt > 0 ? { k, t0: performance.now() } : null;   // neue Striche wachsen langsam heraus
  anfordern();
}

// ---------------- Zeichnen
function groesse() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = cv.clientWidth; H = cv.clientHeight;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
}

function zeichnen(now) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (W === 0) return;
  const y0 = achseY(), S = kamera.s, X = v => kamera.ox + v * S;
  const v0 = Math.max(A, -kamera.ox / S), v1 = Math.min(B, (W - kamera.ox) / S);

  // Achse mit Pfeilspitze rechts
  ctx.strokeStyle = '#1d2733'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(Math.max(-5, X(A) - 20), y0); ctx.lineTo(Math.min(W + 5, X(B) + 30), y0); ctx.stroke();
  if (X(B) + 30 < W) {
    ctx.fillStyle = '#1d2733';
    ctx.beginPath(); ctx.moveTo(X(B) + 42, y0); ctx.lineTo(X(B) + 28, y0 - 7); ctx.lineTo(X(B) + 28, y0 + 7); ctx.fill();
  }

  // Strecke ab 0: zum angetippten Strich, sonst (per Knopf) zur eingegebenen Zahl
  if (tippStrecke !== null) strecke(X, y0, tippStrecke);
  else if (state.zeigeStrecke && !state.verdeckt) strecke(X, y0, state.n);

  // Langsames Einblenden: Anteil 0 … 1 für die neue Stufe
  let p = 1;
  if (einblendung) {
    p = Math.min(1, (now - einblendung.t0) / (EINBLENDEN_S * 1000));
    if (p >= 1) einblendung = null; else anfordern();
  }

  // Striche: von fein nach grob; jede Stufe nur, wo es nicht schon einen gröberen Strich gibt
  for (let k = state.skala; k >= 0; k--) {
    const neu = einblendung && einblendung.k === k ? p * p * (3 - 2 * p) : 1;
    const a = deckkraft(k) * neu;
    if (a <= 0) continue;
    const d = 10 ** -k, laenge = STRICH[k] * neu;
    ctx.globalAlpha = a;
    ctx.strokeStyle = k === 0 ? '#1d2733' : FARBEN[k].schrift;
    ctx.lineWidth = LINIE[k];
    ctx.beginPath();
    const i0 = Math.ceil(v0 / d - 1e-9), i1 = Math.floor(v1 / d + 1e-9);
    for (let i = i0; i <= i1; i++) {
      if (k > 0 && i % 10 === 0) continue;   // dort steht ein gröberer Strich
      const x = X(i * d);
      ctx.moveTo(x, y0 - laenge); ctx.lineTo(x, y0 + laenge);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Beschriftung: nur die ganzen Zahlen
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillStyle = '#1d2733';
  for (let i = Math.ceil(v0 - 1e-9); i <= Math.floor(v1 + 1e-9); i++) {
    ctx.fillText(alsText(i * EINHEIT), X(i), y0 + STRICH[0] + 6);
  }

  // Markierung der Zahl: Dreieck, Linie durch die Achse, Punkt und Zahl (als Bruch eingegeben: Bruch = Dezimalzahl)
  const xm = X(state.n / EINHEIT), oben = y0 - STRICH[0] - 14;
  if (!state.verdeckt && xm > -20 && xm < W + 20) {
    ctx.fillStyle = ctx.strokeStyle = '#c62828';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(xm, oben); ctx.lineTo(xm, y0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xm, oben); ctx.lineTo(xm - 10, oben - 16); ctx.lineTo(xm + 10, oben - 16); ctx.fill();
    ctx.beginPath(); ctx.arc(xm, y0, 6, 0, 2 * Math.PI); ctx.fill();
    if (state.bruch) bruchBeschriftung(xm, oben - 20);
    else {
      ctx.font = '700 24px system-ui, sans-serif'; ctx.textBaseline = 'bottom';
      ctx.fillText(alsText(state.n), xm, oben - 20);
    }
  }

  if (kamera.s > passend().s * 1.6) uebersichtskarte(v0, v1);
}

// Beschriftung „3/4 = 0,75“ mit Bruchstrich, mittig über x, Unterkante bei y
function bruchBeschriftung(x, y) {
  const b = state.bruch, gross = '700 24px system-ui, sans-serif', klein = '700 20px system-ui, sans-serif';
  const vor = (b.negativ ? MINUS : '') + (b.ganze ? b.ganze + ' ' : ''), nach = ' = ' + alsText(state.n);
  ctx.font = gross;
  const wVor = ctx.measureText(vor).width, wNach = ctx.measureText(nach).width;
  ctx.font = klein;
  const wBruch = Math.max(ctx.measureText(String(b.zaehler)).width, ctx.measureText(String(b.nenner)).width) + 6;
  let x0 = x - (wVor + wBruch + wNach) / 2;
  const mitte = y - 24;                      // Höhe des Bruchstrichs
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = gross;
  ctx.fillText(vor, x0, mitte); x0 += wVor;
  ctx.font = klein; ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom'; ctx.fillText(String(b.zaehler), x0 + wBruch / 2, mitte - 2);
  ctx.textBaseline = 'top'; ctx.fillText(String(b.nenner), x0 + wBruch / 2, mitte + 3);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, mitte); ctx.lineTo(x0 + wBruch, mitte); ctx.stroke();
  x0 += wBruch;
  ctx.font = gross; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(nach, x0, mitte);
  ctx.textAlign = 'center';
}

// Zahl als dicke Strecke ab 0 entlang der Achse, je Stelle in ihrer Farbe (negative Zahlen nach links)
function strecke(X, y0, n) {
  const { ganze, nach, negativ } = ziffern(n);
  const r = negativ ? -1 : 1;
  ctx.lineWidth = 10; ctx.lineCap = 'butt';
  let start = 0;
  [ganze, ...nach].forEach((d, k) => {
    if (d === 0) return;
    const ende = start + r * d * 10 ** -k;
    ctx.strokeStyle = FARBEN[k].schrift;
    ctx.beginPath(); ctx.moveTo(X(start), y0); ctx.lineTo(X(ende), y0); ctx.stroke();
    // kleine Lücke zwischen den einzelnen Teilen dieser Stelle (wenn sie groß genug sind)
    const schritt = 10 ** -k * Math.abs(X(1) - X(0));
    if (schritt >= 10 && d > 1) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 1; i < d; i++) { const x = X(start + r * i * 10 ** -k); ctx.moveTo(x, y0 - 5); ctx.lineTo(x, y0 + 5); }
      ctx.stroke();
      ctx.lineWidth = 10;
    }
    start = ende;
  });
}

// Kleine Übersicht unten links: ganzer Zahlenstrahl, Rahmen um den sichtbaren Ausschnitt
function uebersichtskarte(v0, v1) {
  const b = 180, x0 = 18, y0 = H - 34, m = b / (B - A), X = v => x0 + (v - A) * m;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.fillRect(x0 - 8, y0 - 18, b + 16, 32);
  ctx.strokeStyle = '#1d2733'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + b, y0);
  for (let i = A; i <= B; i++) { ctx.moveTo(X(i), y0 - 6); ctx.lineTo(X(i), y0 + 6); }
  ctx.stroke();
  ctx.fillStyle = '#c62828';
  if (!state.verdeckt) { ctx.beginPath(); ctx.arc(X(state.n / EINHEIT), y0, 3.5, 0, 2 * Math.PI); ctx.fill(); }
  ctx.strokeStyle = '#d32f2f'; ctx.lineWidth = 2;
  ctx.strokeRect(X(v0), y0 - 14, Math.max(3, (v1 - v0) * m), 24);
}

function anfordern() { neuZeichnen = true; }
export const neuZeichnenAnfordern = anfordern;

function schleife(now) {
  if (animation) {
    const t = Math.min(1, (now - animation.t0) / animation.dauer), e = t * t * (3 - 2 * t);
    const { von, ziel } = animation;
    const s = Math.exp(Math.log(von.s) + (Math.log(ziel.s) - Math.log(von.s)) * e);
    const c0 = (W / 2 - von.ox) / von.s, c1 = (W / 2 - ziel.ox) / ziel.s;
    Object.assign(kamera, { s, ox: W / 2 - (c0 + (c1 - c0) * e) * s });
    if (t >= 1) animation = null;
    neuZeichnen = true;
  }
  if (neuZeichnen && W > 0) { neuZeichnen = false; zeichnen(now); onAendern(); }
  requestAnimationFrame(schleife);
}

// ---------------- Bedienung
const zeiger = new Map();
let ziehen = null, pinch = null;

function antippen(px) {
  const v = (px - kamera.ox) / kamera.s;
  if (v < A - 0.1 || v > B + 0.1) return;
  if (state.lupe) {
    // auf das angetippte Teil der nächstgröberen Stufe zoomen, sodass die eingestellte Einteilung sichtbar wird
    if (!zuEng()) uebersicht();
    else { const d = 10 ** -(state.skala - 1), a = Math.floor(v / d) * d; zeige(a, a + d); }
    return;
  }
  const d = 10 ** -feinsteStufe();
  const n = Math.round(Math.round(v / d) * d * EINHEIT);
  if (state.antippen) { state.setze(n); return; }   // per Knopf: Antippen markiert die Zahl
  // sonst: nur eine Strecke ab 0 bis zum angetippten Strich (nochmal antippen: weg); die Zahl bleibt
  tippStrecke = n === tippStrecke ? null : Math.max(A * EINHEIT, Math.min(B * EINHEIT, n));
  anfordern();
}

// Zwei-Finger-Zoom: Abstand der Finger (in jeder Richtung) bestimmt die Vergrößerung, die Stelle zwischen
// ihnen bleibt unter den Fingern
function pinchStart(a, b) {
  pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: kamera.s, mx: (a.x + b.x) / 2, ox: kamera.ox };
}
function pinchBewegen(a, b) {
  const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2;
  const s = Math.min(sMax(), Math.max(sMin(), pinch.s * d / pinch.d));
  const wx = (pinch.mx - pinch.ox) / pinch.s;
  Object.assign(kamera, begrenzen({ s, ox: mx - wx * s }));
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
  if (zeiger.size === 1) ziehen = { x: e.offsetX, ox: kamera.ox, bewegt: false };
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
    const dx = e.offsetX - ziehen.x;
    if (Math.abs(dx) > 6) ziehen.bewegt = true;
    if (ziehen.bewegt) { Object.assign(kamera, begrenzen({ s: kamera.s, ox: ziehen.ox + dx })); anfordern(); }
  }
});
function loslassen(e) {
  if (!zeiger.has(e.pointerId)) return;
  if (ziehen && !ziehen.bewegt && zeiger.size === 1) antippen(e.offsetX);
  zeiger.delete(e.pointerId);
  if (zeiger.size < 2 && !TOUCH) pinch = null;     // Touch: endet über touchend
  if (zeiger.size === 0) ziehen = null;
  else if (zeiger.size === 1) { const [p] = [...zeiger.values()]; ziehen = { x: p.x, ox: kamera.ox, bewegt: true }; }
}
cv.addEventListener('pointerup', loslassen);
cv.addEventListener('pointercancel', e => { zeiger.delete(e.pointerId); ziehen = null; if (!TOUCH) pinch = null; });
cv.addEventListener('wheel', e => {
  e.preventDefault();
  zoom(Math.exp(-(e.deltaY || e.deltaX) * 0.0015), e.offsetX, 0, false);
}, { passive: false });

export function initStrahl(beiAenderung) {
  onAendern = beiAenderung;
  state.beiAenderung(() => { tippStrecke = null; });   // neue Zahl: angetippte Strecke weg
  groesse();
  new ResizeObserver(() => { groesse(); if (W > 0) uebersicht(true); }).observe(cv);
  new ResizeObserver(anfordern).observe(obenLeiste);
  requestAnimationFrame(schleife);
}
